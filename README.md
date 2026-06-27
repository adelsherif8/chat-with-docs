# Chat with your documents 📄✦

Upload PDFs → ask questions → get **answers with inline citations**, grounded in your files.

A production-shaped RAG (Retrieval-Augmented Generation) app: PDFs are parsed, chunked, embedded into a **pgvector** store, and answered by **Claude** using its native **citations** feature — so every answer shows the exact source passage and page it came from.

![demo](docs/demo.gif)

---

## ✨ Features

- **Drag-and-drop PDF upload** with live "parsing → chunking → embedding" feedback
- **Vector search** over your documents (Supabase pgvector + cosine similarity)
- **Cited answers** — Claude grounds each statement in the retrieved chunks and returns the exact quoted text + page number
- **Token-by-token streaming** chat UI
- **One repo, one deploy** — Next.js full-stack on Vercel + Supabase

## 🧱 Architecture

```
PDF  ──►  parse per page  ──►  chunk (overlap)  ──►  OpenAI embeddings  ──►  Supabase pgvector
                                                                                   │
question ──► embed ──► similarity search (top-k) ──► Claude (citations on) ──► cited, streamed answer
```

| Layer        | Tech                                            |
| ------------ | ----------------------------------------------- |
| Frontend/API | Next.js 14 (App Router) + Tailwind              |
| LLM          | Claude (`claude-opus-4-8`) via `@anthropic-ai/sdk` |
| Embeddings   | OpenAI `text-embedding-3-small` (1536-dim)      |
| Vector store | Supabase Postgres + `pgvector`                  |
| PDF parsing  | `pdf-parse` (per-page, for citations)           |

---

## 🚀 Setup

### 1. Install

```bash
npm install
```

### 2. Create the Supabase database

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **Database → SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This enables
   pgvector and creates the `documents` / `chunks` tables and the
   `match_chunks` search function.

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in:

| Var                           | Where to get it                                  |
| ----------------------------- | ------------------------------------------------ |
| `ANTHROPIC_API_KEY`           | console.anthropic.com → API Keys                 |
| `OPENAI_API_KEY`              | platform.openai.com → API Keys                   |
| `NEXT_PUBLIC_SUPABASE_URL`    | Supabase → Settings → API → Project URL          |
| `SUPABASE_SERVICE_ROLE_KEY`   | Supabase → Settings → API → `service_role` key   |

> The service-role key is used **server-side only** (in the API routes) and is
> never sent to the browser.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>, drop in a PDF, and ask away.

---

## ☁️ Deploy (Vercel)

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add the four environment variables from `.env.local` in the Vercel project
   settings.
4. Deploy. Supabase stays as-is — no extra hosting needed.

---

## 🔧 Notes & knobs

- **Model:** defaults to `claude-opus-4-8`. Set `ANTHROPIC_MODEL=claude-sonnet-4-6`
  in `.env.local` for faster, cheaper demos.
- **Chunk size / overlap:** tune in [`lib/chunk.ts`](lib/chunk.ts).
- **Retrieved chunks (top-k):** `TOP_K` in [`app/api/chat/route.ts`](app/api/chat/route.ts).
- **Embedding model:** if you change `EMBEDDING_MODEL`, update the `vector(1536)`
  dimension in `supabase/schema.sql` to match.
- **Scanned PDFs:** image-only PDFs have no extractable text and will be
  rejected. Add an OCR step (e.g. Tesseract) to support them.

---

## 📂 Project structure

```
app/
  api/upload/route.ts   PDF → chunks → embeddings → pgvector
  api/chat/route.ts     retrieve → Claude (citations) → stream
  page.tsx              chat UI + streaming client
components/             Uploader, Message, CitationChip
lib/                    pdf, chunk, embeddings, supabase, anthropic, types
supabase/schema.sql     pgvector tables + match_chunks()
```

Built as a portfolio-ready demo of a real-world RAG pipeline.
