# OGroup Core v0.6 — Credential Authentication

## Scope

Core v0.6 introduces password credential storage and verification while preserving the existing session and tenant-isolation model.

## Password hashing

Passwords are hashed with Argon2id using an explicit policy:

- Argon2id
- version 19
- memory cost: 64 MiB
- time cost: 3
- parallelism: 1
- output length: 32 bytes

Raw passwords are never persisted.

## Password policy

Credential creation currently requires passwords from 12 to 1024 characters. Product-specific UX rules may be stricter, but products must not weaken the Core minimum without an approved security decision.

## Database

`users` gains:

- `password_hash`
- `email_verified_at`

A case-insensitive unique email index prevents accounts whose addresses differ only by letter case.

## Credential repository

`SqlCredentialRepository`:

- normalizes email for lookup
- returns credential hashes only to the authentication service
- supports controlled password-hash updates

## Authentication behavior

Unknown email and incorrect password both return a generic authentication failure. Successful verification creates a normal OGroup session through the existing session issuer.

## Not included yet

- public login/logout HTTP endpoints
- account registration
- account lockout/rate limiting
- email verification/reset flows
- MFA
- security-event audit persistence for login attempts
