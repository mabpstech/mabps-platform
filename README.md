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

npm run db:migrate
npm run db:migrate:billing
npm run db:migrate:website
npm run db:migrate:crm
npm run db:migrate:chatbot
npm run db:migrate:automation
npm run db:migrate:knowledge
npm run db:migrate:memory
npm run db:migrate:analytics
npm run db:migrate:ai
npm run db:migrate:whatsapp
npm run db:migrate:email
npm run db:migrate:notifications
npm run db:migrate:deployment
npm run db:migrate:guardian
npm run db:migrate:marketplace

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

See [`.env.example`](./.env.example) for every runtime variable (auth, Stripe, WhatsApp, knowledge embeddings, etc.).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:migrate*` | Schema migrators (auth + each feature module) |
