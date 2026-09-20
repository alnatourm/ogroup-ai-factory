# Arabic AI iPaaS OIDC activation runbook

Status: provider-neutral foundation. Activation is intentionally a controlled operator action.

## Security boundary

- Login never creates a user, workspace, membership, or identity link.
- An exact issuer and subject must be linked to one active user.
- The user must have exactly one active workspace membership.
- Conflicting identity links and ambiguous users fail closed.
- Raw email addresses and OIDC subjects are not written to provisioning logs or audit metadata.
- OIDC credentials belong in the deployment secret store, never GitHub, tickets, or chat.

## 1. Register a confidential OIDC application

Use an OpenID Connect provider that supports Authorization Code flow and PKCE S256.

Configure the exact redirect URI:

```text
https://arabic-ai-ipaas-api-production.up.railway.app/auth/callback
```

Request only:

```text
openid email profile
```

Do not enable implicit flow. Do not add wildcard redirect URIs.

## 2. Configure deployment secrets

Set these directly in Railway for the API service:

- `OIDC_ISSUER_URL`: exact HTTPS issuer from provider discovery
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `PUBLIC_BASE_URL=https://arabic-ai-ipaas-api-production.up.railway.app`
- `OIDC_SESSION_SECRET`: independently generated high-entropy value of at least 32 characters

All five values are required together. Partial configuration stops the service instead of silently disabling authentication.

After deployment, an anonymous request to `/auth/status` must return:

```json
{"configured":true,"authenticated":false}
```

## 3. Preview an explicit identity link

Run the built command only in a trusted operator shell with secure database access. Provide values through the process environment; do not commit them to a file.

Required variables:

- `DATABASE_URL`
- `OIDC_PROVISION_ISSUER`: must exactly match the configured issuer
- `OIDC_PROVISION_SUBJECT`: immutable OIDC `sub` value for the person
- `OIDC_PROVISION_EMAIL`
- `OIDC_PROVISION_WORKSPACE_SLUG`
- `OIDC_PROVISION_ROLE`
- optional `OIDC_PROVISION_DISPLAY_NAME`

Build, then preview:

```sh
npm run build --workspace @ogroup/arabic-ai-ipaas-api
npm run provision:oidc --workspace @ogroup/arabic-ai-ipaas-api
```

Without confirmation, the command performs validation only and prints fingerprints. It does not connect to the database or write data.

## 4. Apply after independent review

Verify the workspace slug, role, and all three fingerprints with a second operator. Then set this exact process-only confirmation:

```text
OIDC_PROVISION_CONFIRM=PROVISION_IDENTITY
```

Run the same command. It applies one database transaction that:

1. requires an active workspace;
2. creates or reuses one active user;
3. creates or updates the explicit workspace membership;
4. creates the issuer and subject identity link;
5. records a redacted `auth.oidc.identity_provisioned` audit event;
6. rolls back everything if any conflict occurs.

The command is idempotent for the same identity, user, workspace, and role.

## 5. Acceptance checks

- `GET /auth/status` reports configured but unauthenticated before login.
- `GET /auth/login` redirects only to the discovered provider authorization endpoint.
- Successful login returns to `/#/workspace-onboarding`.
- The session cookie is `Secure`, `HttpOnly`, `SameSite=Lax`, and host-only.
- A non-provisioned identity receives `OIDC_MEMBERSHIP_NOT_PROVISIONED`.
- Protected mutations reject a missing or incorrect `Origin`.
- Removing or disabling the user, workspace, membership, or identity link revokes the browser session on its next API request.

## Rollback

If activation fails, remove all five OIDC deployment variables together and redeploy. The platform returns to the explicit disabled state:

- `/auth/status`: configured false
- `/auth/login`: `503 OIDC_NOT_CONFIGURED`
- protected APIs: still locked

Do not delete identity or membership records as an emergency response. Disable the user or workspace first, preserve the audit trail, and investigate.
