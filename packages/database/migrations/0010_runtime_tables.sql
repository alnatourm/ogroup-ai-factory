CREATE TABLE IF NOT EXISTS factory_runs (
  id text PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  issue_number integer NOT NULL UNIQUE,
  name text NOT NULL,
  intent text NOT NULL,
  target_repository text NOT NULL,
  priority text NOT NULL DEFAULT 'Normal',
  market text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,target_repository)
);
CREATE INDEX IF NOT EXISTS factory_runs_tenant_created_idx ON factory_runs(tenant_id,created_at DESC);

CREATE TABLE IF NOT EXISTS factory_runtime_config (
  tenant_id text PRIMARY KEY,
  config_json text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS factory_runtime_usage (
  id bigserial PRIMARY KEY,
  tenant_id text NOT NULL,
  project_id text,
  source text NOT NULL CHECK (source IN ('ogroup','customer')),
  provider text,
  model text,
  input_tokens integer NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens integer NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cost_micros bigint NOT NULL DEFAULT 0 CHECK (cost_micros >= 0),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS factory_runtime_usage_tenant_time ON factory_runtime_usage(tenant_id,occurred_at DESC);

CREATE TABLE IF NOT EXISTS factory_byok_vault (
  tenant_id text NOT NULL,
  credential_ref text NOT NULL,
  provider text NOT NULL,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  tag text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,credential_ref)
);
