# OGroup Core v0.5 — PostgreSQL Authentication Repositories

## Scope

Core v0.5 connects the authentication abstractions to real SQL persistence and RBAC data.

## Session repository

`SqlSessionRepository` supports:

- lookup by session-token hash
- creation of a session with an opaque token returned once to the caller
- persistence of only the token hash
- scoped session revocation by session id and user id

## Membership resolver

`SqlMembershipResolver` resolves membership by both `user_id` and `tenant_id`, then loads permissions only through roles belonging to that same tenant.

This provides defense against accidentally using role data from another tenant.

## SQL abstraction

Repositories depend on a minimal `SqlClient` contract so they can run against PostgreSQL-compatible drivers while remaining integration-testable with PGlite.

## Verified behavior

Integration tests verify:

- migrations execute on PostgreSQL semantics
- raw session tokens are not stored
- valid tenant membership resolves
- permissions are loaded through RBAC relations
- wrong-tenant authentication fails
- revoked sessions stop authenticating

## Not included yet

- password credential storage/login
- password hashing
- email verification/reset tokens
- rate limiting/account lockout
- HTTP login/logout/session endpoints
- production connection pooling and deployment configuration
