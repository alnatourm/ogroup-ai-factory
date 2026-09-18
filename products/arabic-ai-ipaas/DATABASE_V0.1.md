# Arabic AI iPaaS — Database Design v0.1

Status: FROZEN_FOR_BUILD  
Product: `arabic-ai-ipaas`  
Database: PostgreSQL 16+  
Tenancy model: workspace-scoped multi-tenant

## 1. Design Gate Input

The Design Review Agent completed run `35373958602` with `DESIGN_PASS`, score 100/100, 8/8 expected screens passed. Stitch project: `13642085509702935579`.

Database design is therefore derived from the frozen architecture and approved product/design flows.

## 2. Core Principles

1. Every tenant-owned row carries `workspace_id`.
2. Cross-tenant access is forbidden by application predicates and must be reinforced with PostgreSQL RLS before production.
3. Provider secrets are never stored in plaintext. Database rows keep encrypted secret blobs or vault references only.
4. Private customer content is private by default and never silently promoted into learning datasets.
5. Workflow definitions use canonical `workflow-json-v1`.
6. Gateway traces must be useful for observability without leaking provider keys or sensitive content.
7. Append-only audit events are preferred for security-relevant activity.

## 3. Core Tables

### Identity and tenancy
- `workspaces`
- `users`
- `workspace_members`
- `api_keys`

### BYOAI and gateway
- `provider_connections`
- `gateway_routes`
- `glossaries`
- `glossary_entries`
- `gateway_traces`

### Automation
- `workflows`
- `workflow_runs`
- `workflow_step_runs`

### Document intelligence
- `documents`
- `document_extractions`

### Governance and learning
- `audit_events`
- `improvement_examples`

## 4. Important Relationships

- Workspace 1:N members, provider connections, routes, glossaries, workflows, documents, traces and audit events.
- User N:M Workspace through `workspace_members`.
- Workflow 1:N `workflow_runs`.
- Workflow run 1:N `workflow_step_runs`.
- Document 1:N `document_extractions`.
- Glossary 1:N `glossary_entries`.
- Provider connection may be referenced by gateway routes and workflow steps through stable IDs stored in validated configuration JSON.

## 5. Security Model

### Tenant isolation
Every tenant-scoped query must include `workspace_id = authenticated_workspace_id`. IDs alone are not authorization.

### Secret storage
`provider_connections.secret_ciphertext` contains only application-encrypted ciphertext, or `secret_ref` points to an external vault. At least one is required for active credentials. Secret values must never be returned by normal read APIs.

### API keys
Store only `key_hash` and a short `key_prefix` for display. Raw keys are shown once at creation time and cannot be reconstructed.

### Audit
`audit_events` is append-only from the application perspective. It records actor, action, entity, timestamp, request metadata and safe structured context.

## 6. Data Zones

`improvement_examples.data_zone` is one of:
- `PRIVATE`
- `ANONYMOUS_TELEMETRY`
- `IMPROVEMENT_OPT_IN`

Only `IMPROVEMENT_OPT_IN` may contain customer-derived content intended for model/product improvement, and only after explicit rights/consent are recorded.

## 7. Retention

Retention policies are workspace-configurable later. v0.1 supports timestamps and soft lifecycle fields so scheduled cleanup can be added without schema redesign.

## 8. Index Strategy

Critical indexes:
- membership: `(workspace_id, user_id)`
- provider connections: `(workspace_id, status)`
- workflows: `(workspace_id, status, updated_at desc)`
- workflow runs: `(workspace_id, workflow_id, started_at desc)`
- documents: `(workspace_id, created_at desc)`
- gateway traces: `(workspace_id, created_at desc)`
- audit events: `(workspace_id, created_at desc)`

Large telemetry tables should later be partitioned by time if volume justifies it.

## 9. Migration Policy

- Forward-only numbered migrations.
- No destructive column drops in the same release that deprecates a field.
- Backfills run separately from schema changes for large tables.
- Every migration is tested against an empty database and a representative upgraded database.
- Production migrations are automated but gated before release.

## 10. Database Gate

Database v0.1 is ready for implementation when:
- SQL migration applies cleanly on PostgreSQL.
- Tenant ownership exists on every tenant-scoped table.
- unique/index constraints match the API contracts.
- no raw provider secret or API key column exists.
- workflow JSON and document extraction JSON remain schema-versioned.
