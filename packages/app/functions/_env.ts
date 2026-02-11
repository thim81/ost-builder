export type OAuthProvider = 'github';

export type SessionUser = {
  sub: string;
  provider: OAuthProvider;
  name?: string;
  email?: string;
  avatarUrl?: string;
};

export type EnvBindings = {
  SHARE_KV: KVNamespace;
  SHARE_DB: D1Database;
  AUTH_SESSION_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  FEATURE_STORED_SHARE_ENABLED?: string;
};

export type FunctionContext<
  Params extends Record<string, string> = Record<string, string>,
> = {
  request: Request;
  env: EnvBindings;
  params: Params;
};

export function isStoredShareEnabled(env: EnvBindings): boolean {
  return (env.FEATURE_STORED_SHARE_ENABLED || 'true').toLowerCase() !== 'false';
}

export function assertRequiredEnv(env: EnvBindings): void {
  const missing = [
    'SHARE_KV',
    'SHARE_DB',
    'AUTH_SESSION_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
  ].filter((key) => !(env as unknown as Record<string, unknown>)[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment bindings: ${missing.join(', ')}`);
  }
}
