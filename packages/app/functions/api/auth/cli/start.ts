import { createOAuthStateCookie, getAuthorizationUrl, jsonError } from '../../../_auth';
import { assertAuthEnv, isStoredShareEnabled, type FunctionContext } from '../../../_env';
import { safeJson } from '../../../_http';

type StartBody = {
  provider?: 'github';
  redirectUri?: string;
};

function normalizeLocalRedirectUri(input: string | undefined): string | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== 'http:') return null;
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') return null;
    const port = parseInt(url.port || '80', 10);
    if (port < 1024 || port > 65535) return null;
    return url.toString();
  } catch {
    return null;
  }
}

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

  const body = await safeJson<StartBody>(request);
  if (body?.provider && body.provider !== 'github') {
    return jsonError(400, 'Invalid provider');
  }

  const redirectUri = normalizeLocalRedirectUri(body?.redirectUri);
  if (!redirectUri) {
    return jsonError(400, 'Invalid redirectUri; expected localhost callback URL');
  }

  const returnTo = `/api/auth/cli/callback?redirectUri=${encodeURIComponent(redirectUri)}`;
  const { state, cookie } = await createOAuthStateCookie('github', returnTo, env.AUTH_SESSION_SECRET);
  const loginUrl = getAuthorizationUrl('github', env, request, state);

  return new Response(JSON.stringify({ authUrl: loginUrl, provider: 'github' as const }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
}
