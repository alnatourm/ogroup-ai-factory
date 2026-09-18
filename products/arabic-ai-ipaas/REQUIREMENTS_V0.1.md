# Arabic AI iPaaS — Product Requirements v0.1

## 1. Actors

### Platform Super Admin
- manages tenants
- manages plans/quotas
- manages provider adapters
- monitors usage and system health

### Workspace Owner
- creates workspace
- invites users
- configures data policy
- connects AI providers
- manages integrations
- reviews usage and audit logs

### Developer
- creates API keys
- configures gateway routes
- connects agents/apps
- tests requests
- reviews traces

### Automation Builder
- creates workflows from Arabic instructions
- edits generated workflow steps
- activates/deactivates workflows
- reviews run history

### Partner / Agency
- manages multiple client workspaces
- may use white-label branding

## 2. MVP modules

### A. Authentication & Multi-tenancy
- workspace accounts
- roles and permissions
- API keys
- tenant isolation
- audit events

### B. Arabic AI Gateway
- OpenAI-compatible inbound endpoint
- provider-neutral outbound adapters
- Arabic language detection
- optional dialect normalization
- entity masking / rehydration
- glossary handling
- routing by workspace/provider/model
- request/response trace metadata
- token/latency counters
- failover policy hooks

### C. BYOAI Provider Connections
Workspace can connect its own:
- OpenAI-compatible endpoint
- Gemini
- Anthropic-compatible endpoint
- Groq/OpenAI-compatible endpoint
- private/custom HTTP model endpoint

Credentials must be encrypted and never exposed in logs.

### D. Arabic Workflow Builder
Input:
- Arabic natural-language workflow instruction

Output:
- trigger
- conditions
- actions
- required integrations
- human-readable Arabic summary
- machine-readable workflow JSON

MVP supports:
- webhook trigger
- scheduled trigger
- manual trigger
- HTTP/API action
- email action
- WhatsApp adapter interface
- database/webhook output

### E. Arabic Document Intelligence
MVP:
- upload Arabic/bilingual PDF
- extract text with page provenance
- preserve RTL reading order
- basic table extraction
- return Markdown + structured JSON
- send extracted content into a workflow or AI gateway

### F. Data Policy
Each workspace selects:
- Private only
- Anonymous telemetry allowed
- Explicit improvement-data opt-in

System must maintain strict separation between:
1. customer private data
2. anonymous operational telemetry
3. explicitly licensed improvement data

### G. Usage & Observability
Dashboard:
- requests
- workflow runs
- document pages
- provider usage
- token counts
- estimated upstream cost
- errors
- latency
- gateway success rate

## 3. Critical user journeys

### Journey 1 — Connect own AI
1. create workspace
2. add provider
3. enter provider configuration securely
4. run connection test
5. receive gateway API key
6. send Arabic request
7. receive Arabic response
8. view trace without secret leakage

### Journey 2 — Arabic workflow creation
1. enter Arabic instruction
2. platform extracts intent
3. platform proposes workflow
4. user reviews steps
5. connect required integration
6. activate
7. trigger event
8. workflow executes
9. run appears in history

### Journey 3 — Arabic document to action
1. upload PDF
2. parse document
3. inspect extracted text/structure
4. route result into AI step
5. extract required field/decision
6. trigger workflow action

### Journey 4 — Privacy controls
1. owner selects data policy
2. private data remains tenant-scoped
3. telemetry excludes raw sensitive payload
4. improvement data is only collected when explicitly enabled

## 4. Acceptance criteria

### Gateway
- accepts Arabic input
- preserves intent and named entities through configured transformations
- returns provider response in Arabic when Arabic mode is enabled
- never logs raw provider secrets
- tenant A cannot access tenant B traces or provider configuration

### Workflow
- Arabic instruction produces valid structured workflow JSON
- generated workflow can be edited before activation
- failed steps are visible with reason
- retry does not duplicate irreversible actions unless idempotency policy permits

### Documents
- output includes page provenance
- Arabic text order is readable
- parse failures are explicit
- raw file access is tenant-restricted

### Data
- private content is not silently added to learning datasets
- opt-in status is auditable
- anonymous metrics cannot contain direct secrets

## 5. Product success metrics for pilot
- first gateway connection under 10 minutes
- first Arabic workflow under 15 minutes
- >= 95% successful gateway request routing in controlled pilot
- zero cross-tenant data leakage
- zero provider-secret exposure in logs
- measurable Arabic intent accuracy on a curated evaluation set
- measurable OCR/document extraction quality on a curated Arabic test set

## 6. V0.1 exclusions
- custom foundation-model training
- autonomous billing settlement
- government connectors requiring unavailable official access
- unsupported scraping of protected portals
- guaranteed translation/token savings claims
