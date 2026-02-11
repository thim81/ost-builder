import { clearSessionCookie } from '../../_auth';
import { jsonResponse, methodNotAllowed, optionsResponse } from '../../_http';
import { type FunctionContext } from '../../_env';

export async function onRequest(context: FunctionContext): Promise<Response> {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return optionsResponse(request);
  }

  if (request.method !== 'POST') {
    return methodNotAllowed(request);
  }

  return jsonResponse(request, { ok: true }, 200, {
    'Set-Cookie': clearSessionCookie(),
  });
}
