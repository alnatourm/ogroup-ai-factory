# CVIDEO Factory Run v1

## Ownership
- Product Owner: Mohammad
- Product Manager: ChatGPT
- Architect: ChatGPT
- Factory Manager: ChatGPT
- Design Tool/Agent: Google Stitch
- Builder: Google AI Studio initially; replaceable by other approved coding agents
- QA Agent: OGroup Factory QA role
- Security Agent: OGroup Factory Security role
- Documentation Agent: OGroup Factory Documentation role
- Release Agent: OGroup Factory Release role

## Governing sequence
Idea -> Product Contract -> Design Brief -> Design Review -> Architecture Contract -> Builder Package -> Source Delivery -> QA -> Security -> Documentation -> Release Evidence -> Product Owner Approval -> Merge/Release

## Product-owner responsibilities
The Product Owner supplies the business idea, answers business questions, approves material product/design choices, and gives final approval for sensitive or release decisions.

The Product Owner is not expected to define code, database structures, APIs, testing strategy, CI, or security implementation.

## Product Manager responsibilities
- turn business idea into a frozen product contract
- define actors, journeys, business rules, inclusions/exclusions, and acceptance criteria
- prevent design/build tools from silently changing product behavior
- translate technical findings back into business impact

## Architect responsibilities
- define approved stack and system boundaries
- define web/mobile/API/database/storage/integration structure
- reuse Factory Core/shared capabilities where appropriate
- document security-sensitive boundaries before implementation

## Design responsibilities
Google Stitch or another approved design tool receives PRODUCT.md + DESIGN_BRIEF.md. It may propose layouts and visual solutions, but may not redefine business rules.

## Builder responsibilities
Builder receives the frozen Product Contract, approved design, architecture contract, and acceptance criteria. Builder implements the source and must not claim completion without evidence.

## QA Agent contract
QA operates independently from the Builder. It reads the frozen product requirements and attempts to disprove completion.

Required output:
- PASS
- FAIL
- NOT VERIFIED

QA must test critical business rules, responsive behavior, localization, API behavior, error cases, and release acceptance criteria.

## Security Agent contract
Security independently reviews authentication, authorization, tenant isolation, IDOR, secrets, file/video upload boundaries, admin access, input validation, and session behavior.

Security findings are blocking when they affect a product boundary or expose data/privilege.

## Documentation Agent contract
Documentation must describe actual implementation only. It keeps product, architecture, API, database, security, deployment, and testing documents aligned with source.

## Release Agent contract
Release Agent checks CI and required evidence. It does not accept self-reported builder confidence as proof.

No release may be called VERIFIED unless required checks actually ran and passed.

## Human approval gate
Explicit Product Owner approval is required before merging material changes to authentication, authorization/RBAC, tenant isolation, payments, encryption/security architecture, production infrastructure, destructive migrations, secrets, shared Core, or other irreversible/high-impact operations.

## Current CVIDEO state
Product discovery restarted from zero after discarding the prior generated source. The current source of truth is PRODUCT.md on this Factory branch. No application source is accepted yet.
