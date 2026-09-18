# Arabic AI iPaaS — Backend Capability Gate v0.2

Status: READY_FOR_VERIFICATION

This gate deliberately distinguishes **scaffold present** from **capability proven**.

## Capabilities implemented

1. Production startup fails closed when `PROVIDER_SECRET_MASTER_KEY` is absent.
2. Bearer API-key authentication is supported through an `ApiKeyVerifier` contract.
3. PostgreSQL API-key verification hashes raw keys before lookup and ignores revoked/expired keys.
4. Provider connection persistence has a PostgreSQL repository with every read/delete scoped by `workspace_id`.
5. Provider credentials are encrypted before repository persistence and redacted from API responses.
6. OpenAI-compatible BYOAI calls use a real outbound HTTPS request contract and pass the decrypted key only in the upstream Authorization header.
7. Non-HTTPS provider base URLs are rejected by the production adapter.
8. In-memory repositories and insecure context headers are test-only seams, not production defaults.

## Capability proof required before BACKEND_PASS

- Typecheck/lint/tests green.
- Bearer authentication test passes.
- Cross-workspace provider isolation test passes.
- Secret redaction test passes.
- Missing master-key startup test passes.
- OpenAI-compatible upstream request contract test passes.
- HTTP provider URL rejection test passes.
- PostgreSQL migration and repository integration must still be exercised against a real PostgreSQL service before deployment.

## Not yet proven

- Live call to a real external provider credential.
- Real PostgreSQL integration in CI/runtime.
- Gemini and Anthropic adapters.
- Arabic normalization/entity masking.
- Gateway trace persistence.
- Workflow execution.
- Document ingestion.

The Factory must not mark Backend PASS until the first two items above are proven in a controlled environment.
