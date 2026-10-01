CREATE TABLE IF NOT EXISTS permissions (
 id uuid PRIMARY KEY,
 key text NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS roles (
 id uuid PRIMARY KEY,
 tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,name),
 UNIQUE(id,tenant_id)
);
CREATE TABLE IF NOT EXISTS role_permissions (
 role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
 permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
 UNIQUE(role_id,permission_id)
);
CREATE TABLE IF NOT EXISTS user_roles (
 membership_id uuid NOT NULL,
 role_id uuid NOT NULL,
 tenant_id uuid NOT NULL,
 UNIQUE(membership_id,role_id),
 FOREIGN KEY(membership_id,tenant_id) REFERENCES memberships(id,tenant_id) ON DELETE CASCADE,
 FOREIGN KEY(role_id,tenant_id) REFERENCES roles(id,tenant_id) ON DELETE CASCADE
);
