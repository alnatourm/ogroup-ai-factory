# OGroup AI Product Factory

## 🔖 FACTORY RESUME HERE

> **Canonical handoff block. Read this section first whenever work resumes.**
>
> Keep this block current whenever the active product changes stage, a blocker is found or cleared, a human gate is reached, a PR is merged, or deployment/verification changes state. Do not append a second handoff block. Replace the values here and preserve historical detail below.

| Field | Current value |
|---|---|
| Active product | AI Factory Dashboard |
| Product repository | `alnatourm/AI-FACTORY-DASHBOARD` |
| Factory work item | `ogroup-ai-factory#135`, reopened after premature legacy completion |
| Current stage | **VERIFYING SLICE ORCHESTRATION**. Slice 1 `dashboard-shell-home` implementation was generated, repaired, verified, and merged as Dashboard PR #37. Six-slice completion ledger is being hardened before Slice 2 starts. |
| Product Owner design gate | **APPROVED**. Stitch review passed 100/100 for 9/9 screens with Arabic/RTL/responsive checks green. |
| Last verified green point | Dashboard Quality Gate `36308918476` passed on lifecycle commit `d3d9815a`. Slice 1 code previously passed typecheck, tests, production build, and merged PR #37. |
| Active execution | Factory slice-aware Watchdog commits `0e5e13bd` / `9d2dd3a` exposed two lint blockers. Repair commit `4af70cea` removes them and is awaiting independent Engineering Quality Gate proof. |
| Current blocker | **Machine-only:** prove slice-aware Factory Watchdog green, then record Slice 1 completion ledger. No Product Owner action required. |
| Build slice plan | 1. `dashboard-shell-home` → 2. `dashboard-create-product` → 3. `dashboard-control-room` → 4. `dashboard-design-review` → 5. `dashboard-agents-health` → 6. `dashboard-attention-activity`. |
| Next automatic action | Engineering Quality Gate proves `4af70cea` green → Watchdog runtime/deployment uses slice ledger → record/recognize Slice 1 completion → dispatch bounded Antigravity Slice 2 `dashboard-create-product`. |
| Failure path | Repair any Factory gate/runtime failure before advancing. A slice cannot advance from provider output or merged code alone without independent verification evidence. |
| Human action required | **NONE** unless a genuine Product Owner decision/human gate is raised. |
| Secret rule | Antigravity credential stays in Factory. Never request or copy it into Dashboard repo or chat. |
| Completion rule | #135 closes only after all six required slices have completion evidence and required verification/deployment gates are green. One merged slice is never total completion. |
| Resume command | Inspect latest Factory Engineering Quality Gate, #135 slice comments, Watchdog deployment, Dashboard worker/gate, then continue the first incomplete slice automatically. |
| Last handoff update | 2026-09-27, after reopening #135 and repairing slice-aware Watchdog lint blockers |

### Mandatory handoff protocol

Every Factory stage transition must leave enough state for a new operator/session to continue without reconstructing chat history:

1. Update **Current stage**, **Last verified green point**, **Active execution**, **Current blocker**, and **Next automatic action** above.
2. Record concrete identifiers when available: issue, PR, workflow run, deployment, commit, target repository.
3. Never mark a stage complete from provider output alone. Record the independent verification that made it green.
4. If blocked, state the exact machine-readable or reproducible blocker and which component owns the fix.
5. If waiting for a human, name the exact decision required. Otherwise keep **Human action required = NONE**.
6. After a successful merge/deploy, move the pointer to the next incomplete production slice rather than leaving it on completed work.
7. README handoff state must describe repository reality, not intended future state.

## Mission

Turn business ideas into verified production-ready software while keeping Product Owner interaction focused on decisions rather than engineering orchestration.

**Target operating flow:**

```text
Idea -> Factory Preparation -> Design Approval -> Autonomous Build/Verify -> Product Review -> Production Approval
```

## Master operating rule

> The Product Owner defines the intent, approves the design, reviews the finished product, and authorizes production. The AI Factory owns routine engineering execution between those gates.

Do not ask the Product Owner to perform orchestration that the Factory can safely perform itself.

## Factory control plane

- **Dashboard**: human interface and control room
- **Orchestrator**: decides what should happen next
- **Agent Registry**: maps Factory jobs to real executors/providers and fallbacks
- **Watchdog**: independently determines whether work is actually progressing
- **Agents/adapters**: execute specialist work
- **GitHub/CI/deployment**: engineering record and verification evidence

The Dashboard is not the runtime. Closing the Dashboard must not stop Factory work.

## Current connected execution foundation

The repository includes the Google Stitch Design Agent adapter contract and a concrete Google Antigravity `BuildAgent` implementation. Architectural stages must not be described as connected agents unless a real executable adapter exists. See `docs/FACTORY_AGENT_REGISTRY.md`.

## Operating documents

- `docs/FACTORY_OPERATING_MODEL.md` — autonomy, human gates, fallback, Watchdog and evidence rules
- `docs/FACTORY_AGENT_REGISTRY.md` — actual job-to-executor mapping
- `docs/AI_FACTORY_DASHBOARD.md` — Dashboard v0.1 product definition
- `AGENTS.md` — mandatory rules for coding agents
- `docs/ENGINEERING_CONSTITUTION.md` — engineering authority and governance
- `docs/STITCH_DESIGN_AGENT.md` — Stitch design adapter
- `factory/BUILD_AGENT_CONTRACT_V0.1.md` — build-agent contract

## Core principle

> AI creates speed. Engineering creates trust. Reuse creates scale. Human accountability remains in control.

## Repository purpose

This repository defines and contains engineering governance, Factory orchestration, agent instructions/adapters, GitHub governance, shared OGroup Core packages, product templates, CI/CD quality gates, security/testing standards and Architecture Decision Records.

## Structure

```text
/apps
/packages
/modules
/docs
/factory
/products
/tests
```

## Current focus

Build the AI Factory Dashboard as the lightweight control plane, using the existing Stitch design integration for rapid design and Antigravity for rapid implementation, while independent verification checks the resulting work.

## Current Factory checkpoint — 2026-09-26

This section is the durable recovery point for the current AI Factory Dashboard build. Start here when resuming work.

### Repository roles

- `alnatourm/ogroup-ai-factory` is the Factory supervisor/runtime: orchestrator, agents, Watchdog, quality gates and governed provider execution.
- `alnatourm/AI-FACTORY-DASHBOARD` is the Product Owner control-plane product. Product implementation belongs there, not in this runtime repository.

### Product and design state

- Product: **AI Factory Dashboard**.
- Core scope remains the nine v0.1 screens: Factory Home, Create Product, Project Control Room, Design Approval, Product Review, Agent Registry, Factory Health / Watchdog, Needs My Attention, and Activity.
- Google Stitch approved revision project: `14995607057480771131`.
- Stitch Design Review passed **100/100** with 9/9 screens, Arabic 9/9, RTL 9/9, responsive 9/9 and no blocking issues.
- Product Owner explicitly approved the design.
- Do not reopen the design gate unless implementation reveals a genuine new Product Owner decision.

### Autonomous execution state

- Durable Factory work item: **issue #135**, `AI Factory Dashboard: autonomous implementation in target repo`.
- Target repository parsing was fixed so Markdown `## Target repository` declarations resolve correctly.
- Watchdog is deployed on Railway and proved it can pick #135 automatically:
  `factory-work:135 -> START_NEXT_RUNNABLE -> acted:true`.
- Railway Watchdog service is the continuous supervisor. Build success alone is not deployment proof; require Railway `SUCCESS`.
- The Dashboard `Factory Product Worker` has been successfully triggered through `repository_dispatch`, proving the cross-repository Watchdog bridge works.

### Antigravity credential boundary

A failed Dashboard worker proved that `OGROUP_ANTIGRAVITY_API_KEY` is not available in the Dashboard repository. This is intentional architecture: **do not copy or request the key for the Dashboard**.

The corrected design is:

1. Watchdog sees external target work such as #135.
2. Factory dispatches `factory-antigravity-build` inside this repository.
3. Factory runs Antigravity using its Factory-owned `OGROUP_ANTIGRAVITY_API_KEY`.
4. Factory publishes the machine build payload back to the Factory work item.
5. Watchdog detects that result and dispatches `factory-work-execute` to the Dashboard.
6. Dashboard applies the Factory-generated result, independently runs typecheck/tests/build, creates a real implementation PR, re-verifies the exact PR head, then merges.
7. Watchdog accepts completion only when a merged implementation PR contains real product files. Evidence-only PRs are rejected.

Relevant implementation:
- `.github/workflows/factory-antigravity-target-build.yml`
- `scripts/antigravity-target-build.mjs`
- `packages/watchdog-runtime/src/main.ts`
- Dashboard: `factory/apply-factory-antigravity-result.mjs`
- Dashboard: `.github/workflows/factory-product-worker.yml`

### Latest failure and fix

The first Engineering Quality Gate after adding `scripts/antigravity-target-build.mjs` failed only because ESLint treated Node globals as undefined: `process`, `fetch`, and `console` (7 lint errors). The script now explicitly declares those runtime globals. No Factory architecture change was required for that lint repair.

### Resume checklist

When resuming, do not restart the project or redesign the flow. Continue from here:

1. Confirm the Engineering Quality Gate for the Node-global lint fix is green.
2. Confirm Railway has deployed the latest Watchdog commit with `SUCCESS`.
3. Inspect the active/latest **Factory Antigravity Target Build** for #135.
4. If Antigravity succeeds, confirm a complete `FACTORY_ANTIGRAVITY_RESULT` exists on issue #135.
5. Confirm Watchdog automatically fires a fresh Dashboard **Factory Product Worker**.
6. Inspect Dashboard verification and the resulting `Factory execution: factory-work:135` implementation PR.
7. Require real implementation files and green Dashboard Quality Gate before merge/completion.
8. Verify the merged product and deployment before closing #135.
9. After verified completion, continue to the next incomplete Dashboard production slice automatically unless a genuine human decision is required.

### Operating rules

- Product Owner should not manage branches, PRs, CI retries, routine failures or provider plumbing.
- Never ask the Product Owner to paste secrets into chat.
- Provider completion is not Factory completion.
- Build success is not deploy success.
- Do not claim a fix until verification proves it.
- Missing capability or credential access must surface as configuration/stalled, never a false PASS.
- Keep Factory runtime code here and Dashboard product code in the Dashboard repository.

## Dashboard ↔ Factory control API

The Product Owner Dashboard is a separate control-plane application. It must never embed Factory provider credentials or run the autonomous runtime in the browser.

The Factory API now defines an authenticated, tenant-scoped control bridge through the optional `FactoryControlPort`:

- `GET /api/v1/factory/snapshot` — runs, meaningful activity, truthful agent registry, Watchdog/Factory health, and genuine human-attention items.
- `POST /api/v1/factory/runs` — submit a Product Owner intent to the Factory runtime.
- `POST /api/v1/factory/runs/:runId/gates/design/approve` — authorize autonomous execution through staging.
- `POST /api/v1/factory/runs/:runId/gates/design/changes` — return design feedback to the Factory.
- `POST /api/v1/factory/runs/:runId/gates/production/approve` — authorize the governed production release path.
- `POST /api/v1/factory/runs/:runId/gates/production/changes` — return product feedback before release.

All control endpoints sit behind the existing session + tenant authentication middleware and require `admin:access`. The API contract is intentionally a port: the deployed Factory runtime must inject the real implementation backed by Orchestrator, Stage Controller, Watchdog, Agent Registry/evidence sources, and release governance. If that implementation is not configured, these routes are not mounted. Missing runtime capability must never be represented by mock success.

**Security boundary:** provider secrets remain in the Factory runtime. The Dashboard receives status/evidence and sends Product Owner commands only.


## Direct Builder Mode - Current Operating Rule (2026-09-30)

The AI Factory is the **product being built**, not the system responsible for building itself during the current completion phase.

### Who builds now

- ChatGPT / GPT-5.6 Sol acts as the direct software builder using the connected GitHub, CI, Railway and PostgreSQL tooling.
- Existing working code is preserved and extended. Do not restart from scratch.
- Do **not** dispatch product-development work back through the unfinished Factory, Antigravity self-build loop, or Factory Product Worker unless the Product Owner explicitly changes this rule.
- GitHub Actions is a verification bench. Railway is the deployment target. Neither replaces direct implementation ownership.
- The Product Owner provides product direction and approvals, not routine branch, CI, repair, merge or deployment operations.

### Direct execution loop

For each remaining product gap, execute directly:

1. Inspect the existing implementation and production state.
2. Implement the smallest complete product change directly in the correct repository.
3. Run exact-head CI / quality verification.
4. If verification fails, inspect and repair directly, then re-run it.
5. Merge only the exact verified head.
6. Verify the exact merged SHA reaches Railway production with SUCCESS when deployment applies.
7. Verify real behavior/evidence before claiming completion.
8. Continue to the next product gap without handing development back to the Factory.

### Current product state

The Dashboard now includes durable/authenticated product surfaces for Factory Home, Create Product, Project Control Room, Project Brain, Design Approval, Product Review, My Factory, Providers & encrypted BYOK metadata, Models, Agent Registry, Roles, Usage & Billing, Factory Health, Needs My Attention, Factory Activity and Settings. Static demo workforce data and synthetic verification evidence have been removed from the customer-facing control plane.

Factory run intake persists requirements and queued task state into Project Brain. The Watchdog lifecycle patch now publishes real factory-status:* state transitions while work is dispatched so the Dashboard can reflect orchestration truth instead of leaving active work at QUEUED.

### Remaining completion direction

Continue directly with lifecycle truth, orchestration/evidence persistence, Watchdog hardening, production verification, and the full customer journey test. Google OAuth external setup can remain a later external configuration step and must not block direct product completion.
