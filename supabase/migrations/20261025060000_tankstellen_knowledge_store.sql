-- Internal, source-bound knowledge store. This migration is a draft and is NOT applied to Supabase.
create table if not exists public.tankstellen_knowledge_sources (
  id text primary key,
  publisher text not null,
  start_url text not null,
  allowed_hosts text[] not null,
  scope text not null,
  review_status text not null default 'pending_review'
    check (review_status in ('pending_review', 'approved', 'rejected', 'paused')),
  terms_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tankstellen_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.tankstellen_knowledge_sources(id),
  canonical_url text not null unique,
  title text not null,
  publisher text not null,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  content_hash text not null,
  review_status text not null default 'pending_review'
    check (review_status in ('pending_review', 'approved', 'rejected', 'stale')),
  content_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tankstellen_knowledge_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.tankstellen_knowledge_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  search_vector tsvector generated always as (
    to_tsvector('pg_catalog.german'::regconfig, coalesce(content, ''))
  ) stored,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists tankstellen_knowledge_chunks_search_idx
  on public.tankstellen_knowledge_chunks using gin (search_vector);
create index if not exists tankstellen_knowledge_docs_review_idx
  on public.tankstellen_knowledge_documents (review_status, fetched_at desc);

alter table public.tankstellen_knowledge_sources enable row level security;
alter table public.tankstellen_knowledge_documents enable row level security;
alter table public.tankstellen_knowledge_chunks enable row level security;

-- No anon/authenticated policies: the client cannot read or write the internal knowledge corpus.
revoke all on public.tankstellen_knowledge_sources from anon, authenticated;
revoke all on public.tankstellen_knowledge_documents from anon, authenticated;
revoke all on public.tankstellen_knowledge_chunks from anon, authenticated;
grant select, insert, update, delete on public.tankstellen_knowledge_sources to service_role;
grant select, insert, update, delete on public.tankstellen_knowledge_documents to service_role;
grant select, insert, update, delete on public.tankstellen_knowledge_chunks to service_role;
grant usage, select on sequence public.tankstellen_knowledge_chunks_id_seq to service_role;

create or replace function public.search_tankstellen_knowledge(
  search_query text,
  result_limit integer default 5
)
returns table (
  chunk_id bigint,
  document_id uuid,
  title text,
  publisher text,
  canonical_url text,
  published_at timestamptz,
  fetched_at timestamptz,
  excerpt text,
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    d.id,
    d.title,
    d.publisher,
    d.canonical_url,
    d.published_at,
    d.fetched_at,
    left(c.content, 1100),
    ts_rank(c.search_vector, websearch_to_tsquery('pg_catalog.german'::regconfig, left(coalesce(search_query, ''), 500))) as rank
  from public.tankstellen_knowledge_chunks c
  join public.tankstellen_knowledge_documents d on d.id = c.document_id
  join public.tankstellen_knowledge_sources s on s.id = d.source_id
  where s.review_status = 'approved'
    and d.review_status = 'approved'
    and length(trim(coalesce(search_query, ''))) >= 2
    and c.search_vector @@ websearch_to_tsquery('pg_catalog.german'::regconfig, left(search_query, 500))
  order by rank desc, d.fetched_at desc
  limit greatest(1, least(coalesce(result_limit, 5), 10));
$$;

revoke all on function public.search_tankstellen_knowledge(text, integer) from public, anon, authenticated;
grant execute on function public.search_tankstellen_knowledge(text, integer) to service_role;
