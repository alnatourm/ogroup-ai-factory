# OGroup Core v0.10 — Account Workflows

This increment converts account lifecycle tokens into reusable business workflows before exposing them through HTTP.

## Adds

- email verification issuance and consumption
- password reset request and secure password replacement
- tenant invitation issuance and acceptance
- normalized email handling
- single-use token enforcement through the shared lifecycle store
- tenant-bound invitation acceptance

## Security boundaries

- raw lifecycle tokens are returned only to the delivery boundary and are never intended for persistence
- password reset tokens are purpose-bound, expiring, and single-use
- password replacement uses the shared Argon2id password policy
- invitation acceptance uses the tenant encoded in the consumed invitation record
- unknown password-reset emails return no token at the service layer; HTTP callers must still return a generic success response to prevent account enumeration

## Deferred to the next HTTP slice

- public verification/reset/invitation endpoints
- notification delivery adapters
- endpoint-specific rate limiting and audit events
- session/device listing and remote revocation
