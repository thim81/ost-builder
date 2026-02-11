-- D1 schema for account-backed stored shares
CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  owner_sub TEXT NOT NULL,
  provider TEXT NOT NULL,
  name TEXT,
  visibility TEXT NOT NULL,
  kv_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_shares_owner_updated ON shares(owner_sub, updated_at DESC);
