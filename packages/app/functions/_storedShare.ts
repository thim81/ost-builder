import { customAlphabet } from 'nanoid';
import type { ShareSettings } from '@ost-builder/shared';
import type { EnvBindings } from './_env';

export type ShareVisibility = 'public' | 'private';

export type StoredSharePayload = {
  markdown: string;
  name?: string;
  settings?: ShareSettings;
  collapsedIds?: string[];
  revision: number;
  updatedAt: number;
};

export type ShareRow = {
  id: string;
  owner_sub: string;
  provider: string;
  name: string | null;
  visibility: ShareVisibility;
  kv_key: string;
  created_at: number;
  updated_at: number;
  expires_at: number;
  deleted_at: number | null;
};

export const ALLOWED_TTL_DAYS = [1, 7, 30, 90] as const;
export const DEFAULT_TTL_DAYS = 30;
export const MAX_TTL_DAYS = 90;
export const MAX_MARKDOWN_BYTES = 256 * 1024;
const idGen = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

export function validateMarkdown(markdown: string): string | null {
  if (!markdown || typeof markdown !== 'string') return 'Missing markdown content';
  const size = new TextEncoder().encode(markdown).length;
  if (size > MAX_MARKDOWN_BYTES) {
    return `Markdown exceeds max size (${MAX_MARKDOWN_BYTES} bytes)`;
  }
  return null;
}

export function isVisibility(value: unknown): value is ShareVisibility {
  return value === 'public' || value === 'private';
}

export function normalizeTtlDays(value: unknown): number | null {
  const day = Number(value);
  if (!Number.isInteger(day)) return null;
  if (!ALLOWED_TTL_DAYS.includes(day as (typeof ALLOWED_TTL_DAYS)[number])) return null;
  return day;
}

export function nextExpiryFromNow(ttlDays: number): number {
  const now = Date.now();
  return now + ttlDays * 24 * 60 * 60 * 1000;
}

export function statusFromShare(row: ShareRow): 'active' | 'expired' | 'deleted' {
  if (row.deleted_at) return 'deleted';
  if (row.expires_at <= Date.now()) return 'expired';
  return 'active';
}

export async function ensureShareTable(env: EnvBindings): Promise<void> {
  await env.SHARE_DB.prepare(`
    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      owner_sub TEXT NOT NULL,
      provider TEXT NOT NULL,
      name TEXT,
      visibility TEXT NOT NULL,
      kv_key TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      deleted_at INTEGER
    )
  `).run();

  await env.SHARE_DB.prepare(
    'CREATE INDEX IF NOT EXISTS idx_shares_owner_updated ON shares(owner_sub, updated_at DESC)',
  ).run();
}

export async function generateUniqueShareId(env: EnvBindings, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i += 1) {
    const id = idGen();
    const row = await env.SHARE_DB.prepare('SELECT id FROM shares WHERE id = ?').bind(id).first();
    if (!row) return id;
  }
  throw new Error('Unable to generate unique share ID');
}

export function getKvKey(id: string, revision: number): string {
  return `share:${id}:v${revision}`;
}

export async function putSharePayload(
  env: EnvBindings,
  id: string,
  payload: StoredSharePayload,
  expiresAt: number,
): Promise<string> {
  const kvKey = getKvKey(id, payload.revision);
  const expirationTtl = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  await env.SHARE_KV.put(kvKey, JSON.stringify(payload), {
    expirationTtl,
  });
  return kvKey;
}

export async function readSharePayload(
  env: EnvBindings,
  kvKey: string,
): Promise<StoredSharePayload | null> {
  const raw = await env.SHARE_KV.get(kvKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSharePayload;
  } catch {
    return null;
  }
}

export async function removeSharePayload(env: EnvBindings, kvKey: string): Promise<void> {
  await env.SHARE_KV.delete(kvKey);
}

export async function insertShareRow(
  env: EnvBindings,
  row: {
    id: string;
    ownerSub: string;
    provider: string;
    name?: string;
    visibility: ShareVisibility;
    kvKey: string;
    createdAt: number;
    updatedAt: number;
    expiresAt: number;
  },
): Promise<void> {
  await env.SHARE_DB.prepare(
    `INSERT INTO shares (id, owner_sub, provider, name, visibility, kv_key, created_at, updated_at, expires_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  )
    .bind(
      row.id,
      row.ownerSub,
      row.provider,
      row.name || null,
      row.visibility,
      row.kvKey,
      row.createdAt,
      row.updatedAt,
      row.expiresAt,
    )
    .run();
}

export async function updateShareRow(
  env: EnvBindings,
  row: {
    id: string;
    name?: string | null;
    visibility: ShareVisibility;
    kvKey: string;
    updatedAt: number;
    expiresAt: number;
  },
): Promise<void> {
  await env.SHARE_DB.prepare(
    `UPDATE shares
      SET name = ?, visibility = ?, kv_key = ?, updated_at = ?, expires_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(row.name || null, row.visibility, row.kvKey, row.updatedAt, row.expiresAt, row.id)
    .run();
}

export async function updateShareVisibility(
  env: EnvBindings,
  row: { id: string; visibility: ShareVisibility; updatedAt: number },
): Promise<void> {
  await env.SHARE_DB.prepare(
    `UPDATE shares
      SET visibility = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(row.visibility, row.updatedAt, row.id)
    .run();
}

export async function updateShareExpiry(
  env: EnvBindings,
  row: { id: string; expiresAt: number; updatedAt: number },
): Promise<void> {
  await env.SHARE_DB.prepare(
    `UPDATE shares
      SET expires_at = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(row.expiresAt, row.updatedAt, row.id)
    .run();
}

export async function getShareById(env: EnvBindings, id: string): Promise<ShareRow | null> {
  const row = await env.SHARE_DB.prepare('SELECT * FROM shares WHERE id = ?').bind(id).first();
  return (row as ShareRow | null) || null;
}

export async function listSharesForOwner(
  env: EnvBindings,
  ownerSub: string,
  page: number,
  pageSize: number,
): Promise<{ items: ShareRow[]; total: number }> {
  const limit = Math.max(1, Math.min(pageSize, 100));
  const offset = Math.max(0, (Math.max(page, 1) - 1) * limit);

  const totalRow = await env.SHARE_DB.prepare(
    'SELECT COUNT(*) as count FROM shares WHERE owner_sub = ? AND deleted_at IS NULL',
  )
    .bind(ownerSub)
    .first();
  const total = Number((totalRow as { count?: number | string } | null)?.count || 0);

  const rows = await env.SHARE_DB.prepare(
    `SELECT * FROM shares
      WHERE owner_sub = ? AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?`,
  )
    .bind(ownerSub, limit, offset)
    .all<ShareRow>();

  return {
    items: rows.results || [],
    total,
  };
}

export async function deleteShareRow(env: EnvBindings, id: string): Promise<void> {
  await env.SHARE_DB.prepare('DELETE FROM shares WHERE id = ?').bind(id).run();
}
