# Songbird Waiver — Environment Orientation

**For Claude Code sessions.** Read this first, every time, before making assumptions about where things run or what's wired up.

---

## What this is

Next.js 16 app for Songbird Terrace liability waivers. Customer-facing flow at `/sign/[id]`, password-gated admin at `/admin`.

## Where it lives (authoritative)

| Layer | Platform | URL / Identifier |
| --- | --- | --- |
| **Production hosting** | **Vercel** — project `songbird-release` in team `roy-rubins-projects` | https://songbird-waiver.platform63.com (primary) · https://songbird-release.vercel.app (Vercel alias, also live) |
| **Database** | **Supabase** — project ref `nykodezwrkdokvftesyg`, region AWS us-west-2 | Connection strings in Vercel env `DATABASE_URL` (pooled 6543) and `DIRECT_URL` (5432) |
| **Source** | **GitHub** — `royrubin05/SongbirdRelease`, default branch `main` | Vercel auto-deploys on push to `main` |
| **Domain DNS** | **GoDaddy** (nameservers `ns39/ns40.domaincontrol.com`) | `songbird-waiver` CNAME → `cname.vercel-dns.com` |
| **PDF storage** | **Google Drive** folder `SongBird-Waivers/waivers/` | OAuth creds in Vercel env `GOOGLE_*` |
| **Outbound email** | **Gmail API** via googleapis OAuth | BCCs every signed waiver to `roy.rubin@gmail.com` |

**There is NO Firebase / Cloud Run / App Engine deployment.** Prior to 2026-04-20 there was a Firebase App Hosting deployment at the same custom domain; it was decommissioned during the Vercel cutover. Do not assume Firebase is involved.

## Owners

- Roy Rubin (`roy.rubin@gmail.com`) — primary
- A. Rubin (`aarubin@gmail.com`) — secondary admin

Both can sign into `/admin` via email + password (bcrypt hashes in `ADMIN_USERS` env var).

## Auth model

- `middleware.ts` gates `/admin/*` and `/api/stage-waiver/*`.
- Login at `/login` → server action verifies against `ADMIN_USERS` env (JSON map of email → bcrypt hash) → issues 7-day HS256 JWT cookie signed with `AUTH_SECRET`.
- Public paths: `/`, `/sign/[id]`, `/api/health`, `/login`.

## Keep-alive

Supabase free tier pauses after 7 days of inactivity. Prevention:
- `.github/workflows/keep-alive.yml` — GitHub Actions cron, daily 14:17 UTC, curls `/api/health` which runs a real Prisma query.
- If GitHub Actions stops running scheduled workflows (happens after 60 days of no repo commits), push any trivial commit to reactivate.

## Things that will bite you if you forget

1. **Custom domain is DNS-managed at GoDaddy, not at Vercel.** DNS changes happen there, not in Vercel's UI.
2. **Password in `DATABASE_URL` must be URL-encoded.** `!` is `%21`. Other safe reserved chars: `%23`=`#`, `%40`=`@`, `%3A`=`:`, `%2F`=`/`.
3. **`prisma db push` needs `DIRECT_URL` (port 5432).** pgBouncer (port 6543 in `DATABASE_URL`) can't do DDL.
4. **PDFs are generated in memory and streamed straight to Drive.** No filesystem writes anywhere in the runtime code. Keep it that way — Vercel serverless is effectively ephemeral.
5. **`waivers/` directory and any loose `*.pdf` files are gitignored** (they're customer PII). Never commit them.
6. **`.env` is gitignored.** All production values live in Vercel env vars.

## Critical commands

```bash
# Local development
npm install
npm run dev

# DB schema sync (after editing prisma/schema.prisma)
npx prisma db push

# Seed the default agreement template
npx tsx reset_and_seed.ts

# Production deploy (auto-deploy via GitHub push to main is preferred)
npx vercel --prod --yes

# Check live health
curl https://songbird-waiver.platform63.com/api/health
```

## Deeper references

- `docs/RECOVERY.md` — full disaster-recovery runbook (DB recreation, OAuth refresh, backup recipes, user rotation).
- `docs/schema.sql` — canonical SQL schema for provider-agnostic recreation.
- `prisma/schema.prisma` — Prisma source of truth.

## Conventions for this codebase

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.
- Brand palette tokens live in `app/globals.css` under `:root` — don't hard-code hex values in components, use the `var(--...)` tokens.
- Display font (Fraunces) via `var(--font-display)`; body (Inter) via `var(--font-sans)` — both wired through `next/font` in `app/layout.tsx`.
