import {
  createOAuthStateCookie,
  getAuthorizationUrl,
  getProviderFromQuery,
  jsonError,
  redirectResponse,
} from '../../_auth';
import { assertRequiredEnv, isStoredShareEnabled, type FunctionContext } from '../../_env';

export async function onRequest(context: FunctionContext): Promise<Response> {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return jsonError(405, 'Method not allowed');
  }

  if (!isStoredShareEnabled(env)) {
    return jsonError(404, 'Stored share feature is disabled');
  }

  assertRequiredEnv(env);

  const provider = getProviderFromQuery(request);
  if (!provider) {
    return jsonError(400, 'Invalid provider');
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get('returnTo') || '/';
  const { state, cookie } = await createOAuthStateCookie(provider, returnTo, env.AUTH_SESSION_SECRET);
  const loginUrl = getAuthorizationUrl(provider, env, request, state);

  return redirectResponse(loginUrl, [cookie]);
}
