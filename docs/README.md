# MABPS docs

## Architecture source of truth

| Document | Role |
| --- | --- |
| [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md) | Canonical architecture scan: modules, wiring, risks, gaps |
| [PRODUCTION_ROADMAP.md](./PRODUCTION_ROADMAP.md) | Prioritized P0–P3 production readiness plan derived from the audit |
| [DB_MIGRATION_PATH.md](./DB_MIGRATION_PATH.md) | SQLite → Postgres/libSQL migration path and cutover plan |

Do **not** recreate parallel architecture / roadmap / tech-stack stubs. Update the audit when structure changes; update the roadmap when priorities change.

## Other docs

| Document | Role |
| --- | --- |
| [NAMING.md](./NAMING.md) | Canonical public names (`website`, `automation`, `email`) |
| [KNOWLEDGE.md](./KNOWLEDGE.md) | Workspace knowledge vs chatbot-local KB ownership |
| [AUTH_DECISION.md](./AUTH_DECISION.md) | Auth library decision (Better Auth) |
| [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) | Auth implementation notes |
| [V1_SCOPE.md](./V1_SCOPE.md) | Pointer to current scope / sequencing docs |

Empty placeholder docs (`ARCHITECTURE.md`, `DATABASE.md`, `MODULES.md`, etc.) were removed in P2-4.
