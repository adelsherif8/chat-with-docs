-- ─────────────────────────────────────────────────────────────
-- Chat with your documents — Supabase pgvector schema
-- Run this in the Supabase SQL editor (Database → SQL editor → New query).
-- ─────────────────────────────────────────────────────────────

-- 1. Enable the pgvector extension.
create extension if not exists vector;

-- 2. One row per document (a parsed PDF).
create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  file_name   text not null,
  page_count  int  not null default 0,
  chunk_count int  not null default 0,
  created_at  timestamptz not null default now()
);

-- 3. One row per chunk, with its embedding.
--    1536 dims = OpenAI text-embedding-3-small. Change if you swap models.
create table if not exists chunks (
  id          bigint generated always as identity primary key,
  document_id uuid not null references documents(id) on delete cascade,
  file_name   text not null,
  page        int  not null,
  chunk_index int  not null,
  content     text not null,
  embedding   vector(1536) not null,
  created_at  timestamptz not null default now()
);

-- 4. Approximate-nearest-neighbour index for fast similarity search.
create index if not exists chunks_embedding_idx
  on chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists chunks_document_id_idx on chunks (document_id);

-- 5. Similarity search RPC. Returns the top-k most similar chunks to a query
--    embedding, optionally scoped to a single document.
create or replace function match_chunks (
  query_embedding vector(1536),
  match_count     int default 6,
  filter_document uuid default null
)
returns table (
  id          bigint,
  document_id uuid,
  file_name   text,
  page        int,
  chunk_index int,
  content     text,
  similarity  float
)
language sql stable
as $$
  select
    c.id,
    c.document_id,
    c.file_name,
    c.page,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where filter_document is null or c.document_id = filter_document
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
