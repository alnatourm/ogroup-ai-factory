# OGroup AI Factory Operating Model v0.1

## Purpose

The Factory exists to turn product intent into verified software with minimal Product Owner interruption.

## Master rule

> The Product Owner defines the intent, approves the design, reviews the finished product, and authorizes production. The AI Factory owns routine engineering execution between those gates.

Do not ask the Product Owner to perform orchestration that the Factory can safely perform itself.

## Normal human journey

1. **Idea** — Product Owner describes the product and essential constraints.
2. **Design approval** — Factory presents reviewed design. Approval authorizes routine implementation through staging.
3. **Product review** — Factory presents a verified staging product. Product Owner sends feedback or approves production.

Questions are allowed only when the answer materially changes the product and cannot safely be inferred.

## Autonomous execution

After design approval the Factory may autonomously perform routine implementation, testing, repair, re-testing, security checks, engineering review, branch/PR operations, and staging deployment within approved permissions.

Routine CI failures, test failures and remediable defects trigger repair loops, not immediate human interruption.

## Human gates

Human approval remains required for:
- design approval
- material architecture changes
- authentication/authorization/tenant-isolation architecture changes
- payments or financial correctness changes
- destructive or irreversible data operations
- production infrastructure/security boundary changes
- material OGroup Core changes
- production release

## Orchestrator

The Orchestrator owns sequencing, dependencies, safe parallelism, agent assignment, retries, fallback selection, verification, budgets, escalation and release readiness. Agents are workers; they do not decide the Factory's next stage.

## Agent Registry and fallback

Every executable Factory job must identify:
- job type
- primary executor/provider
- required tools/capabilities
- permissions
- fallback executor(s)
- verification method
- applicable human gate

If the specialist is unavailable, use the approved fallback chain only when the fallback has the required capability and permission. Missing capability must never be disguised as completed work.

## Work packages

Prefer coherent modules/milestones over microscopic AI tasks. A build package should include applicable requirements, architecture, approved design, data/API contracts, security rules, acceptance criteria and test requirements.

## Parallelism

Independent work runs in parallel where safe. Dependencies, not habit, determine sequencing.

## Evidence

Agent confidence is not evidence. Completion requires independently verifiable evidence appropriate to the job, such as repository changes, passing tests, CI results, acceptance checks, security evidence and healthy staging.

Where practical, the builder must not be the sole verifier of its own work.

## Watchdog

The Watchdog is a deterministic Factory service, not an LLM personality. It answers: **Is the work actually happening?**

Every long-running job must expose externally observable state and recent activity/heartbeat.

Canonical job states:
- QUEUED
- RUNNING
- VERIFYING
- RETRYING
- WAITING_DEPENDENCY
- WAITING_HUMAN
- COMPLETED
- FAILED
- STALLED

The Watchdog monitors agent/provider status, heartbeat/activity, GitHub activity, CI, tests, quotas/provider errors, retries and deployment health.

A missing heartbeat or lack of verifiable activity moves a job toward STALLED according to configured timeout policy. Automatic recovery should attempt provider re-check, retry and approved fallback before escalating to the Product Owner.

## Dashboard

The Dashboard is the Product Owner control plane, not a GitHub mirror. It must answer:
1. What is being built?
2. Is the Factory actually working?
3. Does anything need me?

Default views show outcomes and evidence summaries. Logs, commits, PRs, tokens and provider details live behind engineering drill-downs.

The Dashboard may go offline without stopping Factory execution.

## Production

The Factory may autonomously reach **STAGING READY**. No agent grants itself production authority. Production release requires the configured human approval and release evidence.

## Learning loop

Recurring product failures should improve the Factory itself through stronger contracts, templates, tests, rules, prompts, acceptance criteria or automated gates.
