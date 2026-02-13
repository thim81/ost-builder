import { consumeCliAuthCode, createCliBearerToken, jsonError } from '../../../_auth';
import { assertAuthEnv, isStoredShareEnabled, type FunctionContext } from '../../../_env';
import { safeJson } from '../../../_http';

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
  const code = body?.code;
  if (!code) {
    return jsonError(400, 'Missing code');
  }

  const user = await consumeCliAuthCode(code, env.AUTH_SESSION_SECRET);
  if (!user) {
    return jsonError(400, 'Invalid or expired code');
  }

  const accessToken = await createCliBearerToken(user, env.AUTH_SESSION_SECRET);
  return new Response(
    JSON.stringify({
      accessToken,
      tokenType: 'Bearer',
      user,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
