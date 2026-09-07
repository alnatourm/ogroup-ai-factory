CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users(email);

CREATE TABLE memberships (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX memberships_tenant_user_unique ON memberships(tenant_id, user_id);

CREATE TABLE roles (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX roles_tenant_name_unique ON roles(tenant_id, name);

CREATE TABLE permissions (
  id uuid PRIMARY KEY,
  key text NOT NULL
);
CREATE UNIQUE INDEX permissions_key_unique ON permissions(key);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX role_permissions_unique ON role_permissions(role_id, permission_id);

CREATE TABLE user_roles (
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX user_roles_unique ON user_roles(membership_id, role_id);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata_json text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
