# OGroup Core v0.9 — Account Workflow Repository Slice

## Scope

This increment connects the secure account lifecycle token primitives to PostgreSQL-backed repositories.

## Adds

- `SqlAccountTokenRepository`
- secure token issuance using the shared lifecycle primitive
- SHA-256 token-hash persistence only
- normalized email subjects
- lookup by token hash
- atomic single-use consumption guarded by `used_at IS NULL`
- expiry enforcement during consumption
- PostgreSQL integration tests for issuance, hash-only storage, normalization, expiry, and reuse rejection

## Security properties

- Raw verification/reset/invitation tokens are never persisted.
- A token can be consumed only once.
- Expired tokens cannot be consumed.
- Email subjects are normalized before persistence.
- Purpose validation remains enforced by the account-lifecycle service layer.

## Explicitly not complete yet

Public HTTP workflows for email verification, password-reset request/consume, organization invitation acceptance, notification delivery, and session/device management are the next increment.
