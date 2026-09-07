ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address text;

CREATE INDEX IF NOT EXISTS sessions_user_created_idx
  ON sessions(user_id, created_at DESC);
