# Arabic AI iPaaS Web

Arabic-first RTL React + TypeScript frontend for the Arabic AI iPaaS product.

## Routes

- workspace-onboarding
- provider-connections
- gateway-playground
- workflow-builder
- workflow-runs
- document-intelligence
- usage-dashboard
- data-policy

## Development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

Runtime API configuration is read from Vite environment variables. Never hard-code provider or platform secrets in client source.
