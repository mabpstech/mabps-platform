# MABPS Platform — Complete Project Audit

**Audit date:** 2026-07-30  
**Scope:** Entire repository (`app/`, `components/`, `lib/`, `scripts/`, `migrations/`, `docs/`, config, env templates, journey probes)  
**Method:** Static code review + prior architecture audit reconciliation + local journey probe reports (`tmp/*`)  
**Constraint:** Findings only — **no application code was modified** (this report file only)  
**Branch:** `main` (ahead of `origin/main` by 19 commits at audit time)

**Related sources of truth (do not treat as stale):**

| Doc | Role |
| --- | --- |
| [docs/ARCHITECTURE_AUDIT.md](./docs/ARCHITECTURE_AUDIT.md) | Architecture inventory (2026-07-19) — many P0 items since fixed |
| [docs/PRODUCTION_ROADMAP.md](./docs/PRODUCTION_ROADMAP.md) | P0→P3 production plan |
| [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md) | V1 module build order |
| [MABPS_MASTER_STACK.md](./MABPS_MASTER_STACK.md) | Undecided product candidates (Products, Categories, …) |

---

## Executive summary

MABPS is a **large, working modular monolith** (Next.js 16 · React 19 · Better Auth · libSQL/SQLite) with **~17 domain modules**, **227 API routes**, **135 pages**, and a mature **AI website generation** pipeline. Core customer path **signup → AI generate → publish → live** was verified passing in `tmp/launch-blocker-verify/` (2026-07-30).

| Dimension | Verdict |
| --- | --- |
| **Overall completion** | **~78%** toward full V1 modular product + launch hardening |
| **Closed-pilot readiness** | **~85%** — P0 security mostly closed; first-customer journey works |
| **Public-launch readiness** | **~62%** — secrets-at-rest, CAPTCHA, transcript binding, CI/tests still open |
| **Master-stack extras** | Products / Categories / standalone File Manager **not started** |

**Top remaining blockers before public signup:** encrypt provider secrets at rest; bind chatbot transcripts to visitor secrets; CAPTCHA (or stronger challenge) on public leads/forms; path-contain knowledge file reads; move automation secrets out of URL paths; add CI + smoke tests for P0 public surfaces.

---

## 1. Current completion percentage

### 1.1 Headline score

| Metric | Score | Meaning |
| --- | --- | --- |
| **Overall project completion** | **78%** | Weighted across modules + security + ops + testing |
| Feature / module surface (V1 order 1–8) | **82%** | Auth→Marketplace present with UI + API + schema |
| Production security (P0/P1) | **70%** | Most P0 done; several P1 gaps remain |
| Scale / ops maturity (P3) | **55%** | Worker, S3/db media, Turso, cache exist; Postgres/pgvector deferred |
| Automated testing / CI | **25%** | Manual verify scripts only; no `.github` CI, no unit test runner |

### 1.2 Weighted breakdown

| Area | Weight | Score | Notes |
| --- | --- | --- | --- |
| Core (auth, workspace, dashboard, onboarding) | 12% | 95% | Better Auth orgs; active-org launch fix shipped |
| Billing | 8% | 88% | Free/Starter/Pro/Enterprise; Stripe + Razorpay |
| Website builder + AI generation | 20% | 85% | Full builder; AI pipeline strong; editor UX still rough |
| CRM | 8% | 85% | Contacts→pipeline; no CRM volume entitlements |
| Integrations (WhatsApp, Email, Notifications) | 10% | 80% | Webhooks signed/rate-limited; channel maturity varies |
| AI stack (assistant, chatbot, knowledge, memory) | 12% | 78% | Dual provider stacks; dual KB; embeddings optional |
| Automation | 8% | 75% | Workflows + worker; secrets still in path |
| Marketplace | 6% | 65% | Catalog/sandbox; purchase↔billing soft |
| Ops (analytics, deployment, guardian) | 8% | 75% | Guardian map fixed; deployment soft-linked to sites |
| Launch hardening (security, tests, docs) | 8% | 55% | Headers/rate limits good; secrets encrypt + CI missing |

**Formula result:** ≈ **78%**.

### 1.3 Inventory snapshot (2026-07-30)

| Layer | Count |
| --- | --- |
| API `route.ts` files | **227** |
| `page.tsx` routes | **135** |
| Component TS/TSX files | **182** |
| `lib/**/*.ts` files | **419** |
| Module `schema.sql` files | **16** (+ auth in `lib/db`) |
| Versioned SQL migrations | **6** (`0001`–`0006`) |
| Scripts | **48** |
| Empty scaffolding dirs (`features/`, etc.) | **Removed** (fixed since July 19 audit) |

---

## 2. Completed features

### 2.1 V1 modules (Implementation Order 1–8)

| # | Module | Status | Evidence |
| --- | --- | --- | --- |
| 1 | **Core** | Done | Auth (login/signup/forgot/reset/invite), workspaces, dashboard, settings, `proxy.ts` gate |
| 2 | **Billing** | Done | Plans, Stripe + Razorpay, entitlements, usage counters, trial job route |
| 3 | **Website builder** | Done | Sites, pages, sections, theme, header/footer/nav, blog, forms, media DAM, SEO, publish, public `/p` + `/site` |
| 3+ | **AI website generation** | Done | Business planner → website planner → orchestrator → hero generator → blueprint → composer → builder adapter |
| 4 | **CRM** | Done | Contacts, companies, leads, customers, deals, pipeline, tasks, activities, tags, notes, import/export, search |
| 5 | **Integrations** | Done | WhatsApp Cloud API, email engine (templates/campaigns/tracking), notifications multi-channel |
| 6 | **AI** | Done | Workspace AI assistant, chatbot (+ widget embed), knowledge base, memory |
| 7 | **Automation** | Done | Workflows, runs, queue, public webhook/API triggers, background worker script |
| 8 | **Marketplace** | Mostly done | Catalog, installs, developer, sandbox, plugin API (deny-unknown), migrate CLI |

### 2.2 Ops / platform extras (beyond V1 order)

- **Analytics** — activity, AI, API usage, automation, chatbot, CRM, revenue, website, reports, event track APIs  
- **Deployment** — projects, domains, env, health, history, logs, providers, rollback  
- **Guardian** — scans, findings, repairs, health checks, integrity map covering all major modules  
- **Marketing site** — home, about, contact, platform, pricing, resources, solutions  
- **Platform shared lib** — `lib/platform/{access,http,migrate,rate-limit,cache,secrets,safe-url,…}`  
- **Storage** — local FS · DB BLOB · S3/R2 drivers  
- **DB** — local SQLite + Turso/libSQL path; versioned `db:migrate:all`  
- **Security hardening shipped** — media session auth, WhatsApp HMAC, public rate limits, HTML sanitize, SVG upload block, CSP/security headers, marketplace action deny  

### 2.3 Recently verified customer path

`scripts/launch-blocker-verify.mjs` (2026-07-30) reported **success**: signup → active org set → AI generate → publish → live `200` → delete frees site quota.

---

## 3. Remaining features

### 3.1 Master stack (explicitly not built)

| Candidate | Status |
| --- | --- |
| Products | Not implemented |
| Categories | Not implemented |
| Standalone File Manager | Partial only via website media |
| Standalone CMS | Folded into website builder |
| Standalone Media Library | Folded into website media |
| Generic Plugin System | Partial (marketplace sandbox/SDK only) |

### 3.2 Product maturity gaps (built but incomplete)

| Gap | Detail |
| --- | --- |
| Marketplace ↔ billing purchase | `marketplace_purchase` schema exists; end-to-end paid install maturity unverified |
| Deployment ↔ website | Soft `siteId` link; no hard shared publish/deploy coupling |
| CRM entitlements | Member limits yes; contact/lead/deal volume not gated |
| Analytics emission | Consumers exist; not every domain emits consistently |
| Dual knowledge ownership | Workspace `knowledge` vs `chatbot/knowledge` still overlapping |
| Dual LLM providers | `lib/ai/providers/*` parallel to chatbot providers |
| AI create UX polish | Earlier journey probes hit missing fields / “New website” titles (mostly mitigated; editor still hard to automate) |
| Postgres driver | Reserved; throws until cutover (`docs/DB_MIGRATION_PATH.md`) |
| Dedicated vector DB in prod default | pgvector path exists; default remains SQLite cosine |

### 3.3 Production roadmap leftovers (feature-adjacent)

- CAPTCHA / lead challenge on public forms & chatbot  
- Visitor-bound chatbot transcript secret  
- Provider secrets encryption at rest (`MABPS_SECRETS_KEY` documented, **not implemented**)  
- Automation secrets out of URL path segments  
- Formal CI smoke suite  

---

## 4. Critical bugs

Severity here means **user-facing breakage or security-critical defect still present or recently observed**.

| ID | Severity | Bug | Evidence / impact |
| --- | --- | --- | --- |
| B1 | **Critical (security residual)** | Provider API keys / channel tokens stored **plaintext** in SQLite | `MABPS_SECRETS_KEY` only in `.env.example`; no encrypt/decrypt implementation in `lib/` — DB dump = full credential compromise |
| B2 | **Critical (privacy)** | Public chatbot transcript readable with only `publicKey` + `conversationId` | `app/api/chatbot/public/[publicKey]/messages/route.ts` GET has no visitor session secret |
| B3 | **High (path safety)** | Knowledge file read lacks uploads-root containment | `lib/knowledge/storage.ts` `readKnowledgeFile` joins cwd + path without `startsWith(uploadsRoot)` check — traversal risk if bad `storagePath` stored |
| B4 | **High (secret leakage)** | Automation webhook/API secrets live in **URL path** | `app/api/automation/public/webhook/[secret]`, `…/api/[apiKey]` — leak via logs, Referer, browser history |
| B5 | **High (UX / reliability)** | Page editor is hard to discover for save/edit | Journey probes (`first-customer-journey*`) repeatedly: “Could not find editable field”, “No save button” — real customers may struggle even when data exists |
| B6 | **Medium (session edge)** | Login can leave `activeOrganizationId` missing | Observed in `tmp/first-customer-journey-2/report.json`; later launch-blocker verify shows signup/login set org correctly — **treat as regression risk**, keep covered by smoke tests |
| B7 | **Medium (docs drift)** | `docs/FIRST_RUN_CHECKLIST.md` still mentions `better-sqlite3` and a stale typecheck Buffer error | Stack is libSQL; checklist partially outdated |

**Note:** July 19 criticals **S1 media cookie bypass**, **S2 unsigned WhatsApp**, **S3 no rate limits** appear **fixed** in current code and should not be re-opened unless regression tests fail.

---

## 5. High-priority tasks

Ship these before **open public signup** (closed pilot may proceed with monitoring).

| # | Task | Why |
| --- | --- | --- |
| H1 | Implement secrets-at-rest (`MABPS_SECRETS_KEY` encrypt/decrypt for AI, chatbot, email, WhatsApp, deployment tokens) | Highest remaining confidentiality risk |
| H2 | Bind chatbot public message GET/POST to a visitor session secret issued at session create | Stops transcript scraping |
| H3 | Harden `readKnowledgeFile` / delete paths to uploads-root containment (mirror media) | Path traversal |
| H4 | Move automation webhook/API auth to headers (or body); deprecate path secrets with rotation | Log/Referer leakage |
| H5 | Add CAPTCHA / Turnstile / honeypot on public forms + chatbot lead capture | Complements rate limits |
| H6 | CI pipeline: `lint` + `typecheck` + smoke scripts for media auth, WhatsApp HMAC, rate limit, marketplace deny, signup→publish | Prevents P0 regressions; no `.github/` today |
| H7 | Editor UX pass: obvious editable fields + visible Save / autosave affordances | Journey probes fail on edit discoverability |
| H8 | Ensure automation worker runs in production (`AUTOMATION_WORKER_SECRET` + process supervisor) | Queue no longer drained from public HTTP (good) — worker must be live |

---

## 6. Medium-priority tasks

| # | Task | Why |
| --- | --- | --- |
| M1 | Group global nav (Build / Engage / Ops / AI) — still ~16 flat links | Cognitive load |
| M2 | CRM record-volume entitlements | Plan fairness / abuse |
| M3 | Unify AI + chatbot LLM provider adapters | Dual maintenance |
| M4 | Clarify workspace KB vs chatbot-local KB (docs + API boundaries) | Retrieval drift |
| M5 | Standardize API envelopes `{ data, meta }` / structured errors | Client consistency |
| M6 | Consistent analytics event emission across modules | Incomplete instrumentation |
| M7 | Hard-couple deployment ↔ website publish flow | Soft `siteId` today |
| M8 | Marketplace purchase → entitlement end-to-end verification | Billing maturity |
| M9 | Structured logging (replace ad-hoc `console.error("[module]",…)`) | Supportability |
| M10 | Refresh FIRST_RUN_CHECKLIST + commit untracked marketing SEO files (`app/sitemap.ts`, `opengraph-image.tsx`) if intentional | Ops/docs hygiene |
| M11 | Reduce remaining per-module `access.ts` / `http.ts` drift onto `lib/platform` | Auth/error rule drift |
| M12 | Document billing table naming exception (`subscription` / `invoice` vs `billing_*`) | Guardian/docs alignment already improved |

---

## 7. Low-priority tasks

| # | Task | Why |
| --- | --- | --- |
| L1 | Products / Categories modules (only if product commits) | Master stack undecided |
| L2 | Standalone File Manager | Covered enough by website media for V1 |
| L3 | Postgres cutover | Turso/libSQL is production path today |
| L4 | Shared event bus / outbox | Only when multi-instance automation demands it |
| L5 | Formal event schema `strict` mode everywhere | `PLATFORM_EVENT_SCHEMA_MODE` already exists |
| L6 | Fill retired empty docs stubs (already redirected in V1_SCOPE) | Low value |
| L7 | Remove unused `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` if still unused | Env clarity |
| L8 | Performance micro-pass on CRM/analytics fan-out COUNT queries | Profile first |
| L9 | React Compiler / memo guidance documentation | Consistency only |

---

## 8. Security issues

### 8.1 Status of prior critical findings (July 19 → July 30)

| ID | Finding | Status |
| --- | --- | --- |
| S1 | Unpublished media cookie substring bypass | **Fixed** — `requireWebsiteMemberApi()` on unpublished media |
| S2 | WhatsApp webhook unsigned POST | **Fixed** — `verifyWhatsAppWebhookSignature` + `WHATSAPP_APP_SECRET` |
| S3 | No rate limiting | **Fixed** — `lib/platform/rate-limit.ts` on public surfaces |
| S4 | Global automation queue drain from public routes | **Fixed** — public webhook returns 202 enqueue only; `workspaceId` scope supported |
| S5 | Unsanitized public HTML/JSON-LD | **Fixed** — `lib/website/sanitize.ts` + sanitized JSON-LD path |
| S6 | SVG uploads allowed | **Fixed** — SVG excluded from allowlist |
| S9 | Marketplace unknown action default-allow | **Fixed** — throws deny |
| Headers | Missing CSP / HSTS / etc. | **Fixed** — `next.config.ts` security headers |
| Proxy | Missing protected prefixes | **Fixed** — guardian/knowledge/memory/automation/marketplace included |

### 8.2 Open security issues

| ID | Severity | Issue |
| --- | --- | --- |
| SEC-1 | **Critical** | Secrets at rest unencrypted (AI/chatbot/email/WhatsApp/deployment tokens in DB) |
| SEC-2 | **High** | Chatbot transcript scraping (`publicKey` + guessable/leaked `conversationId`) |
| SEC-3 | **High** | Knowledge storage path containment incomplete |
| SEC-4 | **High** | Automation secrets in URL paths |
| SEC-5 | **Medium** | No CAPTCHA on public lead/form endpoints (rate limit only) |
| SEC-6 | **Medium** | CSP allows `'unsafe-inline'` scripts/styles (needed for App Router/theme; residual XSS blast radius) |
| SEC-7 | **Medium** | CSRF relies on Better Auth cookie SameSite defaults (no explicit CSRF tokens) |
| SEC-8 | **Low** | Email webhook info disclosure patterns (workspace id when secret known) — review remaining |

### 8.3 Positive controls

- Per-module workspace-scoped `require*MemberApi` / `require*ManagerApi`  
- Stripe webhook signature verification when configured  
- WhatsApp HMAC with timing-safe compare  
- Marketplace sandbox avoids `eval` / untrusted dynamic import  
- Bound SQL parameters predominant; `foreign_keys=ON`  
- Public rate limiter (in-memory; Redis optional later)  

---

## 9. Performance issues

| Issue | Location / pattern | Impact |
| --- | --- | --- |
| Sync FS on request path | Knowledge upload/read still `writeFileSync` / `readFileSync` | Blocks event loop under concurrent ingest |
| Sync DB API | Repositories use sync libSQL/SQLite | Fine for single-node; limits serverless concurrency |
| CRM / analytics fan-out | Many separate COUNTs per overview | Slow dashboards as data grows |
| N+1 list enrichment | Common list→detail patterns | Latency on large workspaces |
| Inline embeddings | Knowledge ingest can embed on request path | Timeouts on large docs without OpenAI tuning |
| Marketplace sandbox wall-clock | Sync work before timeout check | Event-loop stalls |
| In-memory rate limit / cache | Default single-process | Incorrect under multi-instance without Redis/Upstash |
| Flat 16-link header | Client render + UX cost | Minor perf; major cognitive cost |
| Automation without worker | If worker not deployed, jobs stall | Perceived “automation broken” |

**Mitigations already present:** media blob drivers (db/S3), automation worker script, platform cache (`CACHE_DRIVER`), website prod indexes migration `0006`, fetch timeouts helper.

---

## 10. Folder-by-folder explanation

### 10.1 Top-level

| Path | Purpose |
| --- | --- |
| `app/` | Next.js App Router — marketing, auth, authenticated product UI, public site/embed, all HTTP APIs |
| `components/` | React UI by domain (mirrors product modules) |
| `lib/` | Domain logic, schemas, repositories, engines (source of truth for business rules) |
| `migrations/` | Forward-only SQL after baseline (`0002`–`0006` website-focused) |
| `scripts/` | Migrators, automation worker, AI/website verify + journey audit probes |
| `docs/` | Architecture, production roadmap, auth, DB/vector paths, first-run checklist |
| `data/` | Local SQLite DB + uploads (runtime; not source) |
| `public/` | Static assets |
| `tmp/` | Journey screenshots/reports (local audit artifacts) |
| `proxy.ts` | Next 16 edge gate: cookie check + custom-domain rewrite (not `middleware.ts`) |
| `next.config.ts` | CSP, security headers, legacy `/sites`→`/website` redirects |
| `.env.example` | Full operator env catalog |

### 10.2 `app/` route groups

| Path | Purpose |
| --- | --- |
| `app/(marketing)/` | Public marketing pages |
| `app/(auth)/` | Login, signup, password reset, accept invite |
| `app/(app)/` | Authenticated shell + all product modules |
| `app/api/` | REST/action APIs by module (227 routes) |
| `app/p/` | Published sites by slug |
| `app/site/` | Custom-domain published site catch-all |
| `app/embed/` | Public chatbot widget embed |

### 10.3 `app/(app)/` product areas

| Folder | Role |
| --- | --- |
| `dashboard/` | Home overview |
| `website/` | Builder list, AI create, per-site studio (pages/theme/media/publish/…) |
| `crm/` | Full CRM UI |
| `ai/` | Assistant chat, prompts, tools, usage, settings, logs |
| `chatbot/` | Bots, channels, conversations, widget, local knowledge, providers |
| `knowledge/`, `memory/` | Workspace KB + long-term memory |
| `whatsapp/`, `email/`, `notifications/` | Channel modules |
| `automation/` | Workflows + runs |
| `marketplace/` | Catalog, installs, developer, sandbox |
| `analytics/` | Cross-module reports |
| `deployment/`, `guardian/` | Ops deploy + health/repair |
| `settings/` | Workspace, invitations, billing, account |
| `onboarding/` | First-run workspace setup |

### 10.4 `lib/` domain modules

| Folder | Role |
| --- | --- |
| `auth/`, `db/` | Better Auth + libSQL connection/compat/lifecycle |
| `billing/` | Plans, Stripe/Razorpay, entitlements, usage |
| `website/` | Largest module — builder + **AI generation pipeline** (`lib/website/ai/*`) |
| `crm/` | CRM schema/engine/HTTP |
| `chatbot/`, `ai/`, `knowledge/`, `memory/` | Conversational + assistant + RAG/memory |
| `whatsapp/`, `email-engine/`, `email/`, `notifications/` | Channels (`email` = auth mail; `email-engine` = product) |
| `automation/` | Workflow runner, queue, providers |
| `marketplace/` | Catalog, installs, plugin API, sandbox SDK |
| `analytics/`, `deployment/`, `guardian/` | Measurement + deploy + integrity |
| `platform/` | Shared access/http/migrate/rate-limit/cache/secrets helpers |
| `storage/`, `vector/` | Blob drivers + vector store selection |
| `marketing/` | Marketing content helpers |

### 10.5 `components/`, `scripts/`, `migrations/`

- **`components/<module>`** — UI for the matching `app/(app)/<module>` area; `components/app/global-nav.tsx` provides desktop + mobile nav.  
- **`scripts/`** — `migrate-*.mjs`, `migrate-all.mjs`, `automation-worker.mjs`, `verify-ai-*.ts`, journey probes, industry quality audits.  
- **`migrations/`** — Versioned deltas after module baseline (media DAM, blobs, nav parent, publish events, indexes); `pgvector/` helper SQL for optional vector path.

---

## 11. Database schema review

### 11.1 Approach

| Topic | Current state |
| --- | --- |
| Engine | **libSQL** (local file SQLite default; Turso remote for prod) |
| ORM | **None** — raw SQL repositories |
| Auth tables | Better Auth via `lib/db/schema.sql` |
| Feature tables | Per-module `lib/<module>/schema.sql` |
| Migrator | `npm run db:migrate:all` → baseline module schemas + `migrations/*.sql` |
| IDs | Text UUIDs |
| Tenancy | `"workspaceId"` → `organization(id)` |
| Column style | Quoted camelCase (`"createdAt"`, `"workspaceId"`) |

### 11.2 Table counts by schema

| Schema | ~Tables |
| --- | --- |
| `lib/db/schema.sql` | 7 (user/session/account/verification/organization/member/invitation) |
| `lib/billing/schema.sql` | 5 |
| `lib/website/schema.sql` | 16 |
| `lib/crm/schema.sql` | 13 |
| `lib/chatbot/schema.sql` | 10 |
| `lib/deployment/schema.sql` | 9 |
| `lib/whatsapp/schema.sql` | 9 |
| `lib/email-engine/schema.sql` | 8 |
| `lib/notifications/schema.sql` | 8 |
| `lib/guardian/schema.sql` | 7 |
| `lib/marketplace/schema.sql` | 7 |
| `lib/automation/schema.sql` | 6 |
| `lib/ai/schema.sql` | 6 |
| `lib/knowledge/schema.sql` | 4 (`kb_*`) |
| `lib/analytics/schema.sql` | 3 |
| `lib/memory/schema.sql` | 2 |
| **Approx total** | **~120 tables** |

### 11.3 Schema strengths

- Clear module ownership and FK to organizations  
- Versioned migrator + `schema_migrations`  
- Website indexes and media blob columns added via numbered migrations  
- Guardian integrity map now matches real table names and covers marketplace/whatsapp/email/knowledge/memory/chatbot  

### 11.4 Schema weaknesses

| Issue | Detail |
| --- | --- |
| Prefix inconsistency | Most modules prefix tables; billing uses bare `subscription` / `invoice` |
| Knowledge prefix | `kb_*` vs module name `knowledge` |
| Timestamp types | Auth `date` vs feature `text` ISO strings |
| Soft cross-module FKs | e.g. deployment `siteId` not always enforced to `website_site` |
| Secrets columns | Plaintext tokens in settings tables |
| Postgres | Not implemented yet (documented path only) |
| Rollback story | Forward-only; no down migrations |

### 11.5 Verdict

Schemas are **production-usable for a single-region Turso/SQLite SaaS**, internally coherent per module, with **known naming debt**. Not a blocker for closed pilot; encrypt secrets and keep using `db:migrate:all` for every environment.

---

## 12. API review

### 12.1 Surface by module (route counts)

| Module | Routes | Notes |
| --- | --- | --- |
| CRM | 29 | Broadest REST surface |
| Website | 26 | Includes AI generate + public forms/media |
| Guardian | 20 | Checks + scans + repairs |
| Chatbot | 19 | Includes public widget APIs |
| Deployment | 17 | Providers/monitoring |
| WhatsApp / Email / Analytics | 14 each | Channels + reports |
| Marketplace | 13 | Action-style enable/disable routes |
| AI | 13 | Conversations, tools, usage |
| Notifications | 11 | |
| Automation | 11 | Includes public webhook/API + queue worker |
| Billing | 10 | Stripe + Razorpay webhooks + jobs |
| Memory / Knowledge | 7 / 6 | |
| Workspace / Health / Auth | 1 each | Auth is Better Auth catch-all |

### 12.2 Conventions (mostly followed)

1. `try/catch` + module `*ErrorResponse`  
2. Auth via `require*MemberApi` / `require*ManagerApi`  
3. Errors as `{ error: string }`  
4. Public routes use `enforcePublicRateLimit`  

### 12.3 Inconsistencies

| Area | Variation |
| --- | --- |
| Overview keys | `{ overview }` vs `{ stats }` vs ad-hoc |
| REST vs actions | CRM PATCH/DELETE vs marketplace POST `…/enable` |
| List envelopes | `{ items }` vs entity-keyed vs arrays |
| Public auth | Path secret vs header vs Stripe signature vs publicKey |
| Dual email namespaces | Auth mail vs product email engine |

### 12.4 Public / sensitive endpoints to keep in the threat model

- `/api/chatbot/public/[publicKey]/*`  
- `/api/website/public/forms/[formId]/submit`  
- `/api/website/media/file/[mediaId]`  
- `/api/whatsapp/webhook` (+ secret path variant)  
- `/api/automation/public/webhook/[secret]`, `/api/automation/public/api/[apiKey]`  
- `/api/email/track/*`, `/api/email/webhook*`  
- `/api/billing/webhook*`, billing job routes  
- `/api/health` (intentional unauthenticated liveness)  

### 12.5 Verdict

API coverage is **excellent for a monolith**. Consistency and public-auth hardening are the remaining work — not missing CRUD.

---

## 13. UI/UX review

### 13.1 Strengths

- Complete authenticated shell with workspace switcher and mobile menu (`GlobalNav`)  
- Module subnavs for deep areas (website studio especially rich: Build / Design / Grow)  
- Marketing site present with pricing/platform/contact  
- AI create path `/website/new/ai` with industry chips  
- Publish flow clarified in recent commits; live sites on `/p/[slug]`  
- Launch-blocker verify: signup → live works  

### 13.2 Weaknesses

| Issue | Detail |
| --- | --- |
| Crowded global nav | 16 workspace links, flat, no Build/Engage/Ops grouping |
| Editor discoverability | Probes fail to find fields/Save — customers may not understand section editing model |
| AI naming on first generate | Earlier runs titled site “New website”; branding improved in later verify but remains a polish risk |
| Billing nesting | Top-level “Billing” label → `/settings/workspace/billing` |
| Dual concepts | Chatbot knowledge vs Knowledge module; Email product vs auth email |
| Cognitive load | Product feels like an “ops console of consoles” for first-time SMB users |

### 13.3 Accessibility / mobile

- Mobile hamburger nav exists  
- Marketing + app should still be spot-checked on small viewports for website studio (dense)  
- Focus rings present on nav links  

### 13.4 Verdict

UI is **functionally complete** and **pilot-ready**, but **first-hour website editing UX** is the main product risk after security. Prioritize editor clarity over new modules.

---

## 14. AI integration review

### 14.1 Three AI surfaces

| Surface | Location | Role |
| --- | --- | --- |
| **Website AI generation** | `lib/website/ai/*` (~83 files) | Primary differentiator — structured multi-phase site generation |
| **Workspace AI assistant** | `lib/ai/*` + `/ai` UI | Tool-using assistant across CRM/website/guardian/etc. |
| **Chatbot** | `lib/chatbot/*` + public widget | Visitor chat with KB/memory bridges |

### 14.2 Website AI pipeline (mature)

Observed phases (code + recent commits):

1. Business planner / DNA / intelligence  
2. Website planner (structure)  
3. Generation orchestrator (section queue)  
4. Hero generator (sole home hero SoT)  
5. Creative director / composer / blueprint executor  
6. Builder adapter → persisted website builder JSON  
7. Quality audits (`scripts/audit-*-website-quality*`) — industry blueprint scores strong in skip-LLM mode  

Providers: OpenAI structured JSON path under `lib/website/ai/**/openai.ts` + LLM provider abstraction.

### 14.3 Assistant + chatbot

- Providers: OpenAI / Gemini / OpenRouter under `lib/ai/providers`  
- Chatbot has parallel provider types (duplication)  
- Entitlements: `aiCredits` on plans  
- Knowledge embeddings: OpenAI or weaker local hash fallback  
- Memory: entries + embeddings; vector driver supports sqlite/pgvector  

### 14.4 AI risks

| Risk | Detail |
| --- | --- |
| Cost / abuse | Public chatbot + assistant need credit + rate enforcement at every call site |
| Quality variance | LLM-on runs differ from deterministic blueprint audits |
| Dual stacks | Website AI ≠ assistant providers ≠ chatbot providers |
| Secret storage | Provider keys plaintext (SEC-1) |
| Embeddings silent degrade | Missing `OPENAI_API_KEY` → local hashes (documented) |

### 14.5 Verdict

AI website generation is **a core completed product pillar** and recent quality work shows intentional investment. Platform assistant/chatbot are **usable but less polished** than the website pipeline. Unify providers and lock secrets before broad tenancy.

---

## 15. Testing status

| Layer | Status |
| --- | --- |
| Unit / integration test framework | **None** (no Vitest/Jest/Playwright as project dependency) |
| CI (GitHub Actions etc.) | **None** (no `.github/`) |
| Manual verify scripts | **Many** — `scripts/verify-ai-*.ts`, `verify-editing-reliability*.ts`, `verify-product-publish-flow.ts`, etc. |
| Journey / E2E probes | `first-customer-journey.mjs`, `first-customer-journey-2.mjs`, `launch-blocker-verify.mjs` + `tmp/*/report.json` |
| Industry quality audits | `audit-industry-website-quality.ts`, `audit-real-world-website-quality.ts` |
| Lint | `npm run lint` (eslint-config-next) |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) |
| Health probe | `GET /api/health` |

### 15.1 Journey evidence (2026-07-30)

| Probe | Result |
| --- | --- |
| `launch-blocker-verify` | **Pass** — signup, org active, generate, publish, live 200, quota after delete |
| `first-customer-journey-2` | Partial — generate/publish worked; **activeOrganizationId missing after login** (manual set); editor fields hard to find |
| `first-customer-journey` | Failures on older AI form shape / publish 404 paths — largely superseded by later fixes |

### 15.2 Verdict

Testing is **script-heavy but not CI-enforced**. Treat as **~25%** mature. Highest leverage: wire existing smoke/journey scripts into CI on every PR.

---

## 16. Deployment readiness

### 16.1 Ready for closed pilot (with conditions)

| Check | Status |
| --- | --- |
| Auth + workspace bootstrap | Ready |
| Signup → AI site → publish | Ready (verified) |
| Billing free plan without Stripe | Ready |
| Paid Stripe/Razorpay | Ready if env configured |
| DB migrate-all | Ready |
| Turso/libSQL remote | Ready (documented) |
| Media on Vercel | Ready via `MEDIA_STORAGE_DRIVER=db` or S3/R2 |
| Security headers / rate limits / WhatsApp HMAC / media auth | Ready |
| `/api/health` | Ready |
| Automation worker process | **Must be deployed separately** |
| Secrets encryption | **Not ready** |
| CAPTCHA / transcript binding | **Not ready for open traffic** |
| CI gates | **Not ready** |

### 16.2 Environment readiness checklist

**Required:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`  

**Strongly recommended for pilot:** `RESEND_API_KEY`, `EMAIL_FROM`, `OPENAI_API_KEY` (website AI + embeddings), `AUTOMATION_WORKER_SECRET` + worker, `WHATSAPP_APP_SECRET` if WhatsApp enabled, Stripe/Razorpay vars if charging, `MEDIA_STORAGE_DRIVER` appropriate to host, `BILLING_JOB_SECRET` for trial jobs.

**Documented but unimplemented:** `MABPS_SECRETS_KEY` encryption behavior.

### 16.3 Hosting notes

- Prefer **Node server** (or compatible) + **Turso** + **S3/R2 or DB blobs** + **worker process**  
- Single local SQLite file is fine for demos only  
- Multi-instance requires shared DB + non-local media + Redis/Upstash for shared rate-limit/cache  

### 16.4 Readiness scores

| Gate | Score |
| --- | --- |
| Internal demo | **95%** |
| Closed paying pilot (few tenants) | **85%** |
| Public self-serve launch | **62%** |
| Multi-region scale | **40%** |

---

## 17. What should be done next (exact order)

Do **not** start Products/Categories or large P2 refactors until the security + CI gate below is green.

### Phase A — Stop the remaining holes (days 1–4)

1. **Encrypt secrets at rest** (implement `MABPS_SECRETS_KEY`; migrate existing plaintext tokens).  
2. **Chatbot visitor session secret** on public messages GET/POST.  
3. **Knowledge path containment** on read/delete.  
4. **Automation auth out of URL paths** (headers; rotate existing secrets).  
5. **CAPTCHA / challenge** on public forms + chatbot leads.  

### Phase B — Make regressions impossible (days 4–7)

6. **Add CI**: `lint` → `typecheck` → smoke scripts (media auth, WhatsApp signature reject, rate-limit 429, marketplace unknown-action deny, launch-blocker journey).  
7. **Run automation worker** in staging/prod with process monitoring.  
8. **Editor UX fix**: visible Save / clearer section editing (address journey “no save button” class of failures).  
9. **Re-run** `launch-blocker-verify` + `first-customer-journey-2` on staging; fix any `activeOrganizationId` login regression.  

### Phase C — Soft public launch bar (days 7–14)

10. Confirm Stripe/Razorpay webhooks + trial job cron secrets on production.  
11. Confirm Resend + OpenAI keys; Guardian recommended-env green.  
12. Mobile spot-check of website studio + marketing.  
13. Monitoring: health checks, webhook failure alerts, rate-limit metrics.  
14. Open **limited** public signup (invite or waitlist) before fully open.  

### Phase D — Post-launch hygiene (parallel after Phase C)

15. Nav grouping (Build / Engage / Ops / AI).  
16. CRM volume entitlements.  
17. Unify LLM provider stacks.  
18. KB ownership docs + API clarification.  
19. API envelope standardization (new routes first).  
20. Structured logging.  

### Phase E — Scale only when metrics demand

21. Postgres cutover (when Turso/SQLite limits hit).  
22. Default pgvector / dedicated vectors for large KB.  
23. Shared Redis rate-limit/cache for multi-instance.  
24. Marketplace purchase maturity + deployment↔website hard link.  
25. Products/Categories **only if** product explicitly commits.  

---

## Appendix A — Module status matrix

| Module | lib | API | UI | Components | Schema | Migrate CLI | Entitlements |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Auth / workspace | ✓ | ✓ | ✓ | ✓ | ✓ | Better Auth + all | free sub on create |
| Billing | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Website | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | sites, storageMb |
| CRM | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | members only |
| Chatbot | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | via AI path |
| Knowledge | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Memory | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| AI assistant | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | aiCredits |
| Automation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | automations |
| WhatsApp | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Email | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Analytics | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | reads usage |
| Deployment | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Guardian | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Marketplace | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | plugins |
| Products / Categories | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | — |

## Appendix B — Reconciliation with July 19 architecture audit

Major progress since `docs/ARCHITECTURE_AUDIT.md`:

- Empty scaffolding removed  
- Marketplace migrate CLI added  
- Platform helpers + rate limits extracted  
- P0 media/WhatsApp/SVG/sanitize/marketplace-deny largely closed  
- Security headers, worker, S3/db media, Turso path, cache, naming redirects (`/sites`→`/website`) shipped  
- README + `.env.example` substantially improved  
- AI website generation pipeline built and quality-iterated  

Treat the July 19 audit as **historical**; this document is the **2026-07-30** completion snapshot.

---

## Appendix C — Approval gate

**No application code was changed for this audit.**  
Next implementation work should follow **§17 Phase A** unless you approve a different priority.

**Suggested approval prompt:**  
“Approve Phase A items H1–H5” or “Start with editor UX only” or “Pilot as-is; defer secrets encryption.”
