# OGroup Core v0.3 — Authentication and API Bootstrap

## Scope

Core v0.3 adds reusable authentication/session boundaries and the first Express API bootstrap.

## Security model

- Session tokens are opaque random values.
- Only SHA-256 token hashes are intended for persistence.
- Expired or revoked sessions are rejected.
- A valid session is not enough: the user must also have an active membership in the requested tenant.
- Tenant context is explicit and must be enforced in data access.
- Permissions are evaluated independently of authentication.
- Protected API routes fail closed when authentication or tenant context is missing.

## API conventions introduced

- `/api/v1/health` is public.
- Protected routes require `Authorization: Bearer <token>`.
- Tenant-scoped routes require `X-Tenant-Id` until a later product-level routing decision replaces or formalizes this mechanism.
- Error responses use stable machine-readable codes.

## Not included yet

- Password hashing/login endpoint
- Session persistence schema
- Cookie transport for web clients
- CSRF middleware
- Rate limiting
- Production database repositories
- Role/permission loading from PostgreSQL
- Full audit-event persistence

These are intentionally deferred to subsequent Core increments and must not be implied as complete.
