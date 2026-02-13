import { loadSession } from '../config/session.js';

export type ApiClientOptions = {
  apiBase: string;
  token?: string;
};

export function resolveApiBase(explicit?: string): string {
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.OST_API_BASE) return process.env.OST_API_BASE.replace(/\/$/, '');
  const session = loadSession();
  if (session?.apiBase) return session.apiBase.replace(/\/$/, '');
  return 'https://ost-builder.trinixlabs.dev';
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit,
  options: ApiClientOptions,
): Promise<T> {
  const url = `${options.apiBase}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
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
