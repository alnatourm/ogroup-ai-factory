# Arabic AI iPaaS Frontend Build Report

## Status

PARTIAL_READY pending Factory frontend quality verification.

## Built

- React + TypeScript + Vite application shell.
- Arabic-first RTL layout with English-ready i18n structure.
- Eight approved routes from the Stitch design contract.
- Shared UI components for cards, inputs, buttons, dialogs, tables, loaders, errors, badges, and empty states.
- Typed API client layer.
- Provider connection UX that models stored credentials as redacted state.
- Arabic gateway playground.
- Workflow builder and workflow run views.
- Document intelligence upload/extraction UX.
- Usage/reliability dashboard.
- Data policy screen representing PRIVATE, ANONYMOUS_TELEMETRY, and IMPROVEMENT_OPT_IN.

## Live-wired backend capabilities

The client attempts to call:
- `GET /health`
- `GET /v1/provider-connections`
- `POST /v1/provider-connections`
- `DELETE /v1/provider-connections/:id`
- `POST /v1/chat/completions`

## Placeholder capabilities

Workflow persistence/execution, document processing, usage analytics, and data-policy updates still use non-production fallback behavior where the backend capability is not yet available.

## Required verification

Factory must run:
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Known limitations

- Current build contains simulated/fallback data for unfinished backend slices.
- Provider secret handling is client-side redaction only until end-to-end backend verification covers the full UI flow.
- Visual fidelity still requires Design Review against approved Stitch output.
- Production auth/session flow is not yet complete.
