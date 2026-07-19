# Database migration path (P3-3)

**Status:** Path established — SQLite remains the default runtime.  
**Related:** [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md) §11 / §15 / §19#18, [PRODUCTION_ROADMAP.md](./PRODUCTION_ROADMAP.md) P3-3

## Decision

| Option | Verdict |
| --- | --- |
| **Postgres** | **Target for horizontal scale** and later pgvector (P3-5). Prefer when multi-instance + managed DB is required. |
| **Turso / libSQL** | Acceptable interim if you need remote SQLite semantics with minimal SQL dialect change. Not the long-term vector home. |
| **SQLite (`better-sqlite3`)** | **Default today.** Single-node pilot and early public launch. |

**Chosen direction:** keep SQLite as default; treat **Postgres** as the cutover target; leave `DATABASE_DRIVER=libsql` as a reserved stub for an interim remote-SQLite option.

## What shipped in P3-3

1. **Versioned migrator** — `npm run db:migrate:all` (`scripts/migrate-all.mjs`)
   - Tracks applied versions in `schema_migrations`
   - Records current module `schema.sql` files as `0001_baseline`
   - Applies forward SQL from `migrations/NNNN_*.sql` in order
2. **Driver scaffolding** — `DATABASE_DRIVER=sqlite|libsql|postgres` (sqlite only implemented)
3. **This cutover plan** — operators know how to move without a big-bang rewrite

Per-module `npm run db:migrate:*` scripts remain for convenience; prefer `db:migrate:all` for new environments.

## Cutover phases (when metrics demand)

1. **Freeze schema** — stop ad-hoc `schema.sql` edits; add numbered files under `migrations/`.
2. **Export** — dump SQLite (or use an ETL tool) while the app is briefly read-only / maintenance.
3. **Apply versioned migrations** on the target (Postgres schema port of the same versions).
4. **Dual-run smoke** — point a staging app at the new DB; verify auth, billing, website media metadata, automation queue.
5. **Flip** — set `DATABASE_URL` (and later `DATABASE_DRIVER=postgres`) on production; decommission the file DB after backup.
6. **Async repositories** — convert hot paths from sync `better-sqlite3` to async clients (separate sprint; not required to *plan* cutover).

## Non-goals (deferred)

| Item | Why |
| --- | --- |
| Rewriting all repositories to `pg` / `@libsql/client` | Large; blocked on real multi-instance need |
| Better Auth adapter swap | Follow Better Auth’s Postgres/libSQL adapters at cutover time |
| Vector store move | **P3-5** — see [VECTOR_STORE_PATH.md](./VECTOR_STORE_PATH.md) |
| Dropping lazy `createSchemaMigrator` | Can coexist until all deploys use `db:migrate:all` |

## Operator commands

```bash
# Fresh or existing SQLite DB — apply baseline + pending migrations
npm run db:migrate:all

# Optional: Better Auth CLI (auth tables also in baseline)
npm run db:migrate
```

## Env

```bash
DATABASE_URL=./data/mabps.db
# DATABASE_DRIVER=sqlite   # sqlite (default) | libsql | postgres
```

`libsql` and `postgres` currently throw a clear startup error until a real client is wired.
