import { getSessionUser } from '../../../../_auth';
import { jsonResponse, methodNotAllowed, optionsResponse, safeJson } from '../../../../_http';
import {
  ALLOWED_TTL_DAYS,
  ensureShareTable,
  getShareById,
  nextExpiryFromNow,
  normalizeTtlDays,
  putSharePayload,
  readSharePayload,
  updateShareExpiry,
} from '../../../../_storedShare';
import {
  assertAuthEnv,
  assertStorageEnv,
  isStoredShareEnabled,
  type FunctionContext,
} from '../../../../_env';

type ExtendBody = {
  ttlDays?: number;
};

export async function onRequest(context: FunctionContext<{ id: string }>): Promise<Response> {
  const { request, env, params } = context;
  const id = params.id;

  if (request.method === 'OPTIONS') {
    return optionsResponse(request);
  }

  if (request.method !== 'POST') {
    return methodNotAllowed(request);
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

  const user = await getSessionUser(request, env.AUTH_SESSION_SECRET);
  if (!user) {
    return jsonResponse(request, { error: 'AUTH_REQUIRED' }, 401);
  }

  const share = await getShareById(env, id);
  if (!share || share.deleted_at) {
    return jsonResponse(request, { error: 'LINK_UNAVAILABLE' }, 404);
  }

  if (share.owner_sub !== user.sub) {
    return jsonResponse(request, { error: 'FORBIDDEN' }, 403);
  }

  const body = await safeJson<ExtendBody>(request);
  const ttlDays = normalizeTtlDays(body?.ttlDays);
  if (!ttlDays) {
    return jsonResponse(
      request,
      { error: `Invalid ttlDays; expected one of ${ALLOWED_TTL_DAYS.join(', ')}` },
      400,
    );
  }

  const payload = await readSharePayload(env, share.kv_key);
  if (!payload) {
    return jsonResponse(request, { error: 'LINK_UNAVAILABLE' }, 404);
  }

  const now = Date.now();
  const expiresAt = nextExpiryFromNow(ttlDays);

  // Refresh KV expiration for current revision payload.
  await putSharePayload(
    env,
    share.id,
    {
      ...payload,
      updatedAt: now,
    },
    expiresAt,
  );

  await updateShareExpiry(env, {
    id: share.id,
    expiresAt,
    updatedAt: now,
  });

  return jsonResponse(request, {
    id: share.id,
    expiresAt,
  });
}
