# ADR-003: REST APIs with OpenAPI Contracts

**Status:** Approved  
**Date:** 2026-09-07  
**Owner:** OGroup Engineering

## Context

OGroup products may have web, mobile, integrations and AI agents consuming the same backend. The factory needs predictable contracts that are easy to test, document and generate clients from.

## Decision

REST is the default application API style and OpenAPI is the default contract/documentation format.

Routes should use explicit versioning where appropriate, for example `/api/v1/...`.

## Alternatives Considered

### GraphQL by default

Powerful for flexible query needs, but introduces schema/resolver complexity that is unnecessary for most initial OGroup SaaS products.

### RPC-only interfaces

Convenient internally, but less universal for cross-platform and external integrations.

## Reasoning

REST plus OpenAPI is broadly supported, simple to inspect, easy to test and suitable for web, mobile, partners and automated tooling.

## Security / Privacy Impact

Authentication and authorization remain server-enforced. OpenAPI documentation must not expose secrets or sensitive operational details.

## Operational Impact

Breaking API changes should be controlled through versioning or compatible evolution.

## Consequences

Teams may propose GraphQL, event interfaces or other protocols where a specific requirement justifies them, but they are not the default.

## Approval

Approved as the OGroup factory default.
