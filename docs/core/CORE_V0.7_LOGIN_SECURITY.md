# OGroup Core v0.7 — Login, Logout, Throttling and Security Audit

## Scope

Core v0.7 turns credential authentication into reusable HTTP login/logout behavior with throttling and persisted security audit events.

## Login

`POST /api/v1/auth/login`:

- requires a same-origin browser request
- validates email/password input
- normalizes email before lookup
- applies throttling before Argon2 verification
- returns the same invalid-credentials response for unknown email and wrong password
- creates a normal OGroup session on success
- sets the session only as an HttpOnly, SameSite=Strict cookie
- never returns the raw session token in JSON

## Logout

`POST /api/v1/auth/logout`:

- requires an authenticated session
- applies the existing CSRF rule to cookie-authenticated requests
- revokes the current session
- clears the browser cookie
- records a security audit event

## Rate limiting

The Core includes a fixed-window in-memory limiter suitable for tests and single-process development. Production deployments should bind the `RateLimiter` contract to a shared store such as Redis when multiple API instances are used.

## Audit events

Authentication events include:

- `auth.login.succeeded`
- `auth.login.failed`
- `auth.login.rate_limited`
- `auth.logout.succeeded`

Anonymous failures do not invent a user/actor id. Authenticated events record the real actor when available.

`SqlAuditSink` persists events to `audit_logs`.

## Not included yet

- distributed/Redis rate limiter implementation
- registration
- email verification and password reset
- MFA
- device/session management UI
- production proxy/IP trust configuration
