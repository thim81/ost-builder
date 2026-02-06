import { createShareLink, jsonResponse, withCors } from '../../_share';

export async function onRequest(context: { request: Request }): Promise<Response> {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: withCors() });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const contentType = request.headers.get('content-type') || '';
  let markdown = '';
  let name: string | undefined;
  let baseUrl: string | undefined;

  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as
      | { markdown?: string; name?: string; baseUrl?: string }
      | null;
    markdown = body?.markdown?.trim() || '';
    name = body?.name?.trim() || undefined;
    baseUrl = body?.baseUrl?.trim() || undefined;
  } else {
    markdown = (await request.text()).trim();
    const url = new URL(request.url);
    name = url.searchParams.get('name') || undefined;
    baseUrl = url.searchParams.get('baseUrl') || undefined;
  }

  if (!markdown) {
    return jsonResponse({ error: 'Missing markdown content' }, 400);
  }

  const { link, fragment } = createShareLink({
    markdown,
    name,
    baseUrl,
    requestUrl: request.url,
  });

  return jsonResponse({ link, fragment, name: name || null });
}
