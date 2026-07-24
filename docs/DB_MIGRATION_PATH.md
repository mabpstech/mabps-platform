# Database migration path (P3-3)

**Status:** libSQL / Turso wired for production; local SQLite remains the default for development.  
**Related:** [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md) §11 / §15 / §19#18, [PRODUCTION_ROADMAP.md](./PRODUCTION_ROADMAP.md) P3-3

## Decision

| Option | Verdict |
| --- | --- |
| **Postgres** | **Long-term target for horizontal scale** and later pgvector (P3-5). Prefer when multi-instance + managed SQL is required. |
| **Turso / libSQL** | **Production path today.** Remote SQLite semantics with minimal dialect change. Uses `@libsql/client` + sync `libsql` (better-sqlite3-compatible API). |
| **Local SQLite (libSQL embedded)** | **Default for development.** File-backed via `DATABASE_URL=./data/mabps.db`. |

**Chosen direction:** local SQLite for dev; **Turso/libSQL** for production multi-instance; treat **Postgres** as the later scale/vector cutover.

## What shipped

1. **Versioned migrator** — `npm run db:migrate:all` (`scripts/migrate-all.mjs`)
   - Tracks applied versions in `schema_migrations`
   - Records current module `schema.sql` files as `0001_baseline`
   - Applies forward SQL from `migrations/NNNN_*.sql` in order
2. **Driver support** — `DATABASE_DRIVER=sqlite|libsql|postgres`
   - `sqlite` / local file — default for development
   - `libsql` / Turso — production (`DATABASE_URL` + `AUTH_TOKEN`); also auto-detected when `DATABASE_URL` is `libsql://` or `https://`
   - `postgres` — still reserved (throws until cutover)
3. **Connection layer** — `lib/db` exports sync `sqlite` (unchanged repository API) and async `libsql` (`@libsql/client`)

Per-module `npm run db:migrate:*` scripts remain for convenience; prefer `db:migrate:all` for new environments.

## Cutover phases (Postgres, when metrics demand)

1. **Freeze schema** — stop ad-hoc `schema.sql` edits; add numbered files under `migrations/`.
2. **Export** — dump SQLite/libSQL (or use an ETL tool) while the app is briefly read-only / maintenance.
3. **Apply versioned migrations** on the target (Postgres schema port of the same versions).
4. **Dual-run smoke** — point a staging app at the new DB; verify auth, billing, website media metadata, automation queue.
5. **Flip** — set `DATABASE_URL` (and later `DATABASE_DRIVER=postgres`) on production; decommission the prior DB after backup.
6. **Async repositories** — convert hot paths from sync `libsql` to fully async `@libsql/client` / `pg` (separate sprint).

## Non-goals (deferred)

| Item | Why |
| --- | --- |
| Rewriting all repositories to async `@libsql/client` / `pg` | Large; sync `libsql` preserves existing APIs |
| Better Auth adapter swap | Follow Better Auth’s Postgres adapters at Postgres cutover time |
| Vector store move | **P3-5** — see [VECTOR_STORE_PATH.md](./VECTOR_STORE_PATH.md) |
| Dropping lazy `createSchemaMigrator` | Can coexist until all deploys use `db:migrate:all` |

## Operator commands

```bash
# Fresh or existing DB — apply baseline + pending migrations
npm run db:migrate:all

# Optional: Better Auth CLI (auth tables also in baseline)
npm run db:migrate
```

## Env

```bash
# Development (local file)
DATABASE_URL=./data/mabps.db
# DATABASE_DRIVER=sqlite

# Production (Turso)
# DATABASE_URL=libsql://your-db-name-org.turso.io
# AUTH_TOKEN=eyJ...
# DATABASE_DRIVER=libsql
```
