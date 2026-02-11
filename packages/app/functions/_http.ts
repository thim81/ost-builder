export function corsHeaders(request: Request, includeCredentials = false): HeadersInit {
  const origin = request.headers.get('origin');
  const requestOrigin = new URL(request.url).origin;
  const allowOrigin = origin && origin === requestOrigin ? origin : requestOrigin;

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...(includeCredentials ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
    Vary: 'Origin',
  };
}

export function optionsResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, true),
  });
}

export function jsonResponse(
  request: Request,
  data: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request, true),
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function methodNotAllowed(request: Request): Response {
  return jsonResponse(request, { error: 'Method not allowed' }, 405);
}

export async function safeJson<T>(request: Request): Promise<T | null> {
  return (await request.json().catch(() => null)) as T | null;
}
