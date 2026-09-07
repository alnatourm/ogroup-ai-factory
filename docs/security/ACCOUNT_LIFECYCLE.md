# OGroup Account Lifecycle Security

## Scope

This boundary standardizes reusable tokens for:

- email verification
- password reset
- organization invitations

## Rules

1. Raw lifecycle tokens are returned only to the delivery caller and are never persisted.
2. PostgreSQL stores only SHA-256 token hashes.
3. Tokens are purpose-bound and cannot be reused for another workflow.
4. Tokens expire and are single-use.
5. Every token has a subject: an existing user or an email address.
6. Invitation tokens may optionally be tenant-scoped.
7. Token hash uniqueness is enforced by PostgreSQL.
8. Supported purposes are enforced by PostgreSQL constraints.
9. Password reset consumption must be followed by password hashing through the approved Argon2id boundary.
10. Email verification consumption may set `users.email_verified_at`; the raw verification token must not be logged.
11. Security-sensitive issuance and consumption must emit audit events when wired to product/API workflows.

## Not yet included

This increment does not send email, expose public reset/verification endpoints, accept invitations into memberships, or implement a distributed token-delivery service. Those workflows must consume these primitives rather than inventing new token formats.
