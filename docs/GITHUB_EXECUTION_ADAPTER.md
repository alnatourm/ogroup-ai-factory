# GitHub Execution Adapter v0.1

This adapter is the first controlled mutation boundary in the OGroup AI Product Factory.

It accepts validated task definitions and an explicit approval flag, then creates GitHub issues through an injected issue port. Deterministic planning remains separate from external mutation.

## Safety rules
- no issue creation without explicit approval
- issue creation only; no merge, deployment, secrets, branch protection or production authority
- preserve emitter titles, bodies, labels and human-gate markers
- append concrete dependency references when prior issues have been created
- stop on mutation failure and return partial progress rather than silently skipping work

## Testing
Tests must use a fake/injected GitHub issue port. Live GitHub mutations are adapter integration concerns, not unit-test behavior.
