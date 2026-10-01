ALTER TABLE factory_runs ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS factory_runs_tenant_idempotency_unique ON factory_runs(tenant_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
