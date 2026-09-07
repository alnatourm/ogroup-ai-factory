# OGroup Core Database Standard

## Core identity model

The first shared schema contains:

- organizations
- users
- memberships
- roles
- permissions
- role_permissions
- user_roles
- audit_logs

## Tenant model

`organizations.id` is the tenant identifier for shared SaaS capabilities. Tenant-scoped records such as memberships and roles carry `tenant_id` directly.

Application queries must still enforce authenticated tenant context. Database foreign keys protect integrity but do not replace authorization.

## Migration policy

All schema changes must be represented as version-controlled SQL migrations and verified against PostgreSQL before merge.

The Core test suite uses PGlite, a PostgreSQL engine compiled to WebAssembly, so migrations can be exercised in CI without requiring an external database service.

## Next database increment

Add session/authentication persistence and repository/query helpers that require tenant context by construction.
