# CVideo Architecture Mapping

## Strategy
Adopt the OGroup factory incrementally. Existing CVideo UI work is treated as product implementation input, not as permission for a whole-app rewrite.

## Shared Core boundaries
CVideo should consume, not duplicate, OGroup Core capabilities:
- Auth: sessions, login, logout, verification and account workflows
- Tenancy: company/recruiter organization context and tenant-safe queries
- RBAC: candidate, recruiter/company and privileged operational permissions enforced on the server
- Validation: all external payloads validated at API boundaries
- Logging and Audit: sensitive account, company, recruiter and candidate-access actions recorded appropriately
- Database and Repositories: PostgreSQL/Drizzle persistence with tenant ownership where records are company-owned

Product-specific candidate discovery, video profile, saved lists, watch counts and messaging rules stay outside shared Core.

## Product modules
- candidate-profile
- candidate-video
- recruiter-search
- saved-lists
- messaging
- company-account
- company-verification

## Authorization boundaries
Candidate users may manage only their own candidate profile and candidate-owned assets. Recruiters require active company membership and server-side permission checks. Saved lists and recruiter/company-owned records are tenant-scoped. Candidate search/read access must be authorized by API policy; UI visibility is never authorization. A candidate cannot initiate recruiter conversations through a hidden or direct API path if product policy says recruiter initiation only.

## Data ownership
Company/recruiter-owned records use tenant ownership and tenant-filtered repositories. Candidate-owned records use authenticated subject ownership. Any relationship connecting candidate data to a company, such as saved candidates or conversations, must validate both authenticated company context and the target candidate relationship.

## Video
The profile video is capped by product policy at 30 seconds. Upload/link handling is validated server-side. User-facing quality options must not exceed 720p. File/media storage is accessed through a provider abstraction rather than product code depending directly on one vendor.

## Localization
Arabic is default and RTL. English is LTR. API/domain values remain language-neutral where possible; presentation strings live in localization resources.

## Deployment shape
Start as a modular monolith using the factory's web/API/shared-package structure. Do not introduce microservices without an approved ADR and demonstrated need.
