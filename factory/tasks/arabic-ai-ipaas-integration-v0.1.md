# Arabic AI iPaaS Integration Build v0.1

## Mission

Turn the merged Arabic AI iPaaS frontend plus backend v0.2 into an end-to-end integrated product slice.

Work in the existing repository. Do not restart the product, redesign approved screens, replace the frontend, or remove existing tests.

## Existing product state

Frontend:
- apps/arabic-ai-ipaas-web
- React + TypeScript + Vite
- eight approved Stitch-derived routes
- frontend quality gate already passed before this integration branch
- security defaults are fail-closed
- mock fallback must remain explicit and off by default

Backend:
- apps/arabic-ai-ipaas-api
- PostgreSQL-backed provider connections and API-key verification exist
- OpenAI-compatible provider adapter exists
- real Groq live-provider proof previously passed
- multi-tenant controls and credential redaction already exist

Read before coding:
- products/arabic-ai-ipaas/PRODUCT_BRIEF.md
- products/arabic-ai-ipaas/REQUIREMENTS_V0.1.md
- products/arabic-ai-ipaas/ARCHITECTURE_V0.1.md if present
- apps/arabic-ai-ipaas-web/FACTORY_REVIEW.md
- apps/arabic-ai-ipaas-web/BUILD_REPORT.md
- database and backend docs under products/arabic-ai-ipaas and docs

## Priority 1: real frontend/backend integration

Make the frontend use real backend behavior for currently proven capabilities:
1. health/readiness
2. provider connection listing
3. provider connection creation
4. provider connection deletion/update if supported
5. gateway chat/completions
6. workspace-aware authenticated requests

Requirements:
- no hardcoded secrets
- no silent production mock fallback
- explicit useful errors
- preserve tenant/workspace context
- never render provider plaintext secrets after submit

## Priority 2: workflow persistence v0.1

Implement the smallest safe real backend slice needed for:
- create/save workflow definition
- list workflows
- get workflow
- update workflow
- list workflow runs
- manually execute a simple workflow with deterministic supported steps

Canonical representation must remain Workflow JSON v1.

Do not build a giant workflow engine. Build a narrow, testable first slice.

## Priority 3: data policy API

Implement:
- GET workspace data policy
- PUT/PATCH workspace data policy
- PRIVATE / ANONYMOUS_TELEMETRY / IMPROVEMENT_OPT_IN
- explicit opt-in semantics
- audit event on policy change
- tenant isolation

## Priority 4: usage/reliability API

Implement a real summary endpoint from available persisted traces/runs:
- request count
- success/error counts
- latency summary where data exists
- provider usage where data exists

Do not fabricate metrics. Return zero/empty states when there is no data.

## Priority 5: document intelligence integration seam

Implement production-safe API seam and persistence for document jobs:
- create document job metadata
- accepted file metadata validation
- processing / processed / failed status
- extraction result storage contract
- no fake OCR success in production

If OCR engine is not yet wired, return explicit processing/not-configured state rather than simulated extraction.

## Security requirements

- preserve current fail-closed auth defaults
- no plaintext provider secrets in responses/logs
- validate workspace ownership on every scoped read/write
- avoid SSRF expansion
- do not allow arbitrary user-controlled outbound URLs beyond approved provider connection validation rules
- no customer content enters learning datasets by default
- do not claim certifications or retention guarantees that are not technically enforced
- rate-limit or bound expensive gateway/document operations where practical
- keep demo/mock behavior explicitly opt-in

## Tests required

Backend:
- tenant isolation
- auth required
- provider secret redaction
- workflow CRUD isolation
- data-policy isolation
- no silent document fake success
- gateway upstream error propagation
- empty usage metrics are truthful

Frontend:
- no mock fallback by default
- API errors surface as errors
- provider secret not retained/rendered
- integrated routes compile

Run:
- backend tests
- frontend typecheck
- frontend lint
- frontend tests
- frontend build

## Deliverables

- working integration code
- tests
- INTEGRATION_REPORT.md in apps/arabic-ai-ipaas-api or products/arabic-ai-ipaas
- no placeholder success paths for features claimed as live
- final response marker: INTEGRATION_BUILD_COMPLETED

If the token budget is exhausted, preserve completed work in the sandbox and stop cleanly. Do not restart from scratch.
