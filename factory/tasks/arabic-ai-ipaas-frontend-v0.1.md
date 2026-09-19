# Arabic AI iPaaS Frontend Build v0.1

## Factory assignment

You are the Frontend Build Agent for OGroup AI Factory.

Build the first production frontend for the Arabic AI iPaaS product inside:

`/workspace/ogroup-ai-factory/apps/arabic-ai-ipaas-web`

Do not change the approved product intent, architecture, security boundaries, or backend contracts unless required to make the frontend compile. When a backend capability is not implemented yet, isolate it behind a typed API client and a clearly marked non-production placeholder. Never invent production credentials or expose secrets.

## Source branch

The mounted repository starts from the default branch. Before building:

```bash
cd /workspace/ogroup-ai-factory
git fetch origin product/arabic-ai-ipaas-database-v0.1
git checkout -B product-build origin/product/arabic-ai-ipaas-database-v0.1
```

Read all product material under:

- `products/arabic-ai-ipaas/`
- `factory/` where relevant
- `apps/arabic-ai-ipaas-api/`
- `tests/arabic-ai-ipaas-*.test.ts`

Treat the backend API and architecture documents as contracts.

## Design contract

Stitch project ID: `13642085509702935579`

The Design Review Agent returned `DESIGN_PASS` with score 100 for all eight expected screens. All eight were verified as Arabic, RTL, interactive, responsive, and free of exposed secrets.

Build all eight routes:

1. `workspace-onboarding` — Workspace Onboarding
2. `provider-connections` — AI Provider Connections
3. `gateway-playground` — Arabic AI Gateway Playground
4. `workflow-builder` — Arabic Workflow Builder
5. `workflow-runs` — Workflow Run History
6. `document-intelligence` — Arabic Document Intelligence
7. `usage-dashboard` — Usage and Reliability Dashboard
8. `data-policy` — Data Policy and Privacy

Use these approved Stitch HTML references when reachable:

- Workspace Onboarding: https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzk4NTkwMDc4YTE1NTQ3MTVhZWVhYTcxYTg1OTE3OWQ3EgsSBxCty7X6kggYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzY0MjA4NTUwOTcwMjkzNTU3OQ&filename=&opi=96797242
- AI Provider Connections: https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzlkMzI0ODIzZjUyNjQ1Zjg4ZTEwNzdkNjZhMzUzOGZkEgsSBxCty7X6kggYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzY0MjA4NTUwOTcwMjkzNTU3OQ&filename=&opi=96797242
- Gateway Playground: https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2I0Njk0OTY5OTZiMTRiNGFhOTg4ZTNkNGY2NDMwNmE2EgsSBxCty7X6kggYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzY0MjA4NTUwOTcwMjkzNTU3OQ&filename=&opi=96797242
- Workflow Builder: https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzVjZmFiNjRiYWFjZDQ3MzE4ZTljZjI5NTU1YjBlNDYxEgsSBxCty7X6kggYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzY0MjA4NTUwOTcwMjkzNTU3OQ&filename=&opi=96797242
- Workflow Runs: https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2UwMzhjZWViMjgwOTRlOTdiZDdmYjFhNmI4NDM5NmY5EgsSBxCty7X6kggYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzY0MjA4NTUwOTcwMjkzNTU3OQ&filename=&opi=96797242
- Document Intelligence: https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzVmYjEwYWY1ZGYxMTRiN2JhODVlOGNmNGFjNTVlZjliEgsSBxCty7X6kggYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzY0MjA4NTUwOTcwMjkzNTU3OQ&filename=&opi=96797242
- Usage Dashboard: https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzQ5Mzk3OGNhOWQ4ODRjZThiM2UyMWNhMGFjN2ZlZWZkEgsSBxCty7X6kggYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzY0MjA4NTUwOTcwMjkzNTU3OQ&filename=&opi=96797242
- Data Policy: https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2QzODFkN2ZmMTY0NTQ1MmFhY2JiNGIzYWQ2OWZiMjdmEgsSBxCty7X6kggYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzY0MjA4NTUwOTcwMjkzNTU3OQ&filename=&opi=96797242

If a Stitch reference is unavailable, do not stall. Continue from the approved route names, product requirements, architecture, and Arabic-first design language.

## Frontend requirements

- React + TypeScript + Vite.
- Arabic-first RTL from the root document.
- English-ready i18n structure without duplicating whole pages.
- Reusable app shell, navigation, form controls, cards, status badges, tables, empty states, loaders, errors, confirmation states, and accessible dialogs.
- Responsive desktop/tablet/mobile behavior.
- No secret values in client source, local storage fixtures, logs, screenshots, or test snapshots.
- Typed API client for the Arabic AI iPaaS control API.
- Bearer API-key authentication support via runtime configuration, never hard-coded.
- Workspace-aware requests.
- Provider connections UI must never display stored provider secrets after submission.
- Gateway playground must support Arabic messages and render an OpenAI-compatible response shape.
- Workflow builder should implement a usable first interaction model, not a static picture.
- Document Intelligence must support file-selection UX and metadata/extraction state even if the server endpoint is still a typed placeholder.
- Usage dashboard should expose useful reliability/usage cards with typed loading/error/empty states.
- Data Policy must clearly represent PRIVATE, ANONYMOUS_TELEMETRY, and IMPROVEMENT_OPT_IN concepts from the database design.

## Quality requirements

Inside the generated web package, provide working scripts for:

- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm test`

Run them before finishing and repair failures.

Do not disable TypeScript strictness or ESLint rules merely to make checks green.

## Required deliverables

Create:

- `apps/arabic-ai-ipaas-web/package.json`
- application source
- route structure for all eight approved screens
- typed API client layer
- component tests for meaningful UI behavior
- `apps/arabic-ai-ipaas-web/README.md`
- `apps/arabic-ai-ipaas-web/BUILD_REPORT.md`

BUILD_REPORT.md must state:
- what was built
- what backend endpoints are live-wired
- what remains placeholder because backend capability does not yet exist
- tests/checks run and results
- known limitations
- files/routes created

Do not modify unrelated products.

At the end, reply with the exact marker:

`FRONTEND_BUILD_COMPLETED`
