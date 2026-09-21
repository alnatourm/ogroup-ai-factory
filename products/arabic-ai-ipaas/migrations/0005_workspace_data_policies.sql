-- Persist workspace-scoped data governance policy.
-- Defaults preserve the product's private-data-by-default posture.

create table if not exists workspace_data_policies (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  data_zone text not null default 'PRIVATE'
    check (data_zone in ('PRIVATE','ANONYMOUS_TELEMETRY','IMPROVEMENT_OPT_IN')),
  pii_masking_enabled boolean not null default true,
  retention_days integer not null default 90
    check (retention_days >= 0),
  audit_logging_enabled boolean not null default true,
  strict_zdr_level integer not null default 4
    check (strict_zdr_level between 0 and 4),
  dual_admin_approval_required boolean not null default true,
  opt_in_confirmed boolean not null default false,
  rights_basis text,
  updated_at timestamptz not null default now(),
  check (
    data_zone <> 'IMPROVEMENT_OPT_IN'
    or (opt_in_confirmed = true and rights_basis is not null and length(trim(rights_basis)) > 0)
  )
);
