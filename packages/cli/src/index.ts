#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import {
  parseMarkdownToTree,
  serializeTreeToMarkdown,
  encodeMarkdownToUrlFragment,
} from '@ost-builder/shared';
import { clearSession, loadSession, saveSession } from './config/session.js';
import { getMappedId, upsertMappedId } from './config/mapping.js';
import { apiFetch, resolveApiBase } from './http/client.js';
import { promptSelect, promptText, promptYesNo } from './ui/interactive.js';

type ShareVisibility = 'public' | 'private';
type ShareItem = {
  id: string;
  name?: string | null;
  visibility: ShareVisibility;
  status: 'active' | 'expired' | 'deleted';
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  link: string;
};

type SharePayload = {
  id: string;
  name?: string | null;
  visibility: ShareVisibility;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
  markdown: string;
  collapsedIds?: string[];
  settings?: unknown;
  isOwner: boolean;
};

const DEFAULT_SHARE_BASE = 'https://ost-builder.trinixlabs.dev/';

type LegacyOptions = {
  inputPath?: string;
  share: boolean;
  show: boolean;
  shareBase: string;
  format: 'json' | 'markdown';
  formatExplicit: boolean;
  pretty: boolean;
  name?: string;
};

function openUrl(url: string) {
  if (process.platform === 'darwin') {
    spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    return;
  }
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    return;
  }
  spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
}

function formatTreeAsJson(tree: unknown, pretty: boolean): string {
  return JSON.stringify(tree, (_k, v) => (v instanceof Date ? v.toISOString() : v), pretty ? 2 : 0);
}

function printRootHelp() {
  console.log(`Opportunity Solution Tree (OST) Builder CLI ✨

Usage:
  ost-builder <file.md> [legacy options]
  ost-builder auth <login|status|logout> [options]
  ost-builder library <browse|upload|download|share|access> [options]

Library commands:
  library browse [--json] [--page N] [--page-size N]
  library upload <file.md> [--id <shareId>] [--name <title>] [--access only-me|anyone-with-link] [--ttl 1|7|30|90] [--json]
  library download <id|url> [--out <file.md>] [--force] [--json]
  library share <id|file.md> [--copy] [--open] [--public] [--json]
  library access <id|file.md> --only-me|--anyone-with-link [--json]

Auth commands:
  auth login github [--api-base <url>]
  auth status [--api-base <url>]
  auth logout [--api-base <url>]

Legacy options:
  --show
  --share
  --name <name>
  --format <json|markdown>
  --pretty
  --share-base <url>
  --help, -h`);
}

function parseLegacyArgs(args: string[]): LegacyOptions {
  const options: LegacyOptions = {
    share: false,
    show: false,
    shareBase: DEFAULT_SHARE_BASE,
    format: 'json',
    formatExplicit: false,
    pretty: false,
  };
  let sawFlag = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) continue;
    switch (arg) {
      case '--help':
      case '-h':
        printRootHelp();
        process.exit(0);
      case '--share':
        options.share = true;
        sawFlag = true;
        break;
      case '--show':
        options.show = true;
        options.share = true;
        sawFlag = true;
        break;
      case '--pretty':
        options.pretty = true;
        sawFlag = true;
        break;
      case '--format': {
        const value = args[i + 1];
        if (!value || (value !== 'json' && value !== 'markdown'))
          throw new Error('Expected --format json or markdown.');
        options.format = value;
        options.formatExplicit = true;
        sawFlag = true;
        i += 1;
        break;
      }
      case '--share-base': {
        const value = args[i + 1];
        if (!value) throw new Error('Expected a URL after --share-base.');
        options.shareBase = value;
        sawFlag = true;
        i += 1;
        break;
      }
      case '--name': {
        const value = args[i + 1];
        if (!value) throw new Error('Expected a name after --name.');
        options.name = value;
        sawFlag = true;
        i += 1;
        break;
      }
      default:
        if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
        if (!options.inputPath) options.inputPath = arg;
        else throw new Error('Only one input markdown file is supported.');
    }
  }

  if (!sawFlag && options.inputPath) {
    options.show = true;
    options.share = true;
  }
  return options;
}

function parseFlags(args: string[]): {
  positional: string[];
  flags: Record<string, string | boolean>;
} {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) continue;
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return { positional, flags };
}

function getAuthenticatedSession(): { apiBase: string } {
  const session = loadSession();
  if (!session?.accessToken) {
    throw new Error('Not logged in. Run: ost-builder auth login github');
  }
  return { apiBase: resolveApiBase(session.apiBase) };
}

function extractTreeName(markdown: string): string {
  const first = markdown.split('\n')[0]?.trim() || '';
  if (first.startsWith('# ')) {
    const value = first.slice(2).trim();
    if (value) return value;
  }
  return 'My Opportunity Solution Tree';
}

function parseShareId(input: string): string {
  try {
    const url = new URL(input);
    const match = url.pathname.match(/\/s\/([^/]+)/);
    if (match?.[1]) return match[1];
  } catch {
    // noop
  }
  return input;
}

function mapAccessInput(value: string | boolean | undefined): ShareVisibility | null {
  if (!value || typeof value !== 'string') return null;
  if (value === 'only-me') return 'private';
  if (value === 'anyone-with-link') return 'public';
  return null;
}

function sanitizeFileName(value: string): string {
  return (
    (value || 'ost')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'ost'
  );
}

async function tryCopyToClipboard(text: string): Promise<boolean> {
  try {
    if (process.platform === 'darwin') {
      const child = spawn('pbcopy');
      child.stdin.write(text);
      child.stdin.end();
      return true;
    }
    if (process.platform === 'win32') {
      const child = spawn('clip');
      child.stdin.write(text);
      child.stdin.end();
      return true;
    }
    const child = spawn('xclip', ['-selection', 'clipboard']);
    child.stdin.write(text);
    child.stdin.end();
    return true;
  } catch {
    return false;
  }
}

async function authLogin(apiBase: string) {
  const callback = await new Promise<{ code: string }>((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      server.close();
    };

    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      if (url.pathname !== '/callback') {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const code = url.searchParams.get('code');
      if (!code) {
        res.statusCode = 400;
        res.end('Missing code');
        return;
      }
      res.statusCode = 200;
      res.end('Login complete. You can close this tab and return to the terminal.');
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ code });
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Could not start local callback server'));
        return;
      }
      const redirectUri = `http://127.0.0.1:${address.port}/callback`;
      const returnTo = `/api/auth/cli/callback?redirectUri=${encodeURIComponent(redirectUri)}`;
      const loginUrl = `${apiBase}/api/auth/login?provider=github&returnTo=${encodeURIComponent(returnTo)}`;
      console.error('Opening browser for GitHub login...');
      openUrl(loginUrl);
    });

    timeout = setTimeout(
      () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Login timed out waiting for callback'));
      },
      5 * 60 * 1000,
    );
  });

  const tokenRes = await apiFetch<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: { sub: string; provider: 'github'; name?: string; email?: string };
  }>(
    '/api/auth/token',
    {
      method: 'POST',
      body: JSON.stringify({ code: callback.code }),
    },
    { apiBase },
  );

  saveSession({
    apiBase,
    accessToken: tokenRes.accessToken,
    refreshToken: tokenRes.refreshToken,
    expiresAt: Date.now() + tokenRes.expiresIn * 1000,
    user: tokenRes.user,
    savedAt: Date.now(),
  });

  console.log(`Logged in as ${tokenRes.user.name || tokenRes.user.sub}`);
}

async function authStatus(apiBase: string) {
  const session = loadSession();
  if (!session?.accessToken) {
    console.log('Not logged in');
    return;
  }
  const res = await apiFetch<{
    user: { sub: string; provider: 'github'; name?: string; email?: string } | null;
  }>('/api/auth/me', { method: 'GET' }, { apiBase });
  if (!res.user) {
    throw new Error('Not authenticated');
  }
  console.log(JSON.stringify(res.user, null, 2));
}

async function authLogout(apiBase: string) {
  const session = loadSession();
  if (session?.accessToken) {
    await apiFetch('/api/auth/logout', { method: 'POST' }, { apiBase });
  }
  clearSession();
  console.log('Logged out');
}

async function listShares(apiBase: string, page: number, pageSize: number) {
  return apiFetch<{ items: ShareItem[]; page: number; pageSize: number; total: number }>(
    `/api/share/store?page=${page}&pageSize=${pageSize}`,
    { method: 'GET' },
    { apiBase },
  );
}

async function getShare(apiBase: string, id: string) {
  return apiFetch<SharePayload>(
    `/api/share/store/${encodeURIComponent(id)}`,
    { method: 'GET' },
    { apiBase },
  );
}

async function uploadFile(
  apiBase: string,
  cwd: string,
  file: string,
  options: {
    id?: string;
    name?: string;
    access?: ShareVisibility;
    ttl?: number;
  },
): Promise<{ id: string; link?: string; created: boolean }> {
  const abs = path.resolve(cwd, file);
  if (!fs.existsSync(abs)) throw new Error(`Markdown file not found: ${abs}`);
  const markdown = fs.readFileSync(abs, 'utf8');
  const name = options.name || extractTreeName(markdown);
  const mapped = getMappedId(cwd, file);
  let id = options.id || mapped || undefined;

  if (id) {
    try {
      await apiFetch(
        `/api/share/store/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ markdown, name }),
        },
        { apiBase },
      );

      if (options.access) {
        await apiFetch(
          `/api/share/store/${encodeURIComponent(id)}`,
          { method: 'PATCH', body: JSON.stringify({ visibility: options.access }) },
          { apiBase },
        );
      }
      if (options.ttl) {
        await apiFetch(
          `/api/share/store/${encodeURIComponent(id)}/extend`,
          { method: 'POST', body: JSON.stringify({ ttlDays: options.ttl }) },
          { apiBase },
        );
      }

      upsertMappedId(cwd, apiBase, file, { id, lastUploadedAt: Date.now(), name });
      return { id, created: false };
    } catch (error) {
      const err = error as Error & { status?: number };
      if (err.status !== 404) throw error;
      id = undefined;
    }
  }

  const created = await apiFetch<{ id: string; link: string }>(
    '/api/share/store',
    {
      method: 'POST',
      body: JSON.stringify({
        markdown,
        name,
        visibility: options.access || 'private',
        ttlDays: options.ttl || 30,
      }),
    },
    { apiBase },
  );

  upsertMappedId(cwd, apiBase, file, { id: created.id, lastUploadedAt: Date.now(), name });
  return { id: created.id, link: created.link, created: true };
}

async function handleLibrary(args: string[]) {
  const sub = args[0];
  const { positional, flags } = parseFlags(args.slice(1));
  const { apiBase } = getAuthenticatedSession();
  const cwd = process.cwd();

  if (sub === 'browse') {
    const page = Number(flags.page || 1);
    const pageSize = Number(flags['page-size'] || 20);
    const data = await listShares(apiBase, page, pageSize);
    if (flags.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const selected = await promptSelect(
      'Select a Library item:',
      data.items.map((item) => ({
        label: `${item.name || '(untitled)'} · ${item.visibility} · ${item.status} · updated ${new Date(item.updatedAt).toLocaleString()}`,
        item,
      })),
    );

    if (!selected) {
      console.log('No selection.');
      return;
    }

    const action = await promptSelect('Choose action:', [
      { label: 'Download markdown', value: 'download' },
      { label: 'Copy link', value: 'copy' },
      { label: 'Open link', value: 'open' },
      { label: 'Upload local file into this item (update)', value: 'upload' },
      { label: 'Set access', value: 'access' },
      { label: 'Extend TTL', value: 'extend' },
      { label: 'Delete item', value: 'delete' },
    ]);

    if (!action) return;
    const id = selected.item.id;

    if (action.value === 'download') {
      const payload = await getShare(apiBase, id);
      const out = await promptText('Output file path (.md): ');
      if (!out) return;
      fs.writeFileSync(path.resolve(cwd, out), payload.markdown, 'utf8');
      console.log(`Saved ${out}`);
      return;
    }

    if (action.value === 'copy') {
      await tryCopyToClipboard(selected.item.link);
      console.log(selected.item.link);
      return;
    }

    if (action.value === 'open') {
      openUrl(selected.item.link);
      console.log(`Opened ${selected.item.link}`);
      return;
    }

    if (action.value === 'upload') {
      const local = await promptText('Local markdown file path: ');
      if (!local) return;
      await uploadFile(apiBase, cwd, local, { id });
      console.log('Updated item from local markdown.');
      return;
    }

    if (action.value === 'access') {
      const access = await promptSelect('Set access:', [
        { label: 'Only me', value: 'private' as const },
        { label: 'Anyone with link', value: 'public' as const },
      ]);
      if (!access) return;
      await apiFetch(
        `/api/share/store/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ visibility: access.value }),
        },
        { apiBase },
      );
      console.log('Access updated.');
      return;
    }

    if (action.value === 'extend') {
      const ttlChoice = await promptSelect('Extend TTL:', [
        { label: '1 day', value: 1 },
        { label: '7 days', value: 7 },
        { label: '30 days', value: 30 },
        { label: '90 days', value: 90 },
      ]);
      if (!ttlChoice) return;
      await apiFetch(
        `/api/share/store/${encodeURIComponent(id)}/extend`,
        {
          method: 'POST',
          body: JSON.stringify({ ttlDays: ttlChoice.value }),
        },
        { apiBase },
      );
      console.log('TTL updated.');
      return;
    }

    if (action.value === 'delete') {
      const ok = await promptYesNo('Delete this item?', false);
      if (!ok) return;
      await apiFetch(
        `/api/share/store/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
        { apiBase },
      );
      console.log('Deleted.');
    }
    return;
  }

  if (sub === 'upload') {
    const file = positional[0];
    if (!file) throw new Error('Usage: ost-builder library upload <file.md> [options]');
    const access = mapAccessInput(flags.access);
    const ttl = flags.ttl ? Number(flags.ttl) : undefined;
    const id = typeof flags.id === 'string' ? flags.id : undefined;
    const name = typeof flags.name === 'string' ? flags.name : undefined;
    const result = await uploadFile(apiBase, cwd, file, {
      id,
      name,
      access: access || undefined,
      ttl,
    });
    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(
        result.created ? `Created cloud item: ${result.id}` : `Updated cloud item: ${result.id}`,
      );
      if (result.link) console.log(result.link);
    }
    return;
  }

  if (sub === 'download') {
    const input = positional[0];
    if (!input)
      throw new Error('Usage: ost-builder library download <id|url> [--out <file.md>] [--force]');
    const id = parseShareId(input);
    const payload = await getShare(apiBase, id);
    const outArg =
      typeof flags.out === 'string' ? flags.out : `${sanitizeFileName(payload.name || id)}.md`;
    const outPath = path.resolve(cwd, outArg);
    if (fs.existsSync(outPath) && !flags.force) {
      if (!process.stdout.isTTY) throw new Error(`File exists: ${outArg}. Use --force.`);
      const ok = await promptYesNo(`Overwrite ${outArg}?`, false);
      if (!ok) return;
    }
    fs.writeFileSync(outPath, payload.markdown, 'utf8');
    if (flags.json) {
      console.log(JSON.stringify({ id, out: outPath }, null, 2));
    } else {
      console.log(`Downloaded to ${outPath}`);
    }
    return;
  }

  if (sub === 'share') {
    const input = positional[0];
    if (!input)
      throw new Error('Usage: ost-builder library share <id|file.md> [--copy] [--open] [--public]');
    let id = parseShareId(input);
    const isFile = fs.existsSync(path.resolve(cwd, input));
    if (isFile) {
      const result = await uploadFile(apiBase, cwd, input, {
        access: flags.public ? 'public' : undefined,
      });
      id = result.id;
    } else if (flags.public) {
      await apiFetch(
        `/api/share/store/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ visibility: 'public' }),
        },
        { apiBase },
      );
    }

    const payload = await getShare(apiBase, id);
    if (payload.visibility === 'private' && !flags.public && process.stdout.isTTY && !flags.json) {
      const makePublic = await promptYesNo(
        'This link is only-me. Make it anyone-with-link?',
        false,
      );
      if (makePublic) {
        await apiFetch(
          `/api/share/store/${encodeURIComponent(id)}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ visibility: 'public' }),
          },
          { apiBase },
        );
      }
    }

    const link = `${apiBase}/s/${id}`;
    if (flags.copy) await tryCopyToClipboard(link);
    if (flags.open) openUrl(link);
    if (flags.json) console.log(JSON.stringify({ id, link }, null, 2));
    else console.log(link);
    return;
  }

  if (sub === 'access') {
    const input = positional[0];
    if (!input)
      throw new Error(
        'Usage: ost-builder library access <id|file.md> --only-me|--anyone-with-link',
      );
    let id = parseShareId(input);
    const isFile = fs.existsSync(path.resolve(cwd, input));
    if (isFile) {
      const mapped = getMappedId(cwd, input);
      if (!mapped) throw new Error('No cloud mapping for file. Upload first.');
      id = mapped;
    }

    const visibility = flags['only-me'] ? 'private' : flags['anyone-with-link'] ? 'public' : null;
    if (!visibility) throw new Error('Specify exactly one: --only-me or --anyone-with-link');

    await apiFetch(
      `/api/share/store/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ visibility }),
      },
      { apiBase },
    );

    if (flags.json) console.log(JSON.stringify({ id, visibility }, null, 2));
    else console.log(`Access updated: ${visibility}`);
    return;
  }

  throw new Error('Unknown library subcommand');
}

async function handleAuth(args: string[]) {
  const sub = args[0];
  const { flags, positional } = parseFlags(args.slice(1));
  const apiBase = resolveApiBase(
    typeof flags['api-base'] === 'string' ? flags['api-base'] : undefined,
  );

  if (sub === 'login') {
    const provider = positional[0] || 'github';
    if (provider !== 'github') throw new Error('Only github is supported in V1');
    await authLogin(apiBase);
    return;
  }
  if (sub === 'status') {
    await authStatus(apiBase);
    return;
  }
  if (sub === 'logout') {
    await authLogout(apiBase);
    return;
  }
  throw new Error('Unknown auth subcommand');
}

async function runLegacy(args: string[]) {
  const options = parseLegacyArgs(args);
  if (!options.inputPath) {
    printRootHelp();
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), options.inputPath);
  if (!fs.existsSync(resolvedPath)) throw new Error(`Markdown file not found: ${resolvedPath}`);

  const markdown = fs.readFileSync(resolvedPath, 'utf8');
  let tree = parseMarkdownToTree(markdown);
  const currentMarkdown = markdown;

  if (options.name) tree.name = options.name;

  const shouldPrint =
    !(options.share && options.format === 'json') && !(options.show && !options.formatExplicit);
  if (shouldPrint) {
    if (options.format === 'markdown') console.log(currentMarkdown);
    else console.log(formatTreeAsJson(tree, options.pretty));
  }

  if (options.share) {
    const base = options.shareBase.replace(/#.*$/, '');
    const shareMarkdown =
      options.format === 'markdown'
        ? currentMarkdown
        : serializeTreeToMarkdown(tree, options.name || tree.name);
    const fragment = encodeMarkdownToUrlFragment(shareMarkdown, options.name || tree.name);
    const shareLink = `${base.replace(/\/?$/, '/')}#${fragment}`;
    if (options.show) {
      console.error(`🚀 Opening "${options.name || tree.name}" in your browser...`);
      openUrl(shareLink);
    }
    console.error(`🔗 Copy the following Share link:\n${shareLink}\n`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help') || args.includes('-h')) {
    printRootHelp();
    return;
  }

  const root = args[0];
  if (root === 'auth') {
    await handleAuth(args.slice(1));
    return;
  }
  if (root === 'library') {
    await handleLibrary(args.slice(1));
    return;
  }

  await runLegacy(args);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
