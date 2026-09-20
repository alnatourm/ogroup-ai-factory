-- Tenant-isolated document content storage for the controlled v0.1 upload slice.
-- Content storage remains adapter-wrapped so object storage can replace PostgreSQL later.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documents_id_workspace_unique'
  ) then
    alter table documents
      add constraint documents_id_workspace_unique unique (id, workspace_id);
  end if;
end $$;

create table if not exists document_objects (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid not null,
  media_type text not null check (media_type in ('application/pdf','image/png','image/jpeg','image/tiff')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  content bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, document_id),
  foreign key (document_id, workspace_id)
    references documents(id, workspace_id) on delete cascade,
  check (octet_length(content) = size_bytes)
);

create index if not exists idx_document_objects_workspace_created
  on document_objects(workspace_id, created_at desc);
