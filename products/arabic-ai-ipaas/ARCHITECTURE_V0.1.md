# Arabic AI iPaaS — Architecture v0.1

Status: **Architecture Agent Output — Ready for Design**

## 1. Architecture Goal

Build an Arabic-native intelligence and automation platform that sits between Arabic users/business systems and any connected AI provider or agent.

The platform is provider-neutral and supports BYOAI. It owns:
- Arabic understanding and transformation
- workflow intent extraction
- document ingestion
- entity protection
- provider routing
- tenant isolation
- observability
- privacy policy enforcement

It does not own the customer's underlying AI model.

## 2. High-Level System

```text
[Client Apps / Agents / Portal / Webhooks]
                  |
                  v
        [API Gateway + Auth]
                  |
        +---------+----------+
        |                    |
        v                    v
[Arabic AI Gateway]   [Workflow Orchestrator]
        |                    |
        |                    +------------------+
        |                                       |
        v                                       v
[Provider Adapter Layer]              [Document Intelligence]
        |                                       |
        v                                       v
[OpenAI / Gemini / Claude /          [OCR / Layout / RTL /
 Groq / Private / Custom]              Table / Page Provenance]
        |
        v
[Arabic Response Reconstruction]

Shared services:
- PostgreSQL
- Redis / job queue
- encrypted secret vault
- object storage
- audit log
- usage metering
- telemetry
- evaluation dataset pipeline
```

## 3. Service Boundaries

### 3.1 Control Plane API
Responsibilities:
- workspaces
- members and roles
- API keys
- provider connections
- data-policy settings
- workflow definitions
- document metadata
- usage/billing metadata
- audit logs

Recommended stack:
- Node.js + TypeScript
- Fastify or Express
- PostgreSQL
- Prisma/Drizzle

### 3.2 Arabic AI Gateway
Responsibilities:
- OpenAI-compatible inbound API
- tenant/API-key authentication
- language detection
- Arabic mode selection
- optional dialect normalization
- glossary application
- entity masking
- provider/model routing
- provider failover hooks
- response reconstruction
- token/latency accounting
- trace metadata

Recommended stack:
- Python FastAPI for Arabic/NLP-heavy transformations
- Redis for transient execution state
- HTTP adapter interface for upstream providers

### 3.3 Provider Adapter Layer
Every provider implements the same internal contract:

```ts
interface AIProviderAdapter {
  id: string;
  testConnection(config): Promise<ConnectionResult>;
  complete(request, config): Promise<ProviderResponse>;
  stream?(request, config): AsyncIterable<ProviderChunk>;
  models?(config): Promise<ModelDescriptor[]>;
}
```

Initial adapters:
- OpenAI-compatible
- Gemini
- Anthropic-compatible
- Custom HTTP

Provider secrets are stored encrypted and referenced by ID only.

### 3.4 Workflow Orchestrator
Responsibilities:
- natural-language Arabic workflow intake
- intent-to-workflow JSON
- validation
- human review before activation
- trigger registration
- execution state
- retries
- idempotency
- failure handling
- run history

V0.1 should NOT attempt to recreate every iPaaS connector.

Initial primitives:
- webhook trigger
- schedule trigger
- manual trigger
- HTTP action
- AI action
- document-parse action
- email action
- WhatsApp adapter interface
- database/webhook output

The orchestration engine can initially be implemented directly or wrap an existing engine behind an adapter.

### 3.5 Document Intelligence Service
Responsibilities:
- secure upload
- PDF/image rasterization
- OCR
- layout detection
- RTL reading order
- table extraction
- page/block provenance
- Markdown output
- structured JSON output

Suggested internal result:

```json
{
  "documentId": "uuid",
  "language": "ar",
  "pages": [
    {
      "page": 1,
      "blocks": [
        {
          "type": "paragraph",
          "text": "...",
          "bbox": [0,0,0,0],
          "confidence": 0.96
        }
      ]
    }
  ],
  "markdown": "..."
}
```

### 3.6 Arabic Action / Intent Service
V0.1 uses a frontier model through the Provider Adapter Layer.

Its job is:

Arabic instruction -> validated structured intent.

Later this becomes the training/evaluation surface for the proprietary Arabic Action Model.

### 3.7 Data Learning Pipeline
Three hard-separated zones:

#### Private
Raw customer prompts, files, traces and business data.

Never enters training automatically.

#### Anonymous Telemetry
Operational metrics that cannot reconstruct customer content.

Examples:
- latency
- model/provider
- workflow category
- token counts
- error type

#### Improvement Data
Explicitly opted-in, sanitized examples suitable for evaluation/training.

Every record requires:
- workspace policy state
- provenance
- sanitation status
- consent/contract basis marker
- deletion lineage

## 4. Multi-Tenancy

Every business entity is scoped by `workspace_id`.

Tenant-sensitive tables must include workspace ownership explicitly.

Critical rule:
A request authenticated for Workspace A must never resolve data through an unscoped identifier belonging to Workspace B.

Recommended enforcement:
- repository-level workspace predicates
- service-level authorization
- composite unique keys where useful
- security regression tests
- no direct unscoped ORM access from route handlers

## 5. Identity & Roles

V0.1 roles:
- platform_super_admin
- workspace_owner
- workspace_admin
- developer
- automation_builder
- viewer
- partner_admin

API keys belong to workspaces, not individual users.

Keys require:
- prefix/id for lookup
- hashed secret at rest
- scopes
- creation/revocation timestamps
- last-used metadata
- optional expiry

## 6. Core Data Model

### Workspace
- id
- name
- slug
- region
- status
- data_policy
- created_at

### User
- id
- email
- status

### WorkspaceMember
- workspace_id
- user_id
- role
- status

### ApiKey
- id
- workspace_id
- name
- key_hash
- scopes
- expires_at
- revoked_at

### ProviderConnection
- id
- workspace_id
- provider_type
- display_name
- encrypted_config_ref
- status
- default_model

### GatewayRoute
- id
- workspace_id
- name
- provider_connection_id
- model
- arabic_mode
- masking_policy
- glossary_id
- fallback_route_id

### Glossary
- id
- workspace_id
- name

### GlossaryEntry
- glossary_id
- source_term
- canonical_term
- protected

### Workflow
- id
- workspace_id
- name
- source_instruction_ar
- definition_json
- status
- version

### WorkflowRun
- id
- workspace_id
- workflow_id
- status
- trigger_type
- started_at
- completed_at
- error_code

### WorkflowStepRun
- workflow_run_id
- step_id
- status
- input_ref
- output_ref
- attempt

### Document
- id
- workspace_id
- storage_key
- filename
- content_type
- status
- page_count

### DocumentExtraction
- document_id
- version
- markdown_ref
- structured_json_ref
- model_or_engine
- quality_metrics

### GatewayTrace
- id
- workspace_id
- route_id
- provider
- model
- language
- token_input
- token_output
- latency_ms
- status
- payload_retention_policy

### AuditEvent
- id
- workspace_id
- actor
- action
- resource_type
- resource_id
- metadata
- created_at

### ImprovementExample
- id
- workspace_id
- consent_basis
- source_type
- sanitized_input_ref
- sanitized_output_ref
- quality_status
- dataset_version

## 7. API Contracts

### Gateway
`POST /v1/chat/completions`
OpenAI-compatible contract.

Additional optional headers:
- `x-workspace-route`
- `x-arabic-mode`
- `x-trace-id`

### Providers
- `POST /api/v1/providers`
- `POST /api/v1/providers/:id/test`
- `GET /api/v1/providers`
- `DELETE /api/v1/providers/:id`

### Gateway Routes
- CRUD `/api/v1/gateway-routes`

### Workflow
- `POST /api/v1/workflows/generate`
- `POST /api/v1/workflows`
- `PUT /api/v1/workflows/:id`
- `POST /api/v1/workflows/:id/activate`
- `POST /api/v1/workflows/:id/run`
- `GET /api/v1/workflows/:id/runs`

### Documents
- `POST /api/v1/documents`
- `POST /api/v1/documents/:id/parse`
- `GET /api/v1/documents/:id`
- `GET /api/v1/documents/:id/extraction`

### Usage
- `GET /api/v1/usage/summary`
- `GET /api/v1/traces`

## 8. Workflow Definition Contract

```json
{
  "version": 1,
  "name": "Approve large supplier quote",
  "trigger": {
    "type": "webhook",
    "config": {}
  },
  "steps": [
    {
      "id": "extract",
      "type": "ai.extract",
      "config": {
        "schema": {
          "amount": "number",
          "currency": "string"
        }
      }
    },
    {
      "id": "threshold",
      "type": "condition",
      "config": {
        "expression": "extract.amount > 10000 && extract.currency == 'SAR'"
      }
    },
    {
      "id": "approval",
      "type": "http.request",
      "config": {
        "connection": "manager-approval-api"
      }
    }
  ]
}
```

No generated workflow is activated automatically in V0.1 without an explicit activation event.

## 9. Security Boundaries

Mandatory:
- encrypted provider credentials
- secret redaction
- tenant isolation
- API-key scopes
- rate limits
- upload limits
- content-type validation
- malware scanning hook
- signed object-storage access
- audit trail
- no raw secret logging
- no silent dataset collection
- opt-in data policy recorded
- outbound provider allowlist/adapter validation
- SSRF protection on custom HTTP integrations

## 10. Deployment Topology

V0.1:

```text
Web App
Control API
Arabic Gateway
Document Worker
Workflow Worker
PostgreSQL
Redis
Object Storage
```

Containerized independently.

Recommended environments:
- local
- staging
- production

Staging must expose:
- health endpoint per service
- Git revision
- readiness status

## 11. MVP Build Slices

### Slice 1 — Foundation
- monorepo
- auth
- workspaces
- roles
- API keys
- audit foundation
- health/revision endpoints

### Slice 2 — BYOAI Gateway
- provider connection
- OpenAI-compatible adapter
- Gemini adapter
- Arabic detection
- trace/usage
- secure secrets

### Slice 3 — Arabic Transformation
- entity masking/rehydration
- glossary
- Arabic mode pipeline
- evaluation fixtures

### Slice 4 — Workflow MVP
- Arabic instruction -> workflow JSON
- editor
- webhook/manual trigger
- HTTP + AI actions
- execution history

### Slice 5 — Document Intelligence
- upload
- parsing queue
- Arabic OCR/layout
- Markdown/JSON extraction
- workflow handoff

### Slice 6 — Privacy & Data Flywheel
- workspace data policy
- anonymized telemetry
- explicit improvement-data opt-in
- dataset provenance

### Slice 7 — Pilot Hardening
- review/security
- CI
- staging deploy
- browser QC
- defect/fix loop
- owner gate

## 12. Architecture Decisions Frozen for V0.1

1. BYOAI is mandatory.
2. Provider-neutral internal interface.
3. Arabic intelligence is a separate gateway/service boundary.
4. Multi-tenancy exists from day one.
5. Customer private content is not default training data.
6. Workflow JSON is the canonical automation representation.
7. Existing orchestration technology may sit behind an adapter.
8. The product remains capable of self-hosted/private deployment later.
9. Token-cost optimization is measured, not promised.
10. Product #2 must pass the Factory V1 gates end-to-end.
