CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_unique
  ON sessions(token_hash);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx
  ON sessions(user_id);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx
  ON sessions(expires_at);
