create extension if not exists vector with schema extensions;

alter table public.search_documents
  add column if not exists fts tsvector generated always as (to_tsvector('english', content)) stored;

alter table public.search_documents enable row level security;

revoke all on public.search_documents from public, anon, authenticated;
grant select, insert, update, delete on public.search_documents to service_role;

create index if not exists search_documents_fts_idx
  on public.search_documents using gin (fts);

create or replace function public.hybrid_search_business_cards(
  p_workspace_id text,
  query_text text,
  query_embedding public.vector(1024),
  match_count integer default 12,
  full_text_weight double precision default 1,
  semantic_weight double precision default 1,
  rrf_k integer default 50
)
returns table (
  document_id text,
  entity_type text,
  entity_id text,
  chunk_type text,
  content text,
  hybrid_score double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with full_text as (
    select
      documents.id,
      row_number() over (
        order by ts_rank_cd(documents.fts, websearch_to_tsquery('english', query_text)) desc
      ) as rank_ix
    from public.search_documents as documents
    where documents.workspace_id = p_workspace_id
      and documents.fts @@ websearch_to_tsquery('english', query_text)
    order by rank_ix
    limit least(match_count * 3, 60)
  ),
  semantic as (
    select
      documents.id,
      row_number() over (order by documents.embedding operator(public.<=>) query_embedding) as rank_ix
    from public.search_documents as documents
    where documents.workspace_id = p_workspace_id
      and documents.embedding is not null
    order by documents.embedding operator(public.<=>) query_embedding
    limit least(match_count * 3, 60)
  ),
  fused as (
    select
      coalesce(full_text.id, semantic.id) as id,
      coalesce(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight
        + coalesce(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight as score
    from full_text
    full outer join semantic on full_text.id = semantic.id
  )
  select
    documents.id,
    documents.entity_type,
    documents.entity_id,
    documents.chunk_type,
    documents.content,
    fused.score
  from fused
  join public.search_documents as documents on documents.id = fused.id
  order by fused.score desc
  limit least(match_count, 30);
$$;

revoke all on function public.hybrid_search_business_cards(text, text, public.vector, integer, double precision, double precision, integer) from public, anon, authenticated;
grant execute on function public.hybrid_search_business_cards(text, text, public.vector, integer, double precision, double precision, integer) to service_role;
