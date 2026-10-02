CREATE TABLE IF NOT EXISTS factory_run_requests (
  tenant_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  intent_hash text NOT NULL,
  state text NOT NULL CHECK (state IN ('creating','ready','failed')),
  run_id text,
  target_repository text,
  issue_number integer,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS factory_run_requests_state_idx ON factory_run_requests(state,updated_at);
