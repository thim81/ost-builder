import { getRequestUser } from '../../_auth';
import { jsonResponse, methodNotAllowed, optionsResponse } from '../../_http';
import { isStoredShareEnabled, type FunctionContext } from '../../_env';

export async function onRequest(context: FunctionContext): Promise<Response> {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return optionsResponse(request);
  }

  if (request.method !== 'GET') {
    return methodNotAllowed(request);
  }

  if (!isStoredShareEnabled(env)) {
    return jsonResponse(request, { user: null, featureEnabled: false });
  }

  const user = await getRequestUser(request, env.AUTH_SESSION_SECRET);
  return jsonResponse(request, { user, featureEnabled: true });
}
