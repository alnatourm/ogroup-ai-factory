# Watchdog Unexpected Idle Detection

## Purpose

A Factory project must never remain silently idle while executable work exists and no human decision is required.

## Canonical wait and failure states

- `WAITING_HUMAN`: legitimate pause because a Product Owner or authorized human decision is required.
- `WAITING_DEPENDENCY`: legitimate pause on an external dependency. The Watchdog continues checking it.
- `IDLE_UNEXPECTED`: executable work remains, no human gate is active, and no worker/job is running or verifying.
- `STALLED`: a previously active job has stopped producing heartbeat or verifiable progress beyond its allowed threshold.

## Hard invariant

> If work remains, no human decision is required, and no worker is active, the Factory is unhealthy.

## Detection

For each active Factory Run, the Watchdog evaluates:

1. Is the product already completed or intentionally stopped?
2. Is a human gate active and recorded?
3. Is an external dependency explicitly recorded and still valid?
4. Is there a current job in RUNNING, VERIFYING, or RETRYING?
5. Is there recent heartbeat or independently verifiable activity?
6. Does the execution graph contain a runnable next work package?

If the answer to 6 is yes while 2, 3, 4, and 5 are no, mark `IDLE_UNEXPECTED`.

If a current job exists but its heartbeat/activity exceeds its stage timeout, mark `STALLED`.

## Automatic recovery

For `IDLE_UNEXPECTED`:

1. Determine the next runnable stage/work package.
2. Resolve its assigned executor from the Agent Registry.
3. Verify required capability, credentials, permissions, and dependencies.
4. Start the executor.
5. Verify that the job actually entered RUNNING and produced a heartbeat.
6. If start fails, retry within policy.
7. If primary executor remains unavailable, use an approved fallback with the required capability.
8. If no safe executor exists, transition to `WAITING_HUMAN` with a concrete capability/blocker explanation.

For `STALLED`:

1. Check provider/job health and last evidence.
2. Retry safely where idempotent.
3. Use approved fallback where compatible.
4. Re-run independent verification.
5. Escalate only after recovery policy is exhausted or a human gate is genuinely required.

## Reporting

The Dashboard must show:

- idle/stalled project
- duration
- last verified activity
- expected next stage
- assigned executor
- recovery attempt
- recovery result
- whether human action is actually required

Routine recoveries belong in Activity and Factory Health. They must not create Product Owner interruptions unless recovery fails or a human decision is required.

## Design principle

Idle is a valid state only when its reason is explicit and observable. Silent idle is a Factory defect.
