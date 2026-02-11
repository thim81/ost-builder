import type { EnvBindings } from './_env';

export async function checkRateLimit(
  env: EnvBindings,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number }> {
  const fullKey = `ratelimit:${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const currentRaw = await env.SHARE_KV.get(fullKey);
  const current = Number(currentRaw || 0);
  if (current >= limit) {
    return { ok: false, remaining: 0 };
  }

  const next = current + 1;
  await env.SHARE_KV.put(fullKey, String(next), {
    expirationTtl: windowSeconds + 5,
  });

  return { ok: true, remaining: Math.max(0, limit - next) };
}

export function clientIpFromRequest(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
