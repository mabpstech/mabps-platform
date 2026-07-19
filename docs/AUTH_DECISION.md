# MABPS Authentication Decision

**Date:** 2026-07-18  
**Status:** Decided  
**Final choice:** Better Auth

---

## Requirements

| Requirement | Must have |
| --- | --- |
| License | MIT, Apache 2.0, or BSD only |
| Commercial use | SaaS-friendly (no copyleft / no SaaS clause blockers) |
| Framework | Next.js App Router |
| Credentials | Email / password |
| Social | Google login |
| Tenancy | Multi-tenant ready (workspaces / orgs) |
| Sessions | First-class session management |
| Maturity | Production-ready |

MABPS Core (see `IMPLEMENTATION_ORDER.md`) needs auth plus multi-tenant workspaces as the foundation for billing, builder, CRM, and the rest of the platform. Auth must support that model without forcing a proprietary hosted identity product.

---

## Shortlist method

Candidates were filtered to **open-source**, **permissive license**, **Next.js App Router**, and **commercial SaaS** use. Closed SaaS-only products (Clerk, Auth0, WorkOS, etc.) were out of scope.

**Excluded from the top 3:**

| Option | Why excluded |
| --- | --- |
| Auth.js / NextAuth | **ISC license** (outside MIT / Apache 2.0 / BSD allowlist). Maintainers now recommend **Better Auth** for new projects; Auth.js is under Better Auth stewardship for security/maintenance. |
| Lucia | Package deprecated; maintainer guidance is to use Lucia docs as architecture reference, not as a dependency. |
| Logto | MPL 2.0 (outside allowlist). |
| Keycloak / Ory Kratos | Capable, but heavy separate IdP ops for a Next.js-first product core. |

---

## Top 3 options

### 1. Better Auth

| Attribute | Detail |
| --- | --- |
| License | **MIT** |
| Model | In-process TypeScript auth library (your DB, your app) |
| Next.js App Router | First-class (`better-auth/next-js` handlers, server session helpers, proxy/middleware patterns) |
| Email / password | Built-in |
| Google login | Built-in social provider |
| Multi-tenant | **Organization plugin** — orgs/workspaces, roles, invitations, active organization on session |
| Sessions | Database-backed sessions with cookie handling |
| Production readiness | Actively maintained; widely adopted for new TS/Next SaaS in 2025–2026; optional hosted Better Auth infrastructure later if needed |

**Strengths for MABPS**

- Matches the stack: TypeScript + Next.js, no separate auth microservice.
- Multi-tenancy is a first-class OSS plugin (aligned with MABPS workspaces).
- Email/password + Google without glue code.
- Plugin path for 2FA, passkeys, admin, API keys as product needs grow.
- Own user data and session store — clean for commercial SaaS and future compliance.

**Trade-offs**

- You operate email delivery, schema, and security hygiene (normal for self-hosted auth libraries).
- Younger than SuperTokens/Auth.js lineage; ops maturity is “library in your app,” not a dedicated IdP appliance.

---

### 2. SuperTokens

| Attribute | Detail |
| --- | --- |
| License | **Apache 2.0** (open-core; some features under separate EE licensing) |
| Model | SuperTokens Core service + backend/frontend SDKs (self-host or managed) |
| Next.js App Router | Official Next.js / React SDKs |
| Email / password | Yes |
| Google login | Yes (third-party / social recipes) |
| Multi-tenant | Strong multi-tenancy / org story — **often a paid / EE feature** when using their org & tenant product features |
| Sessions | Very strong (rotation, theft detection, anti-CSRF) |
| Production readiness | Battle-tested; mature session security story |

**Strengths for MABPS**

- Excellent session security defaults.
- Clear self-host or managed path.
- Apache 2.0 core is commercial-SaaS friendly.

**Trade-offs**

- Extra runtime: Core process (Docker/K8s) or managed dependency — more moving parts than an in-app library.
- **Org / multi-tenancy product features are open-core / paid**, which conflicts with wanting full multi-tenant readiness under pure OSS for MABPS Core.
- Heavier integration surface than Better Auth for a greenfield Next.js monolith/platform.

---

### 3. Supabase Auth (`supabase/auth`, formerly GoTrue)

| Attribute | Detail |
| --- | --- |
| License | **MIT** (Auth service); broader Supabase platform pieces vary (often Apache 2.0) |
| Model | Dedicated auth API (hosted Supabase or self-hosted stack) issuing JWTs; often paired with Postgres RLS |
| Next.js App Router | Official `@supabase/ssr` / SSR cookie patterns |
| Email / password | Yes |
| Google login | Yes |
| Multi-tenant | Auth multi-instance mode exists; **app workspace tenancy is usually DIY** (workspaces + membership tables + RLS) |
| Sessions | JWT + refresh token model; solid when using the Supabase client correctly |
| Production readiness | Very high at scale in the Supabase ecosystem |

**Strengths for MABPS**

- Proven identity service; great if the platform standardizes on Supabase Postgres + RLS.
- MIT-licensed auth server; commercial use is fine.
- Strong docs for Next.js SSR auth.

**Trade-offs**

- Pulls the product toward the Supabase architecture (or self-hosting a Go auth service + related stack).
- Workspace/org model is not a turnkey auth plugin the way Better Auth Organizations is — MABPS would still build membership, invites, and active workspace on top.
- Less ideal if MABPS wants a portable app-owned auth layer independent of Supabase.

---

## Comparison matrix

| Criterion | Better Auth | SuperTokens | Supabase Auth |
| --- | --- | --- | --- |
| License (allowlist) | MIT | Apache 2.0 | MIT |
| Commercial SaaS | Excellent | Excellent (watch EE features) | Excellent |
| Next.js App Router | Excellent | Good | Excellent |
| Email / password | Yes | Yes | Yes |
| Google login | Yes | Yes | Yes |
| Multi-tenant (OSS) | **Strong (org plugin)** | Strong but **often paid** | DIY / app-level |
| Session management | Strong | **Strongest** | Strong (JWT/refresh) |
| Ops complexity | Lowest (in-app) | Higher (Core service) | Medium–high (hosted or full stack) |
| Fit for MABPS Core workspaces | **Best** | Good if paying for MT | Good if all-in on Supabase |
| Production ready | Yes | Yes | Yes |

---

## Recommendation

### Choose: **Better Auth**

**Why this is the one choice for MABPS**

1. **License & commercial use** — MIT, no open-core tax on the org/workspace features MABPS needs on day one.
2. **Multi-tenant Core** — Organization plugin maps cleanly to MABPS workspaces (roles, invitations, active org in session).
3. **Next.js App Router native** — Handlers, server sessions, and client APIs fit the App Router without a separate IdP process.
4. **Required auth methods** — Email/password and Google are first-class.
5. **Sessions** — Production session model with data in your database; enough for SaaS without SuperTokens’ extra Core service.
6. **Ecosystem direction** — Auth.js/NextAuth maintainers point new projects at Better Auth; starting there avoids a near-term migration.

**When to revisit**

- Need SuperTokens-class session theft detection as a managed product, or are willing to pay for SuperTokens multi-tenancy EE.
- Standardize the entire backend on Supabase (Auth + Postgres + RLS) as a platform bet.

Until then, Better Auth is the best open-source authentication foundation for MABPS.

---

## Decision record

| Field | Value |
| --- | --- |
| Decision | Adopt **Better Auth** for MABPS authentication |
| Alternatives considered | SuperTokens, Supabase Auth |
| Not chosen | Auth.js (ISC; superseded guidance), Lucia (deprecated) |
| Next step (out of scope here) | Implement Better Auth + organization plugin as part of Core module 1 |
