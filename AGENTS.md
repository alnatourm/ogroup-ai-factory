# OGroup AI Factory — Agent Operating Rules

All AI coding agents working in this repository must follow these rules.

## Product Owner interaction

The normal Product Owner journey is **Idea -> Design Approval -> Product Review -> Production Approval**.

Do not ask the Product Owner to perform routine orchestration that the Factory can safely perform itself. After design approval, routine implementation, tests, repair loops, CI/review operations and staging preparation should continue within approved permissions.

## Before changing code

1. Read `docs/ENGINEERING_CONSTITUTION.md`.
2. Read `docs/FACTORY_OPERATING_MODEL.md`.
3. Read `docs/FACTORY_AGENT_REGISTRY.md`.
4. Read applicable ADRs under `docs/decisions/`.
5. Read task requirements and acceptance criteria.
6. Identify security, tenant, database and API impact.
7. Do not silently change architecture.

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
- Prefer coherent work packages over microscopic task churn.
- Run independent work in parallel where safe and dependency-correct.

## Agent/provider rules

- A Factory job is not the same thing as an agent/provider.
- Use only executors recorded/configured for the job.
- Use fallback executors only when they have the required capability, tools and permissions.
- Never pretend a missing agent/capability completed work.
- Provider completion is not Factory PASS.

## Watchdog and observability

Long-running work must expose observable status/activity. Canonical states are QUEUED, RUNNING, VERIFYING, RETRYING, WAITING_DEPENDENCY, WAITING_HUMAN, COMPLETED, FAILED and STALLED.

Normal failures should enter automatic diagnose/repair/retest/retry loops before human escalation. A job without recent heartbeat or verifiable activity must not remain indefinitely marked RUNNING.

## Evidence rules

Never claim a check was performed unless it actually ran.

Report evidence using:
- command/check performed
- result
- relevant output summary
- anything not verified

If something cannot be tested, state `NOT VERIFIED`.

AI confidence is not completion evidence. Where practical, the builder must not be the sole verifier.

## Human approval required

Do not independently approve or execute high-impact changes involving:
- design approval
- material architecture changes
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
- production release

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
- staging health verified when applicable

AI confidence is not completion evidence.
