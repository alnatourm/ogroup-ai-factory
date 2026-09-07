CREATE TABLE account_tokens (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  email text,
  purpose text NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_tokens_subject_required CHECK (user_id IS NOT NULL OR email IS NOT NULL),
  CONSTRAINT account_tokens_purpose_allowed CHECK (purpose IN ('email_verification', 'password_reset', 'invitation'))
);

CREATE UNIQUE INDEX account_tokens_token_hash_unique ON account_tokens(token_hash);
CREATE INDEX account_tokens_user_purpose_idx ON account_tokens(user_id, purpose);
CREATE INDEX account_tokens_email_purpose_idx ON account_tokens(lower(email), purpose);
