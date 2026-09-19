# Factory Integration Review

## Product

Arabic AI iPaaS Integration v0.1

## Review status

**BLOCKED_PENDING_GREEN_QUALITY_GATE**

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

- The newly generated workflow/data-policy/document/usage services are not yet fully exposed through `createApp` routes. They are service/repository building blocks, not yet a complete live API integration.
- Production PostgreSQL bootstrap/wiring must still prove that the new repositories are instantiated and migrations match the runtime schema.
- SSRF protection currently blocks obvious unsafe literal destinations, but DNS resolution/private-address verification is not yet a complete production-grade SSRF defense.
- Document OCR remains intentionally not configured and must not be presented as processed successfully.
- Workflow actions that need external systems remain intentionally disabled until a real adapter exists.
- Frontend wiring for the newly generated workflow, data-policy, document, and usage services still needs completion.

## Merge rule

Do not merge PR #66 until the dedicated integration quality gate is green. Even with a green code gate, this PR should remain a **partial integration slice** unless the missing API route/bootstrap wiring is completed or explicitly deferred into the next integration PR.
