# OGroup AI Product Factory — Engineering Constitution v1.0

**Status:** Foundation Standard  
**Owner:** OGroup  
**Applies to:** Human developers, contractors, AI coding assistants, autonomous agents, QA, security and deployment automation.

## Governing Principle

> Build once. Reuse intelligently. Test continuously. Prove before release.

AI may accelerate engineering. AI does not lower the engineering standard.

## 1. Engineering authority

Order of authority:
1. Engineering Constitution
2. Approved Architecture Decision Records
3. Product Requirements
4. Product Architecture
5. Engineering Tasks
6. Implementation

Lower levels cannot silently contradict higher levels.

## 2. Standard stack

Default SaaS stack:
- React + TypeScript + Vite
- Tailwind CSS
- Node.js + TypeScript + Express
- PostgreSQL
- Drizzle ORM
- Zod
- REST + OpenAPI
- Vitest + Supertest + Playwright
- GitHub
- Docker where appropriate

Material deviations require an ADR.

## 3. Architecture consistency

Do not introduce frameworks, databases, ORMs, authentication systems or infrastructure merely because a developer or AI agent prefers them.

## 4. OGroup Core first

Before rebuilding common functionality, determine whether it belongs in OGroup Core. Candidates include authentication, tenants, users, RBAC, validation, audit logs, files, notifications, localization, billing and AI access.

## 5. Modular architecture

Business domains must have clear boundaries. Prefer a modular monolith by default. Microservices require a demonstrated reason.

## 6. Tenant isolation

Tenant-owned data must have explicit ownership. All applicable reads and mutations must enforce authenticated tenant context. Cross-tenant access must be automatically tested.

## 7. Authentication and authorization

Authentication and authorization are separate concerns. Being authenticated never implies permission to perform an action. RBAC must be enforced server-side.

## 8. Least privilege

Users, services and agents receive only the permissions necessary for their work.

## 9. Input is untrusted

Validate forms, API requests, query parameters, files, webhooks, imports, external API responses and AI output before sensitive operations.

## 10. Database integrity

Use foreign keys, unique constraints, NOT NULL constraints, appropriate types, indexes and transactions where applicable. Critical integrity must not depend only on frontend or application validation.

## 11. Migration discipline

Production schema changes use version-controlled migrations. Destructive migrations require explicit human approval and a recovery strategy.

## 12. Financial correctness

Do not use floating point where rounding could affect money. Currency must be explicit. Critical financial operations must be atomic and auditable.

## 13. Auditability

Sensitive security, administrative, permission and financial actions should produce sufficient audit records to establish who did what and when.

## 14. Secrets

Secrets, passwords, tokens and production credentials never enter source code, tests, documentation, prompts or logs.

## 15. Secure failure

Authorization uncertainty defaults to denial. Do not expose stack traces, database errors or unnecessary account information to ordinary users.

## 16. API consistency

Use predictable `/api/v1/...` conventions, consistent success/error envelopes and controlled versioning for breaking changes.

## 17. Documentation is engineering

Significant products maintain requirements, architecture, database, API, RBAC, security, testing and deployment documentation as appropriate.

## 18. Architecture Decision Records

Material architectural decisions require ADRs documenting context, decision, alternatives, consequences and approval.

## 19. Requirements before implementation

Significant work needs an objective, user/workflow, business rules, acceptance criteria, permissions, data requirements and important error cases. Critical missing rules must be surfaced as assumptions, not silently invented.

## 20. Testing is mandatory

Testing is part of implementation. Apply unit, integration, API, authorization, tenant-isolation, E2E, regression and security tests according to risk.

## 21. Definition of Done

A feature is not complete because code exists. Required evidence includes successful build/type checks, applicable tests, authorization and isolation verification, validation/error testing, migration validation, documentation updates, security checks and required human approval.

## 22. AI output is untrusted until verified

AI-generated code must be reviewed, tested and checked against architecture and security requirements. AI confidence is not evidence.

## 23. AI must never fabricate evidence

An agent must never claim it ran tests, accessed files, executed migrations, verified databases, called APIs, produced screenshots or deployed software when it did not. If verification cannot be performed, report **NOT VERIFIED**.

## 24. AI architectural boundaries

Agents may implement approved architecture and propose changes. They may not independently approve material changes involving authentication, authorization, tenant isolation, payments, financial calculations, encryption, production infrastructure, destructive migrations, secrets or shared core libraries.

## 25. Git is the engineering record

Normal work follows Issue → Branch → Implementation → Tests → Pull Request → Review → Merge. Avoid uncontrolled direct production changes.

## 26. Acceptance criteria

Every significant task must define measurable completion criteria, security requirements, test requirements and dependencies.

## 27. CI is an independent judge

Required CI gates eventually include install, lint, type checking, build, tests, security checks and migration validation. Failed required gates block merge.

## 28. Production requires human authority

High-impact operations require human approval, including first production deployment, destructive migrations, security architecture changes, payment configuration, major permission changes, secret rotation and irreversible data operations.

## 29. Observability and recovery

Production systems require appropriate structured logging, error monitoring, health checks and backup/recovery procedures. Important restoration processes must be testable.

## 30. Provider independence

AI-enabled products should use an OGroup AI Gateway where practical rather than tightly coupling business code to a specific model/provider. Track AI cost, latency, failures and quality.

## 31. AI evaluation

Important AI capabilities require repeatable evaluation cases for accuracy, relevance, Arabic/English performance, structured outputs, tool use and failure handling.

## 32. Arabic is first-class

MENA products must support Arabic/RTL as a first-class design and engineering requirement where applicable, not as a late translation layer.

## 33. Server owns critical business rules

Web and mobile should share defined API contracts. Critical business logic belongs on trusted server-side components.

## 34. Simplicity wins

Complexity must purchase measurable value. Do not introduce distributed infrastructure merely for sophistication.

## 35. Privacy and data minimization

Collect only data required for legitimate functionality and define appropriate access, retention and deletion behavior for sensitive information.

## 36. Incidents improve the factory

Important incidents should result in root-cause analysis, correction, regression protection and reusable engineering lessons.

## 37. Every product improves the factory

After each product or major feature, identify reusable components, tests, security patterns, UI components, workflows, agent knowledge and documentation that should improve the shared factory.

## Final principle

**AI creates speed. Engineering creates trust. Reuse creates scale. Human accountability remains in control.**

Exceptions to this Constitution require an approved Architecture Decision Record.
