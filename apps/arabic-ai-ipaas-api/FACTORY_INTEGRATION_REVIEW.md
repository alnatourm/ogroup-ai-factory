# Factory Integration Review

## Product

Arabic AI iPaaS Integration v0.1

## Review status

**MERGE_READY_WHEN_CURRENT_HEAD_GATES_ARE_GREEN**

The Antigravity integration slice contains useful backend building blocks, but it was not ready to merge as delivered.

## Blocking findings found by Factory review

1. **Operational workflow steps fabricated success.**
   - `manager_approval`, `notification`, `archive`, AI-transform, and HTTP steps returned successful outputs without actually executing those actions.
   - Repaired: unconfigured operational steps now fail closed with `STEP_EXECUTOR_NOT_CONFIGURED`.
   - Trigger, deterministic condition evaluation, and real field masking remain supported in the narrow v0.1 executor.

2. **PII masking reported hard-coded masked fields and counts.**
   - Repaired: masking now operates on actual supported sensitive input keys and reports the actual count.

3. **Condition evaluation silently invented default business values.**
   - Repaired: condition execution now requires real numeric inputs/configuration and fails when required values are absent or operators are unsupported.

4. **Provider URL validation existed but was not enforced by the live provider-creation endpoint.**
   - Repaired: provider creation now invokes `validateProviderBaseUrl` before persisting a connection.

5. **No integration-specific tests were delivered.**
   - Repaired: Factory added tests for explicit data-policy opt-in, tenant isolation, truthful document state, workflow fail-closed behavior, deterministic masking, and provider URL safety.

## Important remaining limitations

- Workflow CRUD/manual runs, data-policy, document registration/extraction status, and usage summary are now exposed through authenticated, tenant-scoped `createApp` routes.
- A production PostgreSQL application bootstrap now instantiates every repository and the API-key verifier. Deployment must still run the approved migrations before serving traffic.
- SSRF protection currently blocks obvious unsafe literal destinations, but DNS resolution/private-address verification is not yet a complete production-grade SSRF defense.
- Document OCR remains intentionally not configured and must not be presented as processed successfully.
- Workflow actions that need external systems remain intentionally disabled until a real adapter exists.
- Frontend wiring for the newly generated workflow, data-policy, document, and usage services still needs completion.

## Merge rule

Do not merge PR #66 until the dedicated integration quality gate is green. This PR is a narrow v0.1 integration slice. Merge only when backend verification, integration quality, and frontend quality are green for the exact current head.
