-- Provider-neutral OpenID Connect identity links.
-- Membership remains explicit and tenant-scoped; login never auto-provisions access.

create table if not exists oidc_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  issuer text not null,
  subject text not null,
  created_at timestamptz not null default now(),
  unique (issuer, subject),
  unique (user_id, issuer)
);

create index if not exists idx_oidc_identities_user on oidc_identities(user_id);
