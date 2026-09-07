# RBAC Tenant Integrity

## Invariant
A membership may only be assigned a role from the same tenant.

## Enforcement
`user_roles` carries `tenant_id` and PostgreSQL enforces two composite foreign keys:

- `(membership_id, tenant_id)` → `memberships (id, tenant_id)`
- `(role_id, tenant_id)` → `roles (id, tenant_id)`

This prevents cross-tenant role assignment even if application code is incorrect or bypassed.

## Migration safety
Migration `0005_rbac_tenant_integrity.sql` backfills `user_roles.tenant_id` from the membership, checks existing role assignments for tenant mismatch, and aborts if inconsistent legacy data is found before constraints are installed.

## Tests
PostgreSQL integration tests prove:

- same-tenant assignment succeeds;
- cross-tenant role assignment fails;
- forged tenant ids fail.

Application-level authorization remains required. This database invariant is a second security boundary, not a replacement for permission checks.
