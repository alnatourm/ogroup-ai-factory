# OGroup Definition of Done

A feature is complete only when all applicable evidence exists.

## Product
- [ ] Requirements satisfied
- [ ] Acceptance criteria satisfied
- [ ] Important assumptions resolved or documented

## Engineering
- [ ] Approved architecture followed
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] No unnecessary duplication of OGroup Core functionality

## Testing
- [ ] Unit tests pass where applicable
- [ ] Integration tests pass where applicable
- [ ] E2E tests pass for critical user flows where applicable
- [ ] Regression coverage added for fixed defects where appropriate

## Security
- [ ] Authentication behavior tested where applicable
- [ ] Authorization/RBAC tested where applicable
- [ ] Tenant isolation tested where applicable
- [ ] Input validation and error cases tested
- [ ] No secrets committed
- [ ] No unresolved critical security defect

## Database
- [ ] Schema constraints reviewed
- [ ] Migration included where required
- [ ] Migration tested
- [ ] Destructive changes explicitly approved

## Documentation
- [ ] Product/API/architecture/security documentation updated where required
- [ ] ADR added for material architectural decisions

## Evidence
- [ ] Verification commands and results recorded
- [ ] Anything not tested is explicitly marked `NOT VERIFIED`

## Release
- [ ] Required human review complete
- [ ] Required CI gates pass
- [ ] Deployment/recovery implications understood
