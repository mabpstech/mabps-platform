# MABPS naming policy

Canonical public names for domains that previously drifted across UI, API, `lib/`, and `components/`. **Database table prefixes stay stable** and are not renamed by this policy.

## Canonical map

| Domain | Public UI path | API prefix | `lib/` | `components/` | DB prefix |
| --- | --- | --- | --- | --- | --- |
| Website builder | `/website` | `/api/website` | `lib/website` | `components/website` | `website_*` |
| Automation | `/automation` | `/api/automation` | `lib/automation` | `components/automation` | `automation_*` |
| Email (product) | `/email` | `/api/email` | `lib/email-engine` | `components/email` | `email_*` |

## Exceptions (intentional)

- **`lib/email-engine`** — product email module. Kept distinct from **`lib/email.ts`** (auth transactional mail via Better Auth / Resend).
- **`/api/website/sites/...`** — resource path for site entities under the website module (not a naming split).
- **Public publish routes** — `/p/...` and `/site/...` remain the published-site surfaces; admin builder is `/website`.

## Legacy redirects

| Legacy | Canonical |
| --- | --- |
| `/sites`, `/sites/*` | `/website`, `/website/*` |
| `/automations`, `/automations/*` | `/automation`, `/automation/*` |

Configured in `next.config.ts`.

## Removed empty scaffolding (P2-3)

Deleted unused empty directories that conflicted with the real module layout:

- `features/*`
- `services/`
- `store/`
- `types/`
- `hooks/`
- `app/(dashboard)/` (real UI: `app/(app)/dashboard`)
- `app/(website)/` (real admin UI: `app/(app)/website`)
