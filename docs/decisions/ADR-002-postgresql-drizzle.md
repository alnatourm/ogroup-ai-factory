# ADR-002: PostgreSQL and Drizzle ORM

**Status:** Approved  
**Date:** 2026-09-07  
**Owner:** OGroup Engineering

## Context

The factory needs one dependable relational database standard for SaaS products, tenant ownership, RBAC, financial records, reporting and auditable migrations.

## Decision

PostgreSQL is the default transactional database. Drizzle ORM is the default TypeScript database access and migration layer.

## Alternatives Considered

### MongoDB by default

Useful for document-centric workloads, but weaker as a universal default for strongly relational business systems.

### Prisma by default

A capable alternative, but OGroup standardizes on Drizzle to keep SQL relationships and constraints explicit while retaining TypeScript ergonomics.

## Reasoning

PostgreSQL provides strong relational integrity, transactions, indexing and mature operational tooling. Drizzle keeps schema and query behavior close to SQL and fits the standard TypeScript backend.

## Security / Privacy Impact

Tenant ownership must be explicit and enforced in application queries and automated isolation tests. Database credentials remain secret-managed.

## Operational Impact

Schema changes are migration-controlled. Production schema editing outside approved emergency procedures is prohibited.

## Consequences

Products should not introduce another primary transactional database or ORM without an approved ADR.

## Approval

Approved as the OGroup factory default.
