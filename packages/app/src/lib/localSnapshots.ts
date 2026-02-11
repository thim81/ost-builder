import { nanoid } from 'nanoid';
import type { ShareSettings } from '@ost-builder/shared';

const STORAGE_KEY = 'ost:local:snapshots:v1';
const ACTIVE_SOURCE_KEY_STORAGE = 'ost:local:active-source-key';

export type SnapshotSourceType = 'draft' | 'create-new' | 'share-cloud' | 'share-fragment' | 'manual';

export type SnapshotPayload = {
  name: string;
  markdown: string;
  settings?: ShareSettings;
  collapsedIds?: string[];
};

export type LocalSnapshot = {
  id: string;
  name: string;
  markdown: string;
  settings?: ShareSettings;
  collapsedIds?: string[];
  sourceType?: SnapshotSourceType;
  sourceKey?: string;
  cloudShareId?: string;
  syncedAt?: number;
  payloadHash?: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
};

function readRaw(): LocalSnapshot[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocalSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(items: LocalSnapshot[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function normalizePayload(input: SnapshotPayload): SnapshotPayload {
  return {
    name: input.name.trim() || 'Untitled OST',
    markdown: input.markdown,
    settings: input.settings,
    collapsedIds: input.collapsedIds || [],
  };
}

function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function buildSnapshotPayloadHash(payload: SnapshotPayload): string {
  const normalized = normalizePayload(payload);
  return hashString(
    JSON.stringify({
      name: normalized.name,
      markdown: normalized.markdown,
      settings: normalized.settings || {},
      collapsedIds: normalized.collapsedIds || [],
    }),
  );
}

export function buildFragmentSourceKey(fragment: string): string {
  return `fragment:${hashString(fragment)}`;
}

export function listLocalSnapshots(): LocalSnapshot[] {
  return readRaw().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function findLocalSnapshotBySource(sourceKey: string): LocalSnapshot | null {
  return readRaw().find((item) => item.sourceKey === sourceKey) || null;
}

export function saveLocalSnapshot(input: SnapshotPayload): LocalSnapshot {
  const now = Date.now();
  const normalized = normalizePayload(input);
  const snapshot: LocalSnapshot = {
    id: nanoid(10),
    name: normalized.name,
    markdown: normalized.markdown,
    settings: normalized.settings,
    collapsedIds: normalized.collapsedIds,
    sourceType: 'manual',
    payloadHash: buildSnapshotPayloadHash(normalized),
    createdAt: now,
    updatedAt: now,
  };
  const current = readRaw();
  writeRaw([snapshot, ...current]);
  return snapshot;
}

export function upsertLocalSnapshotBySource(
  sourceKey: string,
  sourceType: SnapshotSourceType,
  input: SnapshotPayload,
  options?: { touchLastOpenedAt?: boolean },
): LocalSnapshot {
  const normalized = normalizePayload(input);
  const payloadHash = buildSnapshotPayloadHash(normalized);
  const current = readRaw();
  const now = Date.now();
  const index = current.findIndex((item) => item.sourceKey === sourceKey);

  if (index >= 0) {
    const existing = current[index];
    if (existing.payloadHash === payloadHash && !options?.touchLastOpenedAt) {
      return existing;
    }

    const updated: LocalSnapshot = {
      ...existing,
      name: normalized.name,
      markdown: normalized.markdown,
      settings: normalized.settings,
      collapsedIds: normalized.collapsedIds,
      sourceType,
      sourceKey,
      payloadHash,
      updatedAt: now,
      ...(options?.touchLastOpenedAt ? { lastOpenedAt: now } : {}),
    };
    current[index] = updated;
    writeRaw(current);
    return updated;
  }

  const created: LocalSnapshot = {
    id: nanoid(10),
    name: normalized.name,
    markdown: normalized.markdown,
    settings: normalized.settings,
    collapsedIds: normalized.collapsedIds,
    sourceType,
    sourceKey,
    payloadHash,
    createdAt: now,
    updatedAt: now,
    ...(options?.touchLastOpenedAt ? { lastOpenedAt: now } : {}),
  };

  writeRaw([created, ...current]);
  return created;
}

export function upsertDraftSnapshot(input: SnapshotPayload): LocalSnapshot {
  return upsertLocalSnapshotBySource('draft:current', 'draft', input);
}

export function upsertShareSnapshot(
  sourceKey: string,
  sourceType: Extract<SnapshotSourceType, 'share-cloud' | 'share-fragment'>,
  input: SnapshotPayload,
): LocalSnapshot {
  return upsertLocalSnapshotBySource(sourceKey, sourceType, input, { touchLastOpenedAt: true });
}

export function updateLocalSnapshot(
  id: string,
  updates: Partial<
    Pick<
      LocalSnapshot,
      | 'name'
      | 'markdown'
      | 'settings'
      | 'collapsedIds'
      | 'cloudShareId'
      | 'syncedAt'
      | 'sourceType'
      | 'sourceKey'
      | 'lastOpenedAt'
    >
  >,
): LocalSnapshot | null {
  const current = readRaw();
  const index = current.findIndex((item) => item.id === id);
  if (index < 0) return null;

  const merged: SnapshotPayload = {
    name: updates.name ?? current[index].name,
    markdown: updates.markdown ?? current[index].markdown,
    settings: updates.settings ?? current[index].settings,
    collapsedIds: updates.collapsedIds ?? current[index].collapsedIds,
  };

  const updated: LocalSnapshot = {
    ...current[index],
    ...updates,
    name: normalizePayload(merged).name,
    payloadHash: buildSnapshotPayloadHash(merged),
    updatedAt: Date.now(),
  };
  current[index] = updated;
  writeRaw(current);
  return updated;
}

export function deleteLocalSnapshot(id: string): void {
  const current = readRaw();
  writeRaw(current.filter((item) => item.id !== id));
}

export function getActiveLocalSnapshotSourceKey(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_SOURCE_KEY_STORAGE);
}

export function setActiveLocalSnapshotSourceKey(sourceKey: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_SOURCE_KEY_STORAGE, sourceKey);
}

export function clearActiveLocalSnapshotSourceKey(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACTIVE_SOURCE_KEY_STORAGE);
}
