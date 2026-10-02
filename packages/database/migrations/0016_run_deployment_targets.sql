ALTER TABLE factory_runs
  ADD COLUMN IF NOT EXISTS railway_project_id text,
  ADD COLUMN IF NOT EXISTS railway_service_id text;

ALTER TABLE factory_runs
  ADD CONSTRAINT factory_runs_railway_target_pair
  CHECK (
    (railway_project_id IS NULL AND railway_service_id IS NULL)
    OR
    (railway_project_id IS NOT NULL AND railway_service_id IS NOT NULL)
  );
