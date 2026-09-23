create table if not exists document_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  extraction_id uuid not null references document_extractions(id) on delete cascade,
  status text not null check (status in ('draft', 'approved')),
  reviewed_json jsonb not null,
  reviewed_by text not null,
  approval_digest text,
  created_at timestamptz not null default now(),
  check (
    (status = 'draft' and approval_digest is null) or
    (status = 'approved' and approval_digest ~ '^[a-f0-9]{64}$')
  )
);

create index if not exists idx_document_reviews_workspace_document_created
  on document_reviews (workspace_id, document_id, created_at desc);
