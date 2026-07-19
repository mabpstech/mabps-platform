# MABPS Authentication — Implementation Plan

**Status:** Planning only (no code)  
**Decision source:** `docs/AUTH_DECISION.md`  
**Library:** Better Auth (MIT)  
**Plugins:** Email/password (core), Google social provider, Organization plugin  
**Product mapping:** Better Auth **organization** = MABPS **workspace**

This document is the complete build plan for the Authentication module inside Core (see `IMPLEMENTATION_ORDER.md`). It covers structure, data, UI surfaces, APIs, and flows. It does not prescribe application code, package installs, or schema SQL.

---

## Goals

| Goal | Detail |
| --- | --- |
| Credentials | Email / password sign-up and sign-in |
| Social | Google OAuth sign-in / sign-up |
| Sessions | Database-backed sessions via Better Auth cookies |
| Tenancy | Multi-tenant workspaces via Organization plugin (roles, invitations, active org on session) |
| Framework | Next.js App Router handlers, server session helpers, and route protection |
| Ownership | Auth data lives in the MABPS database (no hosted IdP required) |

Out of scope for this plan: billing entitlements, 2FA/passkeys, API keys, and dashboard shell chrome beyond auth-related pages.

---

## 1. Folder structure

Proposed layout under the existing App Router project. Keep auth configuration and UI colocated; keep shared server helpers separate from route handlers.

```text
mabps-platform/
├── app/
│   ├── (auth)/                          # Public auth shell (no app chrome)
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   ├── reset-password/
│   │   │   └── page.tsx
│   │   └── accept-invite/
│   │       └── page.tsx                 # Invitation acceptance (token in query)
│   ├── (app)/                           # Authenticated app shell
│   │   ├── layout.tsx                   # Session gate + active workspace context
│   │   ├── onboarding/
│   │   │   └── page.tsx                 # Create first workspace if none
│   │   └── settings/
│   │       ├── account/
│   │       │   └── page.tsx
│   │       └── workspace/
│   │           ├── page.tsx             # General workspace settings
│   │           ├── members/
│   │           │   └── page.tsx
│   │           └── invitations/
│   │               └── page.tsx
│   └── api/
│       └── auth/
│           └── [...all]/
│               └── route.ts             # Better Auth catch-all handler
├── components/
│   └── auth/
│       ├── login-form.tsx
│       ├── signup-form.tsx
│       ├── forgot-password-form.tsx
│       ├── reset-password-form.tsx
│       ├── google-sign-in-button.tsx
│       ├── sign-out-button.tsx
│       ├── accept-invite-panel.tsx
│       ├── create-workspace-form.tsx
│       ├── workspace-switcher.tsx
│       ├── member-list.tsx
│       ├── invite-member-form.tsx
│       └── invitation-list.tsx
├── lib/
│   ├── auth/
│   │   ├── server.ts                    # betterAuth instance + org plugin config
│   │   ├── client.ts                    # createAuthClient + org client plugin
│   │   ├── session.ts                   # getSession / requireSession helpers
│   │   └── workspace.ts                 # Active org helpers (product: workspace)
│   └── db/                              # Existing or future DB client (adapter host)
├── proxy.ts                             # Next.js request proxy / auth route protection
└── env                                  # Documented env vars (GOOGLE_*, AUTH_SECRET, etc.)
```

### Structure rules

- All Better Auth HTTP traffic goes through `app/api/auth/[...all]`.
- Product UI says **workspace**; server config may use Better Auth’s **organization** naming.
- Client components under `components/auth/` call the auth client; server pages load session via `lib/auth/session.ts`.
- Route protection lives in `proxy.ts` (or the project’s equivalent Next.js edge/proxy layer) plus layout-level session checks for `(app)`.

---

## 2. Database tables

Better Auth owns the identity schema. Use the library’s recommended tables (via adapter / CLI when implemented). Below is the logical model for MABPS Core auth + organizations.

### Core identity tables

| Table | Purpose | Key fields (logical) |
| --- | --- | --- |
| `user` | Platform identity | `id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt` |
| `session` | Database-backed sessions | `id`, `userId`, `token`, `expiresAt`, `ipAddress`, `userAgent`, `activeOrganizationId`, `createdAt`, `updatedAt` |
| `account` | Credential / OAuth links | `id`, `userId`, `providerId`, `accountId`, password hash (credential), OAuth tokens (Google), `createdAt`, `updatedAt` |
| `verification` | Email verify / password reset tokens | `id`, `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt` |

### Organization (workspace) plugin tables

| Table | Purpose | Key fields (logical) |
| --- | --- | --- |
| `organization` | Workspace tenant | `id`, `name`, `slug`, `logo`, `metadata`, `createdAt` |
| `member` | User ↔ workspace membership | `id`, `organizationId`, `userId`, `role`, `createdAt` |
| `invitation` | Pending workspace invites | `id`, `organizationId`, `email`, `role`, `status`, `inviterId`, `expiresAt`, `createdAt` |

### Relationships

```text
user 1──* session
user 1──* account
user 1──* member *──1 organization
user 1──* invitation (as inviter)
organization 1──* member
organization 1──* invitation
session.activeOrganizationId → organization.id (nullable until set)
```

### Tenancy notes

- Every authenticated product action after onboarding assumes an **active workspace** (`session.activeOrganizationId`).
- Roles (minimum for V1 Core): `owner`, `admin`, `member` (align names with Better Auth Organization defaults when implementing).
- Do not invent parallel workspace tables for auth; extend later modules with `workspaceId` / `organizationId` foreign keys pointing at `organization.id`.
- Email delivery for verification, reset, and invites is application-owned (SMTP or transactional provider); tokens stay in `verification` / `invitation`.

### Environment / secrets (data plane, not tables)

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Session / token signing secret |
| `BETTER_AUTH_URL` | Canonical app URL for callbacks |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| Database URL | Adapter connection for the tables above |
| Email provider credentials | Verification, reset, invite delivery |

---

## 3. Routes

### Public (unauthenticated allowed)

| Route | Auth expectation |
| --- | --- |
| `/login` | Guest only; redirect to app if session exists |
| `/signup` | Guest only |
| `/forgot-password` | Guest only |
| `/reset-password` | Guest only (token required) |
| `/accept-invite` | May be guest or signed-in; token required |
| `/api/auth/*` | Better Auth handler (all methods) |

### Protected (session required)

| Route | Auth expectation |
| --- | --- |
| `/onboarding` | Session required; no workspace yet (or create additional) |
| `/settings/account` | Session required |
| `/settings/workspace` | Session + active workspace + role check |
| `/settings/workspace/members` | Session + active workspace + admin/owner |
| `/settings/workspace/invitations` | Session + active workspace + admin/owner |

### Redirect policy

| Condition | Destination |
| --- | --- |
| Guest hits protected route | `/login` with `callbackUrl` |
| Signed-in user hits `/login` or `/signup` | App home or `/onboarding` |
| Signed-in, zero memberships | `/onboarding` |
| Signed-in, memberships, no active org | Set active org (first / last used), then continue |
| Signed-in with active org | App shell home (dashboard placeholder for later Core work) |
| Invite accepted | Active org set to invited workspace → app home |

---

## 4. Pages

| Page | Responsibility |
| --- | --- |
| **Login** | Email/password form + Google button; link to signup and forgot password |
| **Signup** | Name, email, password + Google button; optional post-signup email verification step messaging |
| **Forgot password** | Request reset email by address |
| **Reset password** | Set new password using token from email link |
| **Accept invite** | Show workspace name/role; if guest → signup/login then accept; if signed-in → accept membership |
| **Onboarding** | Create first workspace (name + slug); set as active organization; continue into app |
| **Account settings** | Profile (name, image), email display, linked accounts (credential / Google), sign out |
| **Workspace settings** | Rename workspace, slug, logo (owner/admin) |
| **Members** | List members, change roles, remove members (permissioned) |
| **Invitations** | Create invites, list pending, revoke |

### Page behavior notes

- Auth pages share a minimal `(auth)` layout (brand + form column); no dashboard nav.
- `(app)` layout loads session server-side; if missing, redirect before render.
- Onboarding is blocked from the main app until at least one membership exists.
- Settings pages are the first permission-aware UI surfaces for the Organization plugin.

---

## 5. Components

| Component | Type | Role |
| --- | --- | --- |
| `login-form` | Client | Email/password sign-in; error/success states |
| `signup-form` | Client | Registration fields; optional password rules UX |
| `forgot-password-form` | Client | Request reset |
| `reset-password-form` | Client | Submit new password + token |
| `google-sign-in-button` | Client | Starts Google OAuth via auth client |
| `sign-out-button` | Client | Ends session; returns to `/login` |
| `accept-invite-panel` | Client/Server hybrid | Displays invite; triggers accept after auth |
| `create-workspace-form` | Client | Name/slug → create organization + set active |
| `workspace-switcher` | Client | Lists memberships; sets `activeOrganizationId` |
| `member-list` | Client | Renders members; role update / remove actions |
| `invite-member-form` | Client | Email + role → create invitation |
| `invitation-list` | Client | Pending invites + revoke |

### Shared UX expectations (no design system yet)

- Clear inline errors from Better Auth API responses.
- Disable submit while pending; no double-submit.
- Google button available on both login and signup.
- Workspace switcher visible in `(app)` chrome once Core dashboard shell exists (placeholder ok).

---

## 6. API endpoints

All auth HTTP endpoints are served by the Better Auth catch-all:

`/api/auth/[...all]`

Do not add parallel custom `/api/login` routes for core auth. Use Better Auth’s paths (exact path names follow the library version chosen at implement time). Logical operations:

### Session & identity

| Operation | Typical path family | Used by |
| --- | --- | --- |
| Get session | `GET /api/auth/get-session` | Server helpers, layouts, client |
| Sign up (email) | `POST /api/auth/sign-up/email` | Signup form |
| Sign in (email) | `POST /api/auth/sign-in/email` | Login form |
| Sign out | `POST /api/auth/sign-out` | Sign-out button |
| Social sign-in | `POST /api/auth/sign-in/social` (provider: `google`) | Google button |
| OAuth callback | Better Auth callback route under `/api/auth/*` | Google redirect |
| Forgot password | `POST /api/auth/forget-password` (or version-equivalent) | Forgot form |
| Reset password | `POST /api/auth/reset-password` | Reset form |
| Verify email | Better Auth verification routes | Email link |

### Organization (workspace)

| Operation | Typical path family | Used by |
| --- | --- | --- |
| Create organization | Organization plugin create endpoint | Onboarding / create form |
| List organizations | List memberships | Workspace switcher |
| Set active organization | Set active org on session | Switcher, post-create, post-accept |
| Update organization | Update name/slug/logo | Workspace settings |
| List members | Members endpoint | Member list |
| Update member role | Update member | Member list |
| Remove member | Remove member | Member list |
| Create invitation | Invite endpoint | Invite form |
| List invitations | List invites | Invitation list |
| Cancel invitation | Cancel invite | Invitation list |
| Accept invitation | Accept invite | Accept-invite page |

### Server-only access (not separate public APIs)

| Helper | Purpose |
| --- | --- |
| `auth.api.getSession` (server) | SSR session for layouts/pages |
| Organization plugin server APIs | Permissioned mutations from server actions if preferred over client |

Optional later: thin Server Actions that wrap `auth.api.*` for forms—still no second auth protocol.

---

## 7. Session flow

```text
Browser                     Next.js                      Better Auth                 Database
   |                           |                              |                          |
   |-- request page ---------->|                              |                          |
   |                           |-- getSession (cookie) ------>|                          |
   |                           |                              |-- load session+user ---->|
   |                           |                              |<-- row / expired --------|
   |                           |<-- session | null -----------|                          |
   |                           |                              |                          |
   |  [if null + protected]    |-- 302 /login --------------->|                          |
   |  [if ok]                  |-- render with user+org -----|                          |
```

### Lifecycle

1. **Create** — Successful email/password or Google sign-in creates a `session` row and sets the session cookie.
2. **Read** — Each protected request resolves session from cookie → DB (server helper or proxy).
3. **Enrich** — If Organization plugin is enabled, session may include `activeOrganizationId` and org-related fields for the client.
4. **Refresh / expiry** — Expired or revoked sessions fail `getSession`; user is treated as guest.
5. **Destroy** — Sign-out deletes/invalidates session server-side and clears cookie.

### Protection layers

| Layer | Job |
| --- | --- |
| Proxy / middleware | Redirect unauthenticated users away from `(app)` routes; allow `/api/auth/*` and public auth pages |
| `(app)/layout` | Hard session check; load user + active workspace for children |
| Page / action | Role checks for admin/owner-only settings |

### Active workspace on session

- After login, if the user has memberships and no active org, set one (prefer last-used if stored in metadata; else first membership).
- Switching workspace updates `session.activeOrganizationId` without creating a new login session.
- Signing out clears identity session and active workspace context together.

---

## 8. Google login flow

```text
User                App (login/signup)           Better Auth                Google
 |                        |                            |                       |
 |-- click Google ------->|                            |                       |
 |                        |-- sign-in social(google) ->|                       |
 |                        |                            |-- redirect ---------->|
 |<----------------------- OAuth consent --------------------------------------|
 |-- callback ----------->|                            |                       |
 |                        |-- /api/auth/callback/... ->|                       |
 |                        |                            |-- exchange code ----->|
 |                        |                            |<-- profile/tokens ----|
 |                        |                            |-- upsert user+account |
 |                        |                            |-- create session      |
 |                        |-- set cookie + redirect -->|                       |
 |<-- /onboarding or app -|                            |                       |
```

### Implementation checklist (plan-level)

1. Create Google Cloud OAuth client (Web) with authorized redirect URI pointing at Better Auth’s Google callback under `/api/auth/...`.
2. Configure Google provider on the Better Auth server instance with client id/secret.
3. Expose Google button on `/login` and `/signup`.
4. On first Google login: create `user` + `account` (`providerId = google`); create session.
5. On returning Google login: link by provider account id; refresh tokens as library does; create new session.
6. If email already exists with credential account, follow Better Auth account-linking policy (decide at implement time: auto-link when email verified vs require same-method)—document the chosen policy in code comments later, not here as code.
7. Post-auth routing matches Session flow (onboarding vs app).

### Product rules

- Google is an alternate path, not a replacement for email/password in V1.
- Same post-login workspace rules apply as password login.
- Account settings should show that Google is linked when `account.providerId = google` exists.

---

## 9. Email / password flow

### Sign up

```text
1. User submits name, email, password on /signup
2. Better Auth creates user + credential account (hashed password in account)
3. Session created (or held until email verification if verification is required)
4. Send verification email if enabled (verification table)
5. Redirect: verify-pending messaging OR /onboarding if session is live
```

### Sign in

```text
1. User submits email + password on /login
2. Better Auth validates credentials against account password hash
3. On success: create session + cookie
4. Resolve active workspace (see §7 / §10)
5. Redirect to callbackUrl or default app / onboarding
```

### Forgot / reset password

```text
1. User submits email on /forgot-password
2. Better Auth stores reset token (verification) and app sends email with /reset-password?token=...
3. User submits new password on /reset-password
4. Password hash updated on credential account; token invalidated
5. Redirect to /login (optionally auto sign-in if library supports and product wants it)
```

### Sign out

```text
1. User triggers sign-out
2. Session invalidated in DB; cookie cleared
3. Redirect to /login
```

### Email / password policy (V1 plan defaults)

| Topic | Plan default |
| --- | --- |
| Email uniqueness | Enforced at user level |
| Password rules | Follow Better Auth defaults; surface UX hints on signup/reset |
| Email verification | Prefer enabled before sensitive workspace admin actions; exact gate timing chosen at implement |
| Enumeration | Prefer generic “if that email exists…” messaging on forgot-password |

---

## 10. Multi-tenant organization flow

MABPS workspaces are Better Auth organizations. Every subsequent Core module scopes data by active workspace id.

### A. First workspace (onboarding)

```text
1. User completes signup or Google login
2. If member count == 0 → /onboarding
3. User creates workspace (name + unique slug)
4. System creates organization + owner membership
5. System sets session.activeOrganizationId
6. Redirect into app shell
```

### B. Invite member

```text
1. Owner/admin opens /settings/workspace/invitations
2. Submits invitee email + role
3. Invitation row created; email sent with /accept-invite?token=... (or library URL)
4. Invitee opens link
   - If not signed in: login/signup, then accept
   - If signed in with matching email: accept
5. Member row created; invitation marked accepted
6. Set active organization to invited workspace (or prompt to switch)
```

### C. Switch workspace

```text
1. User opens workspace switcher (memberships list)
2. Selects target workspace
3. Better Auth sets active organization on current session
4. App reloads workspace-scoped UI/data
```

### D. Role & permission gates

| Action | Minimum role (V1) |
| --- | --- |
| View app in workspace | `member` |
| Invite / revoke invites | `admin` or `owner` |
| Change member roles | `admin` or `owner` (owner-only for transferring ownership if supported) |
| Remove members | `admin` or `owner` |
| Update workspace settings | `admin` or `owner` |
| Delete workspace | `owner` (later; not required for first auth slice) |

### E. Tenancy invariants

- A user may belong to many workspaces; only one is **active** per session.
- No workspace-scoped product API should trust a client-sent workspace id alone; always verify membership and prefer `session.activeOrganizationId`.
- Leaving or being removed from the active workspace clears/resets active org to another membership or sends user to onboarding.
- Slugs are unique and used for human-readable workspace identity; internal foreign keys use `organization.id`.

### F. Sequence summary

```text
Signup/Login → (optional verify email) → Ensure membership
       │
       ├─ none → Create workspace → Set active → App
       │
       └─ some → Ensure active org → App
                    │
                    ├─ Invite others (admin/owner)
                    ├─ Accept invites
                    └─ Switch active workspace
```

---

## Implementation sequence (when coding starts)

Suggested order so each step is testable:

1. Database adapter + Better Auth core tables + `/api/auth/[...all]`
2. Email/password signup, login, logout + session helpers + proxy protection
3. Auth pages and forms (`login`, `signup`, sign-out)
4. Password reset + email provider wiring
5. Google provider + button + callback verification
6. Organization plugin tables + create workspace onboarding
7. Active organization on session + workspace switcher
8. Invitations + accept-invite page + members/settings UI
9. Role checks on workspace settings routes
10. Smoke test all three flows (session, Google, email/password) with multi-workspace switching

---

## Acceptance criteria

- [ ] Guest cannot access `(app)` routes
- [ ] Email/password signup and login create a durable DB session cookie
- [ ] Google login creates or reuses user and establishes the same session model
- [ ] Password reset completes via emailed token
- [ ] New user without memberships is forced through workspace onboarding
- [ ] User can create a workspace, see it as active, and switch among memberships
- [ ] Owner/admin can invite by email; invitee can join and land in that workspace
- [ ] Sign-out clears session and blocks `(app)` until next login
- [ ] No custom auth tables duplicate Better Auth’s user/session/account/org model

---

## References

- `docs/AUTH_DECISION.md` — choose Better Auth; Organization plugin for tenancy
- `IMPLEMENTATION_ORDER.md` — Auth is part of Core module 1
- Better Auth docs (at implement time): Next.js integration, email/password, Google, Organization plugin, database adapters
