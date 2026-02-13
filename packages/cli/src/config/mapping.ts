import fs from 'node:fs';
import path from 'node:path';

const SIDECAR_FILE = '.ost-library.json';

export type MappingEntry = {
  id: string;
  lastUploadedAt: number;
  name?: string;
};

export type MappingFile = {
  version: 1;
  baseUrl: string;
  files: Record<string, MappingEntry>;
};

function mappingPath(cwd: string): string {
  return path.join(cwd, SIDECAR_FILE);
}

export function loadMapping(cwd: string): MappingFile {
  const file = mappingPath(cwd);
  if (!fs.existsSync(file)) {
    return { version: 1, baseUrl: '', files: {} };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as MappingFile;
    if (!parsed || parsed.version !== 1 || typeof parsed.files !== 'object') {
      return { version: 1, baseUrl: '', files: {} };
    }
    return parsed;
  } catch {
    return { version: 1, baseUrl: '', files: {} };
  }
}

export function saveMapping(cwd: string, mapping: MappingFile): void {
  const file = mappingPath(cwd);
  fs.writeFileSync(file, JSON.stringify(mapping, null, 2), 'utf8');
}

export function normalizeFileKey(cwd: string, file: string): string {
  return path.resolve(cwd, file);
}

export function getMappedId(cwd: string, file: string): string | null {
  const mapping = loadMapping(cwd);
  const key = normalizeFileKey(cwd, file);
  return mapping.files[key]?.id || null;
}

export function upsertMappedId(
  cwd: string,
  baseUrl: string,
  file: string,
  entry: MappingEntry,
): void {
  const mapping = loadMapping(cwd);
  const key = normalizeFileKey(cwd, file);
  mapping.baseUrl = baseUrl;
  mapping.files[key] = entry;
  saveMapping(cwd, mapping);
}
