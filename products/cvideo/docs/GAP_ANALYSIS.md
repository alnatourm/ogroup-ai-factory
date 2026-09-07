# CVideo Factory Gap Analysis

## Known current-state strengths
- React/Vite project structure exists.
- i18n locale structure and design tokens exist.
- shared Button, TextInput, PasswordInput and Checkbox components exist.
- Login, Candidate Registration and Company Registration routes exist.
- React Router is integrated.
- Tailwind v3 is currently the working styling baseline.
- the current frontend build has been reported successful.

## Gaps to close before factory-compliant product status
### Product correctness
Existing/reference screens must be checked for prohibited job-board, ATS, AI-scoring, social-feed, interview-scheduling, quota and 1080p concepts. Candidate and recruiter navigation must match the canonical product definition.

### Backend contract
The pilot has not yet proven that the current CVideo implementation uses OGroup Core Auth, Tenancy, RBAC, Validation, Logging, Audit, Database and Repository packages. This is NOT VERIFIED and must be mapped before implementation migration.

### Authorization
Server-side enforcement for candidate ownership, recruiter company membership, saved lists, search access and recruiter-only chat initiation is NOT VERIFIED.

### Tenant isolation
Company-owned records require explicit tenant ownership and cross-tenant tests. Existing implementation compliance is NOT VERIFIED.

### Media
30-second enforcement, 720p policy, upload/link validation and provider abstraction are NOT VERIFIED.

### Localization/accessibility
Arabic RTL and English LTR scaffolding exists conceptually, but complete page coverage, responsiveness and accessibility are NOT VERIFIED.

### Testing
Factory-level unit, integration, tenant-isolation, RBAC and end-to-end coverage for CVideo product rules is not yet demonstrated.

## Decision
Do not rewrite CVideo wholesale. Preserve compliant UI and product work, then migrate boundaries slice-by-slice behind tested contracts.
