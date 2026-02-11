import {
  clearOAuthStateCookie,
  createSessionCookie,
  exchangeCodeForUser,
  jsonError,
  redirectResponse,
  validateOAuthState,
} from '../../_auth';
import { assertAuthEnv, isStoredShareEnabled, type FunctionContext } from '../../_env';

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

  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');

  if (!state || !code) {
    return jsonError(400, 'Missing state or code');
  }

  const validated = await validateOAuthState(request, state, env.AUTH_SESSION_SECRET);
  if (!validated) {
    return jsonError(400, 'Invalid OAuth state');
  }

  try {
    const user = await exchangeCodeForUser(validated.provider, code, request, env);
    const sessionCookie = await createSessionCookie(user, env.AUTH_SESSION_SECRET);
    return redirectResponse(validated.returnTo || '/', [sessionCookie, clearOAuthStateCookie()]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth callback failed';
    return jsonError(400, message);
  }
}
