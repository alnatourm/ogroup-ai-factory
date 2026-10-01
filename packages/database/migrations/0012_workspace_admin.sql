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

CREATE TABLE IF NOT EXISTS factory_runtime_brain (
 tenant_id text NOT NULL,
 run_id text NOT NULL,
 section text NOT NULL,
 content_json text NOT NULL DEFAULT 'null',
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (tenant_id,run_id,section)
);


-- Backfill the earliest existing membership in each tenant as Owner so RBAC
-- can be enabled without locking out already-provisioned production tenants.
INSERT INTO roles(id,tenant_id,name)
SELECT md5(o.id::text || ':factory-owner')::uuid,o.id,'Owner'
FROM organizations o
ON CONFLICT (tenant_id,name) DO NOTHING;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name='Owner' AND p.key LIKE 'factory.%'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles(membership_id,role_id,tenant_id)
SELECT m.id,r.id,m.tenant_id
FROM memberships m
JOIN roles r ON r.tenant_id=m.tenant_id AND r.name='Owner'
WHERE m.id=(
 SELECT m2.id FROM memberships m2
 WHERE m2.tenant_id=m.tenant_id
 ORDER BY m2.created_at,m2.id LIMIT 1
)
ON CONFLICT DO NOTHING;
