INSERT INTO permissions(id,key) VALUES
 ('00000000-0000-4000-8000-000000000107','factory.account.manage'),
 ('00000000-0000-4000-8000-000000000108','factory.billing.manage')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS factory_invitations (
 id uuid PRIMARY KEY,
 tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 email text NOT NULL,
 token_hash text NOT NULL UNIQUE,
 invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
 expires_at timestamptz NOT NULL,
 accepted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS factory_invitations_tenant_email_idx ON factory_invitations(tenant_id,lower(email));

CREATE TABLE IF NOT EXISTS external_identities (
 provider text NOT NULL,
 subject text NOT NULL,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 email text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(provider,subject)
);
CREATE INDEX IF NOT EXISTS external_identities_user_idx ON external_identities(user_id);
