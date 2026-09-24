alter table document_match_decisions add column if not exists match_digest text;
alter table document_match_decisions add column if not exists purchase_order_extraction_id uuid references document_extractions(id);
alter table document_match_decisions add column if not exists invoice_extraction_id uuid references document_extractions(id);
