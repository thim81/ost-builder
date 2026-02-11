import { getSessionUser } from '../../../_auth';
import { jsonResponse, methodNotAllowed, optionsResponse, safeJson } from '../../../_http';
import { checkRateLimit, clientIpFromRequest } from '../../../_rateLimit';
import {
  ensureShareTable,
  getShareById,
  isVisibility,
  MAX_TTL_DAYS,
  nextExpiryFromNow,
  putSharePayload,
  readSharePayload,
  removeSharePayload,
  updateShareRow,
  updateShareVisibility,
  validateMarkdown,
} from '../../../_storedShare';
import { isStoredShareEnabled, type FunctionContext } from '../../../_env';
import type { ShareSettings } from '@ost-builder/shared';

type PatchBody = {
  markdown?: string;
  name?: string;
  visibility?: 'public' | 'private';
  settings?: ShareSettings;
  collapsedIds?: string[];
};

function unavailableResponse(request: Request, reason: 'not_found' | 'expired' | 'deleted') {
  return jsonResponse(request, { error: 'LINK_UNAVAILABLE', reason }, 404);
}

export async function onRequest(context: FunctionContext<{ id: string }>): Promise<Response> {
  const { request, env, params } = context;
  const id = params.id;

  if (request.method === 'OPTIONS') {
    return optionsResponse(request);
  }

  if (!isStoredShareEnabled(env)) {
    return jsonResponse(request, { error: 'Stored share feature is disabled' }, 404);
  }

  await ensureShareTable(env);

  const share = await getShareById(env, id);
  if (!share) {
    return unavailableResponse(request, 'not_found');
  }

  if (share.deleted_at) {
    return unavailableResponse(request, 'deleted');
  }

  if (share.expires_at <= Date.now()) {
    return unavailableResponse(request, 'expired');
  }

  if (request.method === 'GET') {
    const ipRate = await checkRateLimit(env, `read:ip:${clientIpFromRequest(request)}`, 300, 60);
    if (!ipRate.ok) {
      return jsonResponse(request, { error: 'Rate limit exceeded' }, 429);
    }

    const user = await getSessionUser(request, env.AUTH_SESSION_SECRET);
    const isOwner = !!user && user.sub === share.owner_sub;

    if (share.visibility === 'private' && !isOwner) {
      return jsonResponse(
        request,
        {
          error: 'AUTH_REQUIRED',
          private: true,
          login: {
            github: `/api/auth/login?provider=github&returnTo=${encodeURIComponent(`/s/${id}`)}`,
          },
        },
        401,
      );
    }

    const payload = await readSharePayload(env, share.kv_key);
    if (!payload) {
      return unavailableResponse(request, 'not_found');
    }

    return jsonResponse(request, {
      id: share.id,
      name: share.name,
      visibility: share.visibility,
      expiresAt: share.expires_at,
      createdAt: share.created_at,
      updatedAt: share.updated_at,
      markdown: payload.markdown,
      settings: payload.settings,
      collapsedIds: payload.collapsedIds || [],
      isOwner,
    });
  }

  const user = await getSessionUser(request, env.AUTH_SESSION_SECRET);
  if (!user) {
    return jsonResponse(request, { error: 'AUTH_REQUIRED' }, 401);
  }
  if (user.sub !== share.owner_sub) {
    return jsonResponse(request, { error: 'FORBIDDEN' }, 403);
  }

  if (request.method === 'PATCH') {
    const userRate = await checkRateLimit(env, `update:user:${user.sub}`, 120, 60);
    if (!userRate.ok) {
      return jsonResponse(request, { error: 'Rate limit exceeded' }, 429);
    }

    const body = await safeJson<PatchBody>(request);
    const nextVisibility = body?.visibility ?? share.visibility;
    if (!isVisibility(nextVisibility)) {
      return jsonResponse(request, { error: 'Invalid visibility value' }, 400);
    }

    const now = Date.now();

    if (!body?.markdown && body?.visibility && body.visibility !== share.visibility) {
      await updateShareVisibility(env, {
        id,
        visibility: nextVisibility,
        updatedAt: now,
      });

      return jsonResponse(request, {
        id,
        visibility: nextVisibility,
        updatedAt: now,
      });
    }

    const payload = await readSharePayload(env, share.kv_key);
    if (!payload) {
      return unavailableResponse(request, 'not_found');
    }

    const markdown = body?.markdown ?? payload.markdown;
    const markdownError = validateMarkdown(markdown);
    if (markdownError) {
      return jsonResponse(request, { error: markdownError }, 400);
    }

    const updatedPayload = {
      markdown,
      name: body?.name ?? payload.name,
      settings: body?.settings ?? payload.settings,
      collapsedIds: body?.collapsedIds ?? payload.collapsedIds ?? [],
      revision: payload.revision + 1,
      updatedAt: now,
    };

    const expiresAt = Math.min(share.expires_at, nextExpiryFromNow(MAX_TTL_DAYS));
    const nextKvKey = await putSharePayload(env, id, updatedPayload, expiresAt);

    await updateShareRow(env, {
      id,
      name: body?.name ?? share.name,
      visibility: nextVisibility,
      kvKey: nextKvKey,
      updatedAt: now,
      expiresAt,
    });

    if (share.kv_key !== nextKvKey) {
      await removeSharePayload(env, share.kv_key).catch(() => undefined);
    }

    return jsonResponse(request, {
      id,
      visibility: nextVisibility,
      updatedAt: now,
      expiresAt,
    });
  }

  if (request.method === 'DELETE') {
    await removeSharePayload(env, share.kv_key).catch(() => undefined);
    await env.SHARE_DB.prepare('DELETE FROM shares WHERE id = ?').bind(id).run();
    return jsonResponse(request, { ok: true });
  }

  return methodNotAllowed(request);
}
