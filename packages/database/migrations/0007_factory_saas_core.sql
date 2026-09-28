CREATE TABLE factory_projects (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  intent text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('managed','custom')),
  status text NOT NULL DEFAULT 'IDEA',
  target_repository text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);

CREATE INDEX factory_projects_tenant_updated_idx ON factory_projects (tenant_id, updated_at DESC);

CREATE TABLE factory_project_brain (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  section text NOT NULL CHECK (section IN (
    'requirements','business_rules','architecture','decisions','approved_designs',
    'tasks','known_issues','testing_evidence','deployment_history'
  )),
  content_json text NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, project_id, section),
  FOREIGN KEY (tenant_id, project_id) REFERENCES factory_projects(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE factory_agents (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ogroup','external','custom','webhook','mcp')),
  endpoint_ref text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE factory_providers (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL,
  credential_ref text,
  base_url text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE factory_models (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES factory_providers(id) ON DELETE CASCADE,
  model_key text NOT NULL,
  display_name text NOT NULL,
  capabilities_json text NOT NULL DEFAULT '[]',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_id, model_key)
);

CREATE TABLE factory_role_assignments (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES factory_projects(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  agent_id uuid NOT NULL REFERENCES factory_agents(id) ON DELETE RESTRICT,
  model_id uuid REFERENCES factory_models(id) ON DELETE SET NULL,
  fallback_model_id uuid REFERENCES factory_models(id) ON DELETE SET NULL,
  budget_limit_micros bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, project_id, role_key)
);

CREATE TABLE factory_usage_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES factory_projects(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('ogroup','customer')),
  provider text,
  model text,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  cost_micros bigint NOT NULL DEFAULT 0,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX factory_usage_tenant_time_idx ON factory_usage_events (tenant_id, occurred_at DESC);
