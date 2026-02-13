import { loadSession, saveSession, type CliSession } from '../config/session.js';

export type ApiClientOptions = {
  apiBase: string;
  token?: string;
  autoRefresh?: boolean;
};

export function resolveApiBase(explicit?: string): string {
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.OST_API_BASE) return process.env.OST_API_BASE.replace(/\/$/, '');
  const session = loadSession();
  if (session?.apiBase) return session.apiBase.replace(/\/$/, '');
  return 'https://ost-builder.trinixlabs.dev';
}

async function refreshAccessToken(
  apiBase: string,
  refreshToken: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  try {
    const res = await fetch(`${apiBase}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      expiresIn?: number;
    };
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn || 3600,
    };
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit,
  options: ApiClientOptions,
): Promise<T> {
  let token = options.token;

  // Auto-refresh token if needed
  if (options.autoRefresh !== false && !token) {
    const session = loadSession();
    if (session?.accessToken && session?.refreshToken && session?.expiresAt) {
      const now = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

      // If token expires soon or already expired, refresh it
      if (session.expiresAt <= now + bufferTime) {
        const refreshed = await refreshAccessToken(options.apiBase, session.refreshToken);
        if (refreshed) {
          const updatedSession: CliSession = {
            ...session,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            expiresAt: Date.now() + refreshed.expiresIn * 1000,
            savedAt: Date.now(),
          };
          saveSession(updatedSession);
          token = refreshed.accessToken;
        }
      } else {
        token = session.accessToken;
      }
    }
  }

  const url = `${options.apiBase}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = (payload.error as string) || `Request failed: ${res.status}`;
    const error = new Error(message) as Error & {
      status?: number;
      payload?: Record<string, unknown>;
    };
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  return payload as T;
}
