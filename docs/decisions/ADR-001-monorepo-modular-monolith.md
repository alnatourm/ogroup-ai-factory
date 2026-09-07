# ADR-001: Standard Monorepo and Modular Monolith

**Status:** Approved  
**Date:** 2026-09-07  
**Owner:** OGroup Engineering

## Context

OGroup intends to build multiple SaaS products using shared engineering standards and reusable capabilities. Allowing each product or AI agent to invent a separate repository layout and distributed architecture would increase duplication, maintenance cost and architectural drift.

## Decision

The default architecture is an npm workspace monorepo with clear application, package and business-module boundaries.

Primary layout:

```text
/apps
/packages
/modules
/docs
/tests
/infrastructure
/scripts
```

Products begin as modular monoliths unless an approved ADR demonstrates a concrete need for service separation.

## Alternatives Considered

### Separate repository per component

Pros:
- Strong isolation

Cons:
- Higher coordination overhead
- Harder shared tooling and refactoring
- More duplicated configuration

### Microservices by default

Pros:
- Independent deployability

Cons:
- Operational complexity before demonstrated need
- More network/security/failure boundaries
- Harder AI-agent coordination

## Reasoning

A modular monolith preserves domain boundaries while keeping development, testing and deployment simple. The monorepo enables shared packages, consistent tooling and atomic changes across related components.

## Security / Privacy Impact

Domain and tenant boundaries must still be enforced in code and tests. Monorepo access does not imply runtime data access.

## Operational Impact

One standard CI system can validate shared code and applications. Components may later be extracted if evidence justifies the change.

## Consequences

Architecture remains intentionally simple. Teams must avoid uncontrolled cross-module imports that erode module boundaries.

## Approval

Approved as the OGroup factory default.
