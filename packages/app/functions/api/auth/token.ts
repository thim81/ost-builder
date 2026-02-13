import {
  consumeCliAuthCode,
  createCliBearerToken,
  createRefreshToken,
  getSessionUser,
  jsonError,
} from '../../_auth';
import { assertAuthEnv, isStoredShareEnabled, type FunctionContext } from '../../_env';
import { safeJson } from '../../_http';

type TokenBody = { code?: string };

export async function onRequest(context: FunctionContext): Promise<Response> {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return jsonError(405, 'Method not allowed');
  }

  if (!isStoredShareEnabled(env)) {
    return jsonError(404, 'Stored share feature is disabled');
  }

  try {
    assertAuthEnv(env);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Auth environment misconfigured';
    return jsonError(500, message);
  }

  const body = await safeJson<TokenBody>(request);
  let user = null;

  if (body?.code) {
    user = await consumeCliAuthCode(body.code, env.AUTH_SESSION_SECRET);
    if (!user) {
      return jsonError(400, 'Invalid or expired code');
    }
  } else {
    user = await getSessionUser(request, env.AUTH_SESSION_SECRET);
    if (!user) {
      return jsonError(401, 'AUTH_REQUIRED');
    }
  }

  const accessToken = await createCliBearerToken(user, env.AUTH_SESSION_SECRET);
  const refreshToken = await createRefreshToken(user, env.AUTH_SESSION_SECRET);

  return new Response(
    JSON.stringify({
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600, // 1 hour in seconds
      user,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
