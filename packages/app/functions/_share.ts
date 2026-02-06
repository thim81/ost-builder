import { encodeStringToUrlFragment } from '../src/lib/urlEncoding';

export type ShareLinkInput = {
  markdown: string;
  name?: string;
  baseUrl?: string;
  requestUrl: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function withCors(headers?: HeadersInit): HeadersInit {
  return {
    ...corsHeaders,
    ...headers,
  };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: withCors({ 'Content-Type': 'application/json' }),
  });
}

export function encodeMarkdownToUrlFragment(markdown: string, name?: string): string {
  const payload = JSON.stringify({ v: 1, m: markdown, n: name || '' });
  return encodeStringToUrlFragment(payload);
}

function normalizeBaseUrl(baseUrl: string): string {
  const withoutHash = baseUrl.replace(/#.*$/, '');
  return withoutHash.endsWith('/') ? withoutHash.slice(0, -1) : withoutHash;
}

export function createShareLink({ markdown, name, baseUrl, requestUrl }: ShareLinkInput): {
  fragment: string;
  link: string;
} {
  const fragment = encodeMarkdownToUrlFragment(markdown, name);
  const fallbackBaseUrl = `${new URL(requestUrl).origin}/`;
  const base = normalizeBaseUrl((baseUrl || fallbackBaseUrl).trim());
  return {
    fragment,
    link: `${base}#${fragment}`,
  };
}
