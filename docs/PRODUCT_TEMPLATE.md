# OGroup SaaS Product Template v0.1

This template is the governed starting point for new OGroup SaaS products.

## Product input

Every product begins with:

- Product name
- Market
- Industry
- Platforms: web, API, mobile
- Languages: Arabic and/or English
- Default language

Use `defineProduct()` from `@ogroup/product-template` to validate this contract.

## Standard shape

```text
/apps
  /web
  /api
/packages
  /product-template
  /auth
  /tenancy
  /rbac
  /validation
  /logging
  /audit
  /database
  /repositories
/modules
  /example-resource
/docs
/tests
/infrastructure
```

## Core integration rule

Products consume OGroup Core. They do not fork or reimplement authentication, tenancy, RBAC, audit, validation, session security, or account lifecycle rules.

## Tenant isolation example

`modules/example-resource` demonstrates the mandatory query invariant:

```text
resource id + authenticated tenant id
```

A record identifier alone never authorizes access.

## Localization

Arabic and English are first-class. Arabic defaults to RTL and English to LTR. Product UI must preserve semantic layout in both directions.

## Bootstrap checklist

1. Define product metadata.
2. Confirm approved architecture and stack.
3. Select required OGroup Core packages.
4. Add product modules under `/modules`.
5. Make every tenant-owned record explicitly tenant-scoped.
6. Define permissions and server-side authorization.
7. Add Arabic/English strings from day one.
8. Add acceptance criteria and tests before implementation is called complete.
9. Run the Engineering Quality Gate.
10. Merge only when evidence is green.

## Boundary

The template must remain generic. CVideo, OSales, Doors, Clinic, or other vertical-specific workflows belong in product modules, not shared Core or this template.
