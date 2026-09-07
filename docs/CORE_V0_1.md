# OGroup Core v0.1

OGroup Core is the reusable engineering layer shared by OGroup products.

## Included in v0.1

- Configuration primitives
- Tenant context enforcement
- RBAC primitives
- Validation primitives
- Structured logging contracts
- Audit event contracts
- Automated tenant-isolation and RBAC tests

## Intentionally not included yet

The following remain for later governed increments:

- Database connection and Drizzle schema
- User and organization persistence
- Authentication/session implementation
- HTTP API application
- Billing
- Files
- Notifications
- AI Gateway

## Core boundary rule

Core contains capabilities that are genuinely reusable across multiple products. Product-specific business logic belongs in product/domain modules, not in Core.

## Security rule

Tenant and authorization checks must be performed on trusted server-side paths. Frontend state is never an authorization boundary.
