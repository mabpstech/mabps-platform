# MABPS — First Local Run Checklist

Use this checklist for the first local run after development. Do not add features here; follow the commands in order.

**Stack:** Next.js 16 · React 19 · Better Auth · SQLite (`better-sqlite3`)  
**Default URL:** http://localhost:3000  
**Default DB file:** `./data/mabps.db`

---

## Preflight verification (already checked)

| Check | Status |
| --- | --- |
| Dependencies in `package.json` | OK — 8 runtime + 10 dev; lockfile present (`package-lock.json`) |
| `node_modules` | Present when previously installed; re-run `npm install` on a clean machine |
| Scripts | OK — `dev`, `build`, `start`, `lint`, `db:migrate:all`, per-module migrators, `automation:worker` |
| Environment template | OK — `.env.example` lists all runtime variables |
| Database | OK — SQLite via `DATABASE_URL` (default `./data/mabps.db`); created on migrate |
| Migrations | OK — preferred path is `npm run db:migrate:all` (baseline module schemas + `migrations/*.sql`) |
| Demo seed CLI | **Not available** — no `db:seed` (or similar) script |
| TypeScript (`npx tsc --noEmit`) | 1 error in `app/api/website/media/file/[mediaId]/route.ts` (Buffer vs `BodyInit`); does not block `npm run dev` for core auth/workspace flow |

---

## 1. Prerequisites

- Node.js 20+ (verified with Node 20 / npm 10)
- From the repo root:

```bash
cd /Users/apple/Desktop/MABPS/mabps-platform
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Configure `.env`

```bash
cp .env.example .env
```

Generate a secret and set required values:

```bash
openssl rand -base64 32
```

Edit `.env` and set at least:

```bash
BETTER_AUTH_SECRET=<paste-openssl-output>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=./data/mabps.db
```

**Local first-run notes**

- Stripe, Google OAuth, Resend, OpenAI, WhatsApp, S3, and Redis keys are optional for signing up, logging in, and creating a workspace.
- Without `RESEND_API_KEY`, verification / reset / invite links are printed in the **dev server console**.
- Paid billing needs Stripe vars later; Free-plan bootstrap works without Stripe for workspace creation.
- Migration scripts default to `data/mabps.db` if `DATABASE_URL` is unset in the shell (same as `.env.example`).

---

## 4. Run database migrations

Preferred (versioned migrator — baseline modules + `migrations/*.sql`):

```bash
npm run db:migrate:all
```

Optional (auth CLI only; not required if `db:migrate:all` succeeded):

```bash
npm run db:migrate
```

Confirm the migrator prints `Done` and records `0001_baseline` (and any later SQL migrations).

---

## 5. Seed demo data

**Skip — no seed command is available.**

There is no `npm run db:seed` (or equivalent). Marketplace catalog seeding and website default pages happen later inside the app when those modules are used, not via a CLI seed step.

---

## 6. Start the development server

```bash
npm run dev
```

Leave this terminal running. The app listens on port 3000 by default.

Optional (only if you need background automation jobs; not required for first login/workspace):

```bash
# In a second terminal, after setting AUTOMATION_WORKER_SECRET in .env
npm run automation:worker
```

---

## 7. Open the browser

```bash
open http://localhost:3000
```

Or navigate manually to: http://localhost:3000

---

## 8. Create an account and log in

### First-time account (recommended)

1. Open http://localhost:3000/signup  
   or:

```bash
open http://localhost:3000/signup
```

2. Fill **Name**, **Email**, **Password** (min 8 characters).
3. Fill **Workspace name** and **Workspace slug** (required on signup unless accepting an invite).
4. Submit. On success you are signed in and routed to `/dashboard` (workspace created in the same flow).

### Returning login

```bash
open http://localhost:3000/login
```

Sign in with the email and password from signup.

---

## 9. Create the first workspace

**If signup already created a workspace:** you are done — you should land on `/dashboard`.

**If the account exists but no workspace was created** (signup showed a follow-up message, or you signed up via invite flow):

```bash
open http://localhost:3000/onboarding
```

1. Enter **Workspace name** and **Workspace slug**.
2. Submit **Create workspace**.
3. Confirm redirect to `/dashboard`.

To create an additional workspace later:

```bash
open http://localhost:3000/onboarding?new=1
```

---

## Quick command sequence (copy/paste)

```bash
cd /Users/apple/Desktop/MABPS/mabps-platform
npm install
cp .env.example .env
# Edit .env: set BETTER_AUTH_SECRET from `openssl rand -base64 32`
npm run db:migrate:all
# No seed step available
npm run dev
```

In another terminal (or the browser):

```bash
open http://localhost:3000/signup
```

Then complete signup (includes first workspace) → confirm `/dashboard`.  
For a later session: `open http://localhost:3000/login`.
