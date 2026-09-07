# OGroup Product Bootstrap Generator v0.1

The generator converts a small product definition into a deterministic governed bootstrap plan.

## Inputs
- product name
- market or region
- industry
- target platforms
- supported languages
- default language
- short description

## Outputs
- normalized product configuration and safe slug
- required workspaces
- explicit OGroup Core integration list
- security checklist
- test checklist
- starter `product.json`
- starter `README.md`
- starter `docs/product/PRODUCT.md`
- starter `docs/product/REQUIREMENTS.md`

## Boundaries
The generator does not deploy, create secrets, change the approved stack, or copy product-specific business logic into OGroup Core.

Generated products must reuse OGroup Core authentication, tenancy, RBAC, validation, logging, audit, database, and repository boundaries.

The same normalized input must generate the same plan and starter content so humans and agents can review reproducible output.
