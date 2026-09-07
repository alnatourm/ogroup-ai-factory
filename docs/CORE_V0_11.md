# OGroup Core v0.11 — Account Lifecycle HTTP Boundary

This increment exposes the reusable account lifecycle workflows through the API without weakening the underlying security rules.

## Public endpoints

- `POST /api/v1/auth/password-reset/request`
- `POST /api/v1/auth/password-reset/confirm`
- `POST /api/v1/auth/email/verify`
- `POST /api/v1/auth/invitations/accept`

Password-reset requests return the same accepted response whether or not an account exists. Reset tokens are delivered through a notification boundary and are never returned by the HTTP endpoint.

Token-consuming endpoints are purpose-bound, expiring, single-use, rate-limited, and audited.

## Session/device endpoints

When a product supplies a `SessionDeviceManager`, authenticated users can:

- `GET /api/v1/auth/sessions`
- `DELETE /api/v1/auth/sessions/:sessionId`

Session revocation is user-scoped by contract. The API does not accept a user id from the caller for revocation.

## Compatibility

`accountLifecycle` is an optional `createApp` dependency. Existing products and existing tests continue to run without enabling these routes. Products opt in by providing lifecycle repositories, notification delivery, rate limiters, audit persistence, and optionally session/device management.

## Security notes

- Password reset request responses resist account enumeration.
- Raw reset tokens leave the workflow only through the notification sink.
- Invalid or expired consume tokens use a common error shape.
- Invitation tenant ownership is derived from the consumed invitation token, not caller input.
- Password policy and Argon2id hashing remain centralized in `@ogroup/auth`.
- Audit write failures do not take down account recovery endpoints.

## Deferred

The database-level same-tenant integrity rule for role assignment remains a separate core hardening task and should be completed before broad invitation/role provisioning is considered production-ready.
