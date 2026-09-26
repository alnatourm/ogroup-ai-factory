# OGroup AI Product Factory

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
