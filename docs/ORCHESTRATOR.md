# OGroup Factory Orchestrator v0.1

The orchestrator converts a valid product request into a governed engineering execution plan.

It does not write production code by itself, approve merges, create secrets, or deploy to production.

## Stage order
1. Product
2. Architecture
3. Database
4. Backend and Frontend
5. QA
6. Security
7. Engineering Review
8. Release Readiness

## Human authority
Human approval remains mandatory for architecture exceptions, authentication/authorization/tenant isolation, payments and financial calculations, destructive migrations, shared OGroup Core changes, and production release.

## Determinism
Identical normalized product input produces the same orchestration plan. This gives product, engineering, QA, security, and AI agents one reproducible execution map.

## Next evolution
Later versions may translate stages into GitHub issues, branches, agent assignments and pull requests. Those actions must still obey the Engineering Constitution and CI gates.
