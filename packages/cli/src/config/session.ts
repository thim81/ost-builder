import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export type CliSession = {
  apiBase: string;
  accessToken: string;
  user?: {
    sub: string;
    provider: 'github';
    name?: string;
    email?: string;
  };
  savedAt: number;
};

function sessionFilePath(): string {
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'ost-builder', 'cli-session.json');
}

export function loadSession(): CliSession | null {
  const file = sessionFilePath();
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as CliSession;
    if (!parsed?.accessToken || !parsed?.apiBase) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: CliSession): void {
  const file = sessionFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(session, null, 2), 'utf8');
}

export function clearSession(): void {
  const file = sessionFilePath();
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
