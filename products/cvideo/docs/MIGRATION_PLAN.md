# CVideo Incremental Factory Adoption Plan

## Rule
No blind rewrite. Each slice must preserve working product behavior, remove prohibited behavior, introduce factory boundaries and prove the result with tests.

## Slice 1: Freeze product contract
Use PRODUCT.md as the canonical behavior. Remove or quarantine reference screens and routes that contradict it. Verify candidate and recruiter navigation.

## Slice 2: Authentication and account onboarding
Map login, candidate registration and company registration to OGroup Core Auth/account workflows. Keep company verification country-neutral with Country and Commercial Registration Number.

Human gate: authentication and account-security changes.

## Slice 3: Identity, company tenancy and RBAC
Model candidate identity separately from recruiter company membership. Apply server-side permissions and tenant-safe repositories for company-owned data. Add cross-tenant and IDOR tests.

Human gate: authorization and tenant isolation.

## Slice 4: Candidate profile and 30-second video
Migrate profile fields, skills, preferred job titles, optional CV and video upload/link. Enforce 30-second and 720p policies at trusted boundaries.

## Slice 5: Recruiter discovery and saved lists
Implement/search candidate professional fields without AI face/personality/voice scoring. Saved lists are company/tenant-owned and server-authorized.

## Slice 6: Messaging
Recruiter/company initiates the conversation. Candidate can respond after initiation. Test direct-API attempts to bypass this rule.

## Slice 7: Localization, accessibility and responsive verification
Complete Arabic RTL and English LTR coverage, keyboard/accessibility checks and responsive page verification.

## Slice 8: Release evidence
Run CI, unit/integration/e2e/security tests, document remaining NOT VERIFIED items, complete human gates, and produce rollback/recovery notes before production approval.
