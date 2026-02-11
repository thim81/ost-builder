import type { ShareSettings } from '@ost-builder/shared';

export type AuthUser = {
  sub: string;
  provider: 'github';
  name?: string;
  email?: string;
  avatarUrl?: string;
};

export type ShareVisibility = 'public' | 'private';
export type ShareStatus = 'active' | 'expired' | 'deleted';

export type CreateStoredShareInput = {
  markdown: string;
  name?: string;
  visibility: ShareVisibility;
  ttlDays: 1 | 7 | 30 | 90;
  settings?: ShareSettings;
  collapsedIds?: string[];
};

export type StoredShareListItem = {
  id: string;
  name?: string | null;
  visibility: ShareVisibility;
  status: ShareStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  link: string;
};

export type StoredSharePayload = {
  id: string;
  name?: string | null;
  visibility: ShareVisibility;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
  markdown: string;
  settings?: ShareSettings;
  collapsedIds?: string[];
  isOwner: boolean;
};

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const error = new Error((json.error as string) || `Request failed: ${res.status}`) as Error & {
      status?: number;
      payload?: Record<string, unknown>;
    };
    error.status = res.status;
    error.payload = json;
    throw error;
  }

  return json as T;
}

export async function getAuthMe(): Promise<{ user: AuthUser | null; featureEnabled: boolean }> {
  return apiFetch('/api/auth/me');
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function createStoredShare(input: CreateStoredShareInput): Promise<{
  id: string;
  link: string;
  expiresAt: number;
  visibility: ShareVisibility;
  status: ShareStatus;
}> {
  return apiFetch('/api/share/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function listStoredShares(page = 1, pageSize = 20): Promise<{
  items: StoredShareListItem[];
  page: number;
  pageSize: number;
  total: number;
}> {
  return apiFetch(`/api/share/store?page=${page}&pageSize=${pageSize}`);
}

export async function getStoredShare(id: string): Promise<StoredSharePayload> {
  return apiFetch(`/api/share/store/${encodeURIComponent(id)}`);
}

export async function updateStoredShare(
  id: string,
  input: {
    markdown?: string;
    name?: string;
    visibility?: ShareVisibility;
    settings?: ShareSettings;
    collapsedIds?: string[];
  },
): Promise<{ id: string; visibility: ShareVisibility; updatedAt: number; expiresAt?: number }> {
  return apiFetch(`/api/share/store/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function extendStoredShare(
  id: string,
  ttlDays: 1 | 7 | 30 | 90,
): Promise<{ id: string; expiresAt: number }> {
  return apiFetch(`/api/share/store/${encodeURIComponent(id)}/extend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttlDays }),
  });
}

export async function deleteStoredShare(id: string): Promise<void> {
  await apiFetch(`/api/share/store/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}
