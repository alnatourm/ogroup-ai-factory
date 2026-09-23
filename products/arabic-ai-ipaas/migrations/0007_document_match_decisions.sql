create table if not exists document_match_decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  purchase_order_document_id uuid not null references documents(id) on delete cascade,
  invoice_document_id uuid not null references documents(id) on delete cascade,
  decision text not null check (decision in ('accepted','rejected','escalated')),
  reason text not null check (char_length(reason) between 3 and 1000),
  decided_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists document_match_decisions_lookup_idx
  on document_match_decisions(workspace_id,purchase_order_document_id,invoice_document_id,created_at desc);
