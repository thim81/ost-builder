import { getSessionUser } from '../../../_auth';
import { jsonResponse, methodNotAllowed, optionsResponse, safeJson } from '../../../_http';
import { checkRateLimit } from '../../../_rateLimit';
import {
  DEFAULT_TTL_DAYS,
  ensureShareTable,
  generateUniqueShareId,
  insertShareRow,
  isVisibility,
  nextExpiryFromNow,
  normalizeTtlDays,
  putSharePayload,
  statusFromShare,
  validateMarkdown,
} from '../../../_storedShare';
import {
  assertAuthEnv,
  assertStorageEnv,
  isStoredShareEnabled,
  type FunctionContext,
} from '../../../_env';
import type { ShareSettings } from '@ost-builder/shared';

type CreateShareBody = {
  markdown?: string;
  name?: string;
  visibility?: 'public' | 'private';
  ttlDays?: number;
  settings?: ShareSettings;
  collapsedIds?: string[];
};

export async function onRequest(context: FunctionContext): Promise<Response> {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return optionsResponse(request);
  }

  if (!isStoredShareEnabled(env)) {
    return jsonResponse(request, { error: 'Stored share feature is disabled' }, 404);
  }

  try {
    assertAuthEnv(env);
    assertStorageEnv(env);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Environment misconfigured';
    return jsonResponse(request, { error: message }, 500);
  }

  await ensureShareTable(env);

  if (request.method === 'POST') {
    const user = await getSessionUser(request, env.AUTH_SESSION_SECRET);
    if (!user) {
      return jsonResponse(request, { error: 'AUTH_REQUIRED' }, 401);
    }

    const userRate = await checkRateLimit(env, `create:user:${user.sub}`, 60, 60);
    if (!userRate.ok) {
      return jsonResponse(request, { error: 'Rate limit exceeded' }, 429);
    }

    const body = await safeJson<CreateShareBody>(request);
    const markdown = body?.markdown || '';
    const markdownError = validateMarkdown(markdown);
    if (markdownError) {
      return jsonResponse(request, { error: markdownError }, 400);
    }

    const visibility = body?.visibility;
    if (!isVisibility(visibility)) {
      return jsonResponse(request, { error: 'Invalid visibility value' }, 400);
    }

    const ttlDays = normalizeTtlDays(body?.ttlDays ?? DEFAULT_TTL_DAYS);
    if (!ttlDays) {
      return jsonResponse(request, { error: 'Invalid ttlDays; expected one of 1, 7, 30, 90' }, 400);
    }

    const now = Date.now();
    const id = await generateUniqueShareId(env);
    const expiresAt = nextExpiryFromNow(ttlDays);
    const payload = {
      markdown,
      name: body?.name || undefined,
      settings: body?.settings,
      collapsedIds: Array.isArray(body?.collapsedIds) ? body.collapsedIds : [],
      revision: 1,
      updatedAt: now,
    };

    const kvKey = await putSharePayload(env, id, payload, expiresAt);

    await insertShareRow(env, {
      id,
      ownerSub: user.sub,
      provider: user.provider,
      name: body?.name || undefined,
      visibility,
      kvKey,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });

    const origin = new URL(request.url).origin;
    return jsonResponse(request, {
      id,
      link: `${origin}/s/${id}`,
      expiresAt,
      visibility,
      status: 'active',
    });
  }

  if (request.method === 'GET') {
    const user = await getSessionUser(request, env.AUTH_SESSION_SECRET);
    if (!user) {
      return jsonResponse(request, { error: 'AUTH_REQUIRED' }, 401);
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '20');

    const limit = Math.max(1, Math.min(pageSize, 100));
    const offset = Math.max(0, (Math.max(page, 1) - 1) * limit);

    const totalRow = await env.SHARE_DB.prepare(
      'SELECT COUNT(*) as count FROM shares WHERE owner_sub = ? AND deleted_at IS NULL',
    )
      .bind(user.sub)
      .first<{ count: number }>();

    const rows = await env.SHARE_DB.prepare(
      `SELECT id, owner_sub, provider, name, visibility, kv_key, created_at, updated_at, expires_at, deleted_at
       FROM shares
       WHERE owner_sub = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(user.sub, limit, offset)
      .all<{
        id: string;
        owner_sub: string;
        provider: string;
        name: string | null;
        visibility: 'public' | 'private';
        kv_key: string;
        created_at: number;
        updated_at: number;
        expires_at: number;
        deleted_at: number | null;
      }>();

    const origin = new URL(request.url).origin;
    const items = (rows.results || []).map((row) => ({
      id: row.id,
      name: row.name,
      visibility: row.visibility,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
      status: statusFromShare(row),
      link: `${origin}/s/${row.id}`,
    }));

    return jsonResponse(request, {
      items,
      page: Math.max(page, 1),
      pageSize: limit,
      total: Number(totalRow?.count || 0),
    });
  }

  return methodNotAllowed(request);
}
