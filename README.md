# OGroup AI Product Factory

## 🔖 FACTORY RESUME HERE

> **Canonical handoff block. Read this section first whenever work resumes.**
>
> Keep this block current whenever the active product changes stage, a blocker is found or cleared, a human gate is reached, a PR is merged, or deployment/verification changes state. Do not append a second handoff block. Replace the values here and preserve historical detail in the checkpoint/history sections below.

| Field | Current value |
|---|---|
| Active product | AI Factory Dashboard |
| Product repository | `alnatourm/AI-FACTORY-DASHBOARD` |
| Factory work item | `ogroup-ai-factory#135` |
| Current stage | Repaired Factory-owned Antigravity async execution; awaiting green verification and next #135 run |
| Product Owner design gate | **APPROVED** |
| Last verified green point | Dashboard Quality Gate green; Watchdog cross-repo dispatch proven; Railway Watchdog deployed successfully before current Antigravity bridge changes |
| Active execution | Antigravity async polling repair `834c84d8` + Watchdog single-flight repair `3b260685`; Engineering Quality Gate and Railway deployment must verify them |
| Current blocker | Previous synchronous Antigravity calls produced `ANTIGRAVITY_OUTPUT_INVALID` or `HeadersTimeoutError`. Repaired by background interaction + polling. No Product Owner blocker. |
| Next automatic action | Quality Gate → Railway SUCCESS → Watchdog starts exactly one #135 Antigravity interaction → poll to completion → publish result → Dashboard worker → independent verification → machine PR → merge/deploy verification → close #135 |
| Human action required | **NONE** unless a genuine Product Owner decision/human gate is raised |
| Secret rule | Antigravity credential stays in Factory. Never request or copy it into the Dashboard repo or chat. |
| Completion rule | Real merged implementation + green verification + successful deployment. Provider/build success alone is not completion. |
| Last handoff update | 2026-09-26 |

### Mandatory handoff protocol

Every Factory stage transition must leave enough state for a new operator/session to continue without reconstructing chat history:

1. Update **Current stage**, **Last verified green point**, **Active execution**, **Current blocker**, and **Next automatic action** above.
2. Record concrete identifiers when available: issue, PR, workflow run, deployment, commit, target repository.
3. Never mark a stage complete from provider output alone. Record the independent verification that made it green.
4. If blocked, state the exact machine-readable or reproducible blocker and which component owns the fix.
5. If waiting for a human, name the exact decision required. Otherwise keep **Human action required = NONE**.
6. After a successful merge/deploy, move the pointer to the next incomplete production slice rather than leaving it on completed work.
7. README handoff state must describe repository reality, not intended future state.


OGroup AI Product Factory is the engineering foundation for building secure, reusable, AI-native software products across OGroup.

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
