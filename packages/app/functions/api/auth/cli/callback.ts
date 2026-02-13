import { createCliAuthCode, getSessionUser, jsonError, redirectResponse } from '../../../_auth';
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

  const user = await getSessionUser(request, env.AUTH_SESSION_SECRET);
  if (!user) {
    return jsonError(401, 'AUTH_REQUIRED');
  }

  const url = new URL(request.url);
  const redirectUri = url.searchParams.get('redirectUri');
  if (!redirectUri) {
    return jsonError(400, 'Missing redirectUri');
  }

  let target: URL;
  try {
    target = new URL(redirectUri);
  } catch {
    return jsonError(400, 'Invalid redirectUri');
  }

  if (
    target.protocol !== 'http:' ||
    (target.hostname !== '127.0.0.1' && target.hostname !== 'localhost')
  ) {
    return jsonError(400, 'Invalid redirectUri host');
  }

  const port = parseInt(target.port || '80', 10);
  if (port < 1024 || port > 65535) {
    return jsonError(400, 'Invalid redirectUri port');
  }

  const code = await createCliAuthCode(user, env.AUTH_SESSION_SECRET);
  target.searchParams.set('code', code);

  return redirectResponse(target.toString());
}
