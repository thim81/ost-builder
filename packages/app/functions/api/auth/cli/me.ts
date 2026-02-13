import { getCliBearerUser, jsonError } from '../../../_auth';
import { assertAuthEnv, isStoredShareEnabled, type FunctionContext } from '../../../_env';

export async function onRequest(context: FunctionContext): Promise<Response> {
  const { request, env } = context;

  if (request.method !== 'GET') {
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

  const user = await getCliBearerUser(request, env.AUTH_SESSION_SECRET);
  if (!user) {
    return jsonError(401, 'AUTH_REQUIRED');
  }

  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
