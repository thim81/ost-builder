import {
  createCliBearerToken,
  createRefreshToken,
  jsonError,
  verifyRefreshToken,
} from '../../_auth';
import { assertAuthEnv, isStoredShareEnabled, type FunctionContext } from '../../_env';
import { safeJson } from '../../_http';

type RefreshBody = { refreshToken?: string };

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

  const body = await safeJson<RefreshBody>(request);
  const refreshToken = body?.refreshToken;

  if (!refreshToken) {
    return jsonError(400, 'Missing refreshToken');
  }

  const user = await verifyRefreshToken(refreshToken, env.AUTH_SESSION_SECRET);
  if (!user) {
    return jsonError(401, 'Invalid or expired refresh token');
  }

  const newAccessToken = await createCliBearerToken(user, env.AUTH_SESSION_SECRET);
  const newRefreshToken = await createRefreshToken(user, env.AUTH_SESSION_SECRET);

  return new Response(
    JSON.stringify({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
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
