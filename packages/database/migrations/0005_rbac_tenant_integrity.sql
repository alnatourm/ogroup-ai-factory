ALTER TABLE memberships
  ADD CONSTRAINT memberships_id_tenant_unique UNIQUE (id, tenant_id);

ALTER TABLE roles
  ADD CONSTRAINT roles_id_tenant_unique UNIQUE (id, tenant_id);

ALTER TABLE user_roles
  ADD COLUMN tenant_id uuid;

UPDATE user_roles ur
SET tenant_id = m.tenant_id
FROM memberships m
WHERE m.id = ur.membership_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.tenant_id IS NULL OR r.tenant_id <> ur.tenant_id
  ) THEN
    RAISE EXCEPTION 'RBAC tenant integrity violation detected during migration';
  END IF;
END $$;

ALTER TABLE user_roles
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_membership_tenant_fk
  FOREIGN KEY (membership_id, tenant_id)
  REFERENCES memberships (id, tenant_id)
  ON DELETE CASCADE;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_role_tenant_fk
  FOREIGN KEY (role_id, tenant_id)
  REFERENCES roles (id, tenant_id)
  ON DELETE CASCADE;
