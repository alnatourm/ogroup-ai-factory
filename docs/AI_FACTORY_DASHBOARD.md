# AI Factory Dashboard v0.1

## Goal

Build the fastest useful control plane for OGroup AI Factory. This dashboard is intentionally a direct, lightweight product build. Use the already integrated Stitch Design Adapter for design and Google Antigravity Build Agent for implementation, with independent repository/CI verification.

## Product Owner experience

The normal journey is:

```text
Idea
  -> Factory preparation
  -> Design generated/reviewed
  -> DESIGN APPROVAL
  -> Autonomous build/test/repair/security
  -> Staging
  -> PRODUCT REVIEW
  -> Production approval
```

The Product Owner should not need to manage branches, PRs, CI runs, retries or routine agent failures.

## Core screens

### 1. Factory Home
- Build New Product
- active projects
- running jobs
- needs attention
- Factory health
- project rows/cards with stage, current worker, last activity, progress and human action

### 2. Create Product
- large "What do you want to build?" input
- attachments/reference inputs
- Start Factory
- advanced technical settings collapsed by default

### 3. Project Control Room
- stage timeline: Idea, Product, Architecture, Design, Build, QA, Security, Staging, Review, Production
- current job and assigned executor
- last heartbeat/activity
- measurable evidence such as tasks/tests
- retries/recovery
- human action state
- engineering details as drill-down, not default noise

### 4. Design Approval
- generated screen previews
- Design Review evidence
- responsive and Arabic/RTL review state
- Preview Full Design
- Request Changes
- Approve Design & Continue
- approval clearly authorizes routine work through staging

### 5. Product Review
- Open Staging Product
- build/QA/security/CI/deployment evidence
- known issues
- Send Feedback
- Approve Production

### 6. Agent Registry
Show Factory Job -> primary executor -> provider -> status -> current work -> heartbeat -> fallback -> verification.

Do not represent an architectural role as a connected agent unless a real executable adapter exists.

### 7. Factory Health / Watchdog
- overall Factory health
- Orchestrator
- Watchdog
- GitHub/CI
- deployments
- connected providers
- stalled jobs
- retries and recovery status
- last heartbeat/activity

### 8. Needs My Attention
Only genuine Product Owner decisions. Routine repairable failures stay inside the Factory.

### 9. Activity
Human-readable timeline of meaningful events. Raw logs are optional drill-down.

## Status model

Use:
- QUEUED
- RUNNING
- VERIFYING
- RETRYING
- WAITING_DEPENDENCY
- WAITING_HUMAN
- COMPLETED
- FAILED
- STALLED

Do not rely on an AI-generated percentage. Progress must be derived from measurable stages/tasks/evidence.

## Design direction

Professional enterprise AI control center, clean and fast to scan. Desktop-first, responsive, Arabic/English ready with RTL. Avoid decorative complexity. Human attention states must be unmistakable.

## v0.1 implementation strategy

Speed is the priority:
1. Generate dashboard design through existing Stitch integration.
2. Product Owner reviews/approves design.
3. Send a coherent dashboard build package to existing Antigravity Build Agent.
4. Verify independently through repository checks/tests/CI.
5. Present working output for Product Owner review.

Do not expand v0.1 into a large platform before the core control loop works.
