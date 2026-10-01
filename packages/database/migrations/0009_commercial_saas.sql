CREATE TABLE factory_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  monthly_price_cents integer NOT NULL CHECK (monthly_price_cents >= 0),
  included_projects integer NOT NULL CHECK (included_projects >= 0),
  included_ai_cost_micros bigint NOT NULL CHECK (included_ai_cost_micros >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE factory_subscriptions (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES factory_plans(id),
  status text NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','paused')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE factory_workspace_invites (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role_name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,email)
);

CREATE TABLE factory_quota_counters (
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  projects_created integer NOT NULL DEFAULT 0 CHECK (projects_created >= 0),
  ai_cost_micros bigint NOT NULL DEFAULT 0 CHECK (ai_cost_micros >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,period_key)
);

CREATE TABLE factory_billing_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  amount_cents integer,
  currency text,
  payload_json text NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX factory_billing_events_tenant_time_idx ON factory_billing_events(tenant_id,occurred_at DESC);
