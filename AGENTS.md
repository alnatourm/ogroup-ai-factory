# OGroup AI Factory — Agent Operating Rules

All AI coding agents working in this repository must follow these rules.

## Before changing code

1. Read `docs/ENGINEERING_CONSTITUTION.md`.
2. Read applicable ADRs under `docs/decisions/`.
3. Read the task requirements and acceptance criteria.
4. Identify security, tenant, database and API impact.
5. Do not silently change architecture.

## Implementation rules

- Follow the approved stack and repository structure.
- Reuse approved shared packages before duplicating functionality.
- Keep business modules isolated.
- Enforce authorization server-side.
- Enforce tenant ownership on all tenant-scoped operations.
- Validate external input.
- Never hardcode secrets.
- Add or update tests with implementation.
- Update documentation when behavior or architecture changes.

## Evidence rules

Never claim a check was performed unless it actually ran.

Report evidence using:

- command/check performed
- result
- relevant output summary
- anything not verified

If something cannot be tested, state `NOT VERIFIED`.

## Human approval required

Do not independently approve or execute high-impact changes involving:

- authentication architecture
- authorization/RBAC architecture
- tenant isolation strategy
- payments or financial calculations
- encryption/security architecture
- production infrastructure
- destructive database migrations
- production secrets
- irreversible data operations
- material changes to OGroup Core

Propose the change and document the reasoning instead.

## Definition of Done

Before calling work complete, verify applicable items:

- requirements satisfied
- acceptance criteria satisfied
- type checking passes
- build passes
- tests pass
- authorization tested
- tenant isolation tested
- validation/error cases tested
- migrations tested
- docs updated
- security checks passed
- unresolved risks disclosed

AI confidence is not completion evidence.
