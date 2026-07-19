# MABPS Platform

Multi-tenant modular monolith for website building, CRM, chatbot, knowledge, AI assistant, automation, and related ops modules.

Stack: **Next.js 16**, **React 19**, **Better Auth**, **SQLite** (`better-sqlite3`).

## Architecture & roadmap

| Doc | Purpose |
| --- | --- |
| [docs/ARCHITECTURE_AUDIT.md](./docs/ARCHITECTURE_AUDIT.md) | Architecture source of truth (modules, risks, gaps) |
| [docs/PRODUCTION_ROADMAP.md](./docs/PRODUCTION_ROADMAP.md) | Production readiness plan (P0 → P3) |
| [docs/README.md](./docs/README.md) | Docs index |
| [docs/NAMING.md](./docs/NAMING.md) | Canonical UI/API naming |
| [docs/KNOWLEDGE.md](./docs/KNOWLEDGE.md) | Workspace KB vs chatbot-local KB |

## Local setup

```bash
npm install
cp .env.example .env
# Fill BETTER_AUTH_SECRET, BETTER_AUTH_URL, and any optional keys you need.

# Preferred: versioned migrator (baseline modules + migrations/*.sql)
npm run db:migrate:all

# Optional: Better Auth CLI + per-module scripts still work
npm run db:migrate

npm run dev
```

For automation in production, also run the background worker (requires `AUTOMATION_WORKER_SECRET`):

```bash
npm run automation:worker
```

Open [http://localhost:3000](http://localhost:3000).

See [`.env.example`](./.env.example) for every runtime variable (auth, Stripe, WhatsApp, knowledge embeddings, media storage, worker, cache, etc.).

Scale paths: [docs/DB_MIGRATION_PATH.md](./docs/DB_MIGRATION_PATH.md) (DB), [docs/VECTOR_STORE_PATH.md](./docs/VECTOR_STORE_PATH.md) (vectors / pgvector).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:migrate:all` | Versioned schema migrator (recommended) |
| `npm run db:migrate*` | Auth CLI + per-module schema helpers |
| `npm run automation:worker` | Background automation queue worker |
