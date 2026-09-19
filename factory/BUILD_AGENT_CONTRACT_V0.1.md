# OGroup AI Factory Build Agent Contract v0.1

## Purpose

The Build Agent converts an approved product/design package into working software. The Factory Orchestrator owns task selection, scope, budgets, verification, and release gates. The Build Agent is an execution worker, not the product authority.

## Provider boundary

The Factory exposes a provider-neutral BuildAgent contract:

- `start(request)` starts a governed build.
- `get(interactionId)` retrieves machine-readable execution status.
- Provider credentials never appear in task bodies or logs.
- Token budgets are mandatory for autonomous build runs.
- A completed provider interaction is not a Factory PASS. Review, security, test, deployment, and QC gates remain separate.

## Antigravity adapter v0.1

The first implementation uses Google's managed Antigravity agent through the Gemini Interactions API.

Default agent:
`antigravity-preview-09-2026`

Default task budget:
`50,000` total tokens.

The adapter uses background execution so the Factory can start a build, retain the interaction ID, and poll deterministically.

## Arabic AI iPaaS first job

Once the live adapter gate passes, the first governed task is:

`Arabic AI iPaaS Frontend Build v0.1`

Inputs will include the approved Stitch screen contract, product requirements, architecture, API contracts, RTL requirements, and acceptance criteria.

## Gate

Adapter unit verification must pass before a live Antigravity key is connected.

A separate controlled live proof must then demonstrate:
1. the API key is accepted;
2. an Antigravity interaction starts;
3. an interaction ID is returned;
4. status can be retrieved;
5. no credential is emitted to logs.

Only then may the Factory label the Antigravity Build Agent as CONNECTED.
