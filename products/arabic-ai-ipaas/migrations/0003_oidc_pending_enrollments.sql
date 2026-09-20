-- Short-lived OIDC enrollment requests. Raw claims are encrypted and removed after approval.

create table if not exists oidc_pending_enrollments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  identity_fingerprint text not null unique,
  sealed_claims text,
  status text not null default 'pending' check (status in ('pending','approved','expired')),
  expires_at timestamptz not null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_oidc_pending_enrollments_expiry
  on oidc_pending_enrollments(status, expires_at);
