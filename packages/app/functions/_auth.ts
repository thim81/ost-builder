import { decodeStringFromUrlFragment, encodeStringToUrlFragment } from '@ost-builder/shared';
import type { EnvBindings, OAuthProvider, SessionUser } from './_env';

const SESSION_COOKIE = 'ost_session';
const OAUTH_STATE_COOKIE = 'ost_oauth_state';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const OAUTH_STATE_TTL_SECONDS = 60 * 10;

type SessionPayload = SessionUser & {
  iat: number;
  exp: number;
};

type OAuthStatePayload = {
  state: string;
  provider: OAuthProvider;
  returnTo: string;
  iat: number;
};

function getCookie(request: Request, key: string): string | null {
  const cookie = request.headers.get('cookie') || '';
  const prefix = `${key}=`;
  const part = cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacSign(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function serializeCookie(
  name: string,
  value: string,
  options?: { maxAge?: number; path?: string; sameSite?: 'Lax' | 'Strict'; httpOnly?: boolean },
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options?.path || '/'}`);
  if (options?.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options?.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options?.httpOnly !== false) parts.push('HttpOnly');
  parts.push('Secure');
  return parts.join('; ');
}

function normalizeReturnTo(value: string | null | undefined): string {
  if (!value) return '/';
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  return value;
}

export async function createSessionCookie(user: SessionUser, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ...user,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encoded = encodeStringToUrlFragment(JSON.stringify(payload));
  const signature = await hmacSign(secret, encoded);
  const value = `${encoded}.${signature}`;
  return serializeCookie(SESSION_COOKIE, value, {
    maxAge: SESSION_TTL_SECONDS,
    sameSite: 'Lax',
    httpOnly: true,
    path: '/',
  });
}

export function clearSessionCookie(): string {
  return serializeCookie(SESSION_COOKIE, '', {
    maxAge: 0,
    sameSite: 'Lax',
    httpOnly: true,
    path: '/',
  });
}

export async function getSessionUser(request: Request, secret: string): Promise<SessionUser | null> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = await hmacSign(secret, encoded);
  if (expected !== signature) return null;

  const decoded = decodeStringFromUrlFragment(encoded);
  if (!decoded) return null;

  const payload = safeJsonParse<SessionPayload>(decoded);
  if (!payload) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return null;

  return {
    sub: payload.sub,
    provider: payload.provider,
    name: payload.name,
    email: payload.email,
    avatarUrl: payload.avatarUrl,
  };
}

export function jsonError(status: number, error: string, details?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ error, ...details }), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function originFromRequest(request: Request): string {
  return new URL(request.url).origin;
}

export function buildLoginUrl(request: Request, provider: OAuthProvider, returnTo?: string): string {
  const url = new URL('/api/auth/login', originFromRequest(request));
  url.searchParams.set('provider', provider);
  if (returnTo) url.searchParams.set('returnTo', normalizeReturnTo(returnTo));
  return url.toString();
}

export async function createOAuthStateCookie(
  provider: OAuthProvider,
  returnTo: string,
  secret: string,
): Promise<{ state: string; cookie: string }> {
  const state = toBase64Url(crypto.getRandomValues(new Uint8Array(20)));
  const payload: OAuthStatePayload = {
    state,
    provider,
    returnTo: normalizeReturnTo(returnTo),
    iat: Date.now(),
  };
  const raw = encodeStringToUrlFragment(JSON.stringify(payload));
  const signature = await hmacSign(secret, raw);
  const value = `${raw}.${signature}`;
  const cookie = serializeCookie(OAUTH_STATE_COOKIE, value, {
    maxAge: OAUTH_STATE_TTL_SECONDS,
    sameSite: 'Lax',
    httpOnly: true,
    path: '/',
  });
  return { state, cookie };
}

export function clearOAuthStateCookie(): string {
  return serializeCookie(OAUTH_STATE_COOKIE, '', {
    maxAge: 0,
    sameSite: 'Lax',
    httpOnly: true,
    path: '/',
  });
}

export async function validateOAuthState(
  request: Request,
  expectedState: string,
  secret: string,
): Promise<{ provider: OAuthProvider; returnTo: string } | null> {
  const token = getCookie(request, OAUTH_STATE_COOKIE);
  if (!token) return null;
  const [raw, signature] = token.split('.');
  if (!raw || !signature) return null;

  const expectedSig = await hmacSign(secret, raw);
  if (expectedSig !== signature) return null;

  const decoded = decodeStringFromUrlFragment(raw);
  if (!decoded) return null;

  const payload = safeJsonParse<OAuthStatePayload>(decoded);
  if (!payload) return null;
  if (payload.state !== expectedState) return null;
  if (Date.now() - payload.iat > OAUTH_STATE_TTL_SECONDS * 1000) return null;

  return {
    provider: payload.provider,
    returnTo: normalizeReturnTo(payload.returnTo),
  };
}

function providerConfig(provider: OAuthProvider, env: EnvBindings, redirectUri: string) {
  if (provider === 'github') {
    return {
      authorizationUrl: `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(env.GITHUB_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('read:user user:email')}`,
      tokenUrl: 'https://github.com/login/oauth/access_token',
    };
  }

  return {
    authorizationUrl:
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(env.GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&scope=${encodeURIComponent('openid email profile')}`,
    tokenUrl: 'https://oauth2.googleapis.com/token',
  };
}

export function getProviderFromQuery(request: Request): OAuthProvider | null {
  const provider = new URL(request.url).searchParams.get('provider');
  if (provider === 'github' || provider === 'google') return provider;
  return null;
}

export function getCallbackRedirectUri(request: Request): string {
  return `${originFromRequest(request)}/api/auth/callback`;
}

export function getAuthorizationUrl(
  provider: OAuthProvider,
  env: EnvBindings,
  request: Request,
  state: string,
): string {
  const redirectUri = getCallbackRedirectUri(request);
  const config = providerConfig(provider, env, redirectUri);
  return `${config.authorizationUrl}&state=${encodeURIComponent(state)}`;
}

export async function exchangeCodeForUser(
  provider: OAuthProvider,
  code: string,
  request: Request,
  env: EnvBindings,
): Promise<SessionUser> {
  const redirectUri = getCallbackRedirectUri(request);

  if (provider === 'github') {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = (await tokenRes.json().catch(() => null)) as
      | { access_token?: string; error?: string }
      | null;

    if (!tokenRes.ok || !tokenData?.access_token) {
      throw new Error(tokenData?.error || 'GitHub token exchange failed');
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ost-builder',
      },
    });

    const profile = (await userRes.json().catch(() => null)) as
      | { id?: number; login?: string; name?: string; avatar_url?: string; email?: string }
      | null;

    if (!userRes.ok || !profile?.id) {
      throw new Error('GitHub profile fetch failed');
    }

    return {
      sub: `github:${profile.id}`,
      provider: 'github',
      name: profile.name || profile.login,
      email: profile.email || undefined,
      avatarUrl: profile.avatar_url || undefined,
    };
  }

  const tokenBody = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenBody.toString(),
  });

  const tokenData = (await tokenRes.json().catch(() => null)) as
    | { access_token?: string; error?: string }
    | null;

  if (!tokenRes.ok || !tokenData?.access_token) {
    throw new Error(tokenData?.error || 'Google token exchange failed');
  }

  const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const profile = (await userRes.json().catch(() => null)) as
    | { sub?: string; name?: string; email?: string; picture?: string }
    | null;

  if (!userRes.ok || !profile?.sub) {
    throw new Error('Google profile fetch failed');
  }

  return {
    sub: `google:${profile.sub}`,
    provider: 'google',
    name: profile.name || profile.email,
    email: profile.email || undefined,
    avatarUrl: profile.picture || undefined,
  };
}

export function redirectResponse(url: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: url });
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie);
  }
  return new Response(null, {
    status: 302,
    headers,
  });
}
