# Vector store path (P3-5)

**Status:** Path established — SQLite JSON vectors remain the default.  
**Related:** [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md) §11 / §12, [PRODUCTION_ROADMAP.md](./PRODUCTION_ROADMAP.md) P3-5, [DB_MIGRATION_PATH.md](./DB_MIGRATION_PATH.md)

## Decision

| Option | Verdict |
| --- | --- |
| **Postgres + pgvector** | **Target for scale.** ANN search in the DB; supports multi-instance app nodes. |
| **SQLite `vectorJson`** | **Default today.** In-process cosine over loaded rows; fine for pilot / early launch. |
| **External SaaS vector DB** | Optional later; not required while pgvector covers the horizontal path. |

**Chosen direction:** keep SQLite vectors as default; treat **pgvector** as the dedicated store when embedding volume or multi-node deploy demands it. Knowledge and memory share the same driver selection (`MABPS_KB_VECTOR_STORE`).

## What shipped in P3-5

1. **Pluggable knowledge store** — `getVectorStore()` supports `sqlite` | `pgvector`
2. **Memory parity** — `lib/memory/vector.ts` routes upsert/search/delete through the same driver
3. **Shared Postgres helper** — `lib/vector/pg-client.ts` connects via `VECTOR_DATABASE_URL` (or app `DATABASE_URL` when `DATABASE_DRIVER=postgres`) and ensures pgvector tables
4. **This cutover plan** — operators know when / how to flip without rewriting retrieval callers

## Cutover phases (when metrics demand)

1. **Provision** a Postgres database with the `vector` extension (Neon, RDS, Cloud SQL, self-hosted).
2. **Set env** on staging:

```bash
MABPS_KB_VECTOR_STORE=pgvector
VECTOR_DATABASE_URL=postgres://user:pass@host:5432/mabps_vectors
# npm dependency: pg
```

3. **Re-embed or migrate** — re-run knowledge ingest / memory embedding jobs so vectors land in `kb_embedding_vector` / `memory_embedding_vector` (SQLite `*_embedding` rows are not auto-copied).
4. **Smoke** — knowledge search + memory search return expected hits; compare top-k quality vs SQLite.
5. **Flip production** — set the same env; keep SQLite embedding tables as read-only backup until soak completes.

## Schema (created automatically on first pgvector use)

- `kb_embedding_vector` — knowledge chunks (`embedding vector`, unique on chunk+provider+model)
- `memory_embedding_vector` — memory entries (unique on memory+provider+model)

SQL is applied by `ensurePgvectorSchema()`; a checked-in copy lives in `migrations/pgvector/0001_init.sql` for operators who prefer applying DDL out-of-band.

## Non-goals (deferred)

| Item | Why |
| --- | --- |
| Dual-write SQLite ↔ pgvector | Extra complexity; re-embed is simpler for v1 cutover |
| Chatbot-local KB vectors | Still lexical by design (see [KNOWLEDGE.md](./KNOWLEDGE.md)) |
| Replacing embedding providers | Orthogonal to storage |

## Env

```bash
# Default
MABPS_KB_VECTOR_STORE=sqlite

# Dedicated store
# MABPS_KB_VECTOR_STORE=pgvector
# VECTOR_DATABASE_URL=postgres://...
```
