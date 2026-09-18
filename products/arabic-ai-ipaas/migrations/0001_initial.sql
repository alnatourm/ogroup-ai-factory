-- Arabic AI iPaaS database v0.1
-- PostgreSQL 16+

create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  status text not null default 'active' check (status in ('active','invited','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('workspace_owner','workspace_admin','developer','automation_builder','viewer','partner_admin')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index if not exists idx_workspace_members_workspace_user on workspace_members(workspace_id,user_id);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes jsonb not null default '[]'::jsonb,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_api_keys_workspace on api_keys(workspace_id);

create table if not exists provider_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider_type text not null,
  name text not null,
  base_url text,
  model_default text,
  secret_ciphertext bytea,
  secret_ref text,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','disabled','error')),
  last_tested_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (secret_ciphertext is not null or secret_ref is not null)
);
create index if not exists idx_provider_connections_workspace_status on provider_connections(workspace_id,status);

create table if not exists gateway_routes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  priority integer not null default 100,
  match_rules jsonb not null default '{}'::jsonb,
  provider_connection_id uuid not null references provider_connections(id),
  model_name text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_gateway_routes_workspace_priority on gateway_routes(workspace_id,enabled,priority);

create table if not exists glossaries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  locale text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists glossary_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  glossary_id uuid not null references glossaries(id) on delete cascade,
  source_term text not null,
  target_term text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (glossary_id, source_term)
);
create index if not exists idx_glossary_entries_workspace_glossary on glossary_entries(workspace_id,glossary_id);

create table if not exists workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  schema_version text not null default 'workflow-json-v1',
  definition jsonb not null,
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  version integer not null default 1,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_workflows_workspace_status_updated on workflows(workspace_id,status,updated_at desc);

create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  workflow_id uuid not null references workflows(id) on delete cascade,
  trigger_type text not null,
  status text not null check (status in ('queued','running','succeeded','failed','cancelled')),
  input jsonb,
  output jsonb,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_workflow_runs_workspace_workflow_started on workflow_runs(workspace_id,workflow_id,started_at desc);

create table if not exists workflow_step_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  workflow_run_id uuid not null references workflow_runs(id) on delete cascade,
  step_key text not null,
  step_type text not null,
  status text not null check (status in ('queued','running','succeeded','failed','skipped')),
  input jsonb,
  output jsonb,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_workflow_step_runs_parent on workflow_step_runs(workspace_id,workflow_run_id);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  filename text not null,
  media_type text not null,
  object_key text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 text,
  status text not null default 'uploaded' check (status in ('uploaded','processing','ready','failed','deleted')),
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_documents_workspace_created on documents(workspace_id,created_at desc);

create table if not exists document_extractions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  schema_version text not null default 'document-extraction-json-v1',
  engine_version text,
  markdown text,
  structured_json jsonb,
  language text,
  page_count integer,
  status text not null check (status in ('processing','ready','failed')),
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists idx_document_extractions_workspace_document on document_extractions(workspace_id,document_id,created_at desc);

create table if not exists gateway_traces (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider_connection_id uuid references provider_connections(id),
  route_id uuid references gateway_routes(id),
  request_id text,
  detected_language text,
  detected_dialect text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  status text not null check (status in ('succeeded','failed')),
  error_code text,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_gateway_traces_workspace_created on gateway_traces(workspace_id,created_at desc);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  actor_user_id uuid references users(id),
  actor_type text not null,
  action text not null,
  entity_type text,
  entity_id text,
  request_id text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_events_workspace_created on audit_events(workspace_id,created_at desc);

create table if not exists improvement_examples (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  data_zone text not null check (data_zone in ('PRIVATE','ANONYMOUS_TELEMETRY','IMPROVEMENT_OPT_IN')),
  source_type text not null,
  source_id text,
  rights_basis text,
  payload jsonb,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  check (data_zone <> 'IMPROVEMENT_OPT_IN' or rights_basis is not null)
);
create index if not exists idx_improvement_examples_workspace_zone on improvement_examples(workspace_id,data_zone,created_at desc);
