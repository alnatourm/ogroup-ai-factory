# OGroup Core v0.4 — Persisted Sessions and Web Security

## Scope

Core v0.4 adds persisted session records, cookie transport primitives, and CSRF protections for browser-authenticated API requests.

## Session persistence

The `sessions` table stores:

- session id
- user id
- SHA-256 token hash
- expiry timestamp
- revocation timestamp
- creation timestamp
- optional last-seen timestamp

Raw session tokens must never be persisted.

## Browser session transport

The shared web-security package defines an `ogroup_session` cookie with:

- `HttpOnly`
- `SameSite=Strict`
- configurable `Secure`
- root path
- explicit max age

The API accepts bearer tokens for non-browser/native clients and the session cookie for web clients.

## CSRF model

Cookie-authenticated mutation requests (`POST`, `PUT`, `PATCH`, `DELETE`) require a matching `Origin` or `Referer` origin against the request host/protocol.

Bearer-token requests are not subjected to browser CSRF checks because browsers do not automatically attach bearer credentials cross-site.

## Not included yet

- password login and password hashing
- session creation/revocation HTTP endpoints
- rate limiting
- account lockout
- email verification/reset flows
- PostgreSQL-backed session/membership repository implementations
- trusted-proxy deployment policy

These remain explicitly not verified/not implemented until subsequent Core increments.
