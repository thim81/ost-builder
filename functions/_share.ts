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

function encodeStringToUrlFragment(value: string): string {
  // Convert UTF-8 bytes -> base64
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  // base64url (RFC 4648)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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
