# Songbird Waiver — Disaster Recovery Runbook

Last verified: 2026-04-17. If you're reading this because the app is down, start here. Each scenario lists **symptoms** so you can jump to the right section.

---

## 0. Where data lives (authoritative list)

| Thing | Primary location | Backup #1 | Backup #2 |
| --- | --- | --- | --- |
| DB schema | Supabase Postgres | `docs/schema.sql` (this repo) | `prisma/schema.prisma` (this repo) |
| Signed waiver records | Supabase table `SignedAgreement` | Gmail (`roy.rubin@gmail.com`, each waiver is BCC'd as PDF) | Google Drive folder `SongBird-Waivers/waivers/` |
| Signed waiver PDFs | Google Drive (`SongBird-Waivers/waivers/`) | Gmail attachments | — |
| Agreement template text | Supabase table `AgreementTemplate` | `docs/schema.sql` (seed) | Inside any past signed PDF (embedded as `agreementSnapshot`) |
| App source | GitHub `royrubin05/SongbirdRelease` | Local clone | Vercel deployment bundle |
| Secrets | Vercel → Settings → Env Vars | 1Password / password manager | — |

**If you lose the DB, you do not lose the legally-relevant data** — every signed waiver still exists as a PDF in Drive and as an email in Gmail. Rebuilding the DB rows from those is tedious but possible (see §4).

---

## 1. App stopped working — diagnostic ladder

Open the deployed URL. Look at what breaks:

1. **Page loads but "Application Error — could not connect to database"** → §2 (DB connection)
2. **Page loads blank / 500** → Vercel → Deployments → latest → Runtime Logs. Read the error.
3. **Google Drive upload fails but signing works** → §5 (OAuth)
4. **Supabase dashboard shows project "Paused"** → click "Restore project". Done in 1-3 min.
5. **Supabase project is gone entirely** → §3 (full recreate)

---

## 2. DB connection broken

### Symptoms
- `FATAL: (ENOTFOUND) tenant/user postgres.<ref> not found` → Supabase project paused or deleted
- `Can't reach database server` → Network/DNS issue or project suspended
- `password authentication failed` → Password rotated; env vars out of date

### Fix

1. **Log in to Supabase** (https://supabase.com/dashboard).
2. If the project banner says "Paused": click **Restore project** → wait 1-3 min → reload app.
3. If auth failure: go to **Project Settings → Database → Reset database password** (if you lost the password) or just copy the existing URI via **Connect → ORMs → Prisma**.
4. Update `DATABASE_URL` and `DIRECT_URL` in Vercel **Settings → Environment Variables** if the strings changed.
5. Redeploy (Vercel → Deployments → latest → **Redeploy**).

### Connection string reference

Both env vars point to the same Supabase project. Pooled is for runtime; direct is for DDL.

```env
# DATABASE_URL  — port 6543, pgbouncer, runtime queries
postgresql://postgres.<PROJECT_REF>:<URL_ENCODED_PASSWORD>@aws-<N>-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true

# DIRECT_URL    — port 5432, direct, for `prisma db push` / migrations
postgresql://postgres.<PROJECT_REF>:<URL_ENCODED_PASSWORD>@aws-<N>-<region>.pooler.supabase.com:5432/postgres
```

**Password URL encoding gotcha:** if your password contains `!`, `#`, `@`, `/`, `:`, `%`, etc., URL-encode it. `!` becomes `%21`, `#` becomes `%23`, etc. Safer to rotate to an alphanumeric password.

---

## 3. Recreate the database from scratch

Use this when: Supabase project was deleted, or you're migrating to a new provider (Neon, CockroachDB, self-hosted).

### Prerequisites
- Local clone of this repo
- Node.js 20+ and `npm` installed
- A fresh empty Postgres database + its connection string

### Steps

```bash
# 1. Install deps (only needed the first time)
npm install

# 2. Create a local .env with the new database's URLs.
#    (This file is gitignored.)
cat > .env <<'EOF'
DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...:5432/postgres"
EOF

# 3. Create all tables
npx prisma db push

# 4. Seed the default agreement template + one test row
npx tsx reset_and_seed.ts

# 5. Verify
npx tsx -e 'import { PrismaClient } from "@prisma/client"; \
  const p = new PrismaClient(); \
  p.agreementTemplate.count().then(n => console.log("templates:", n)).finally(() => p.$disconnect());'

# 6. Push DATABASE_URL + DIRECT_URL to Vercel env vars, redeploy
```

### SQL-only fallback

If Prisma is broken or unavailable, you can create the schema with plain SQL from any Postgres console:

```bash
psql "postgresql://..." -f docs/schema.sql
```

`docs/schema.sql` is the hand-maintained canonical version. Keep it in sync if you ever change `prisma/schema.prisma`.

---

## 4. Data recovery — rebuilding rows from Gmail / Drive

Every signed waiver BCCs a PDF to `roy.rubin@gmail.com` (see `lib/email.ts:5`). That Gmail archive is your source of truth for past signings if the DB is gone.

Each email typically contains:
- Customer name (email subject + body)
- Customer email (visible in To: field, minus the BCC)
- Signed-at timestamp (email received date)
- PDF attachment (contains full agreement snapshot and signature image)

Recovery workflow:
1. Search Gmail for `from:"Songbird Waiver Bot"` (or whatever display name `lib/email.ts` uses).
2. Extract customer name, email, and timestamp from each email.
3. Pull the PDF attachment (or match to a file in Drive's `SongBird-Waivers/waivers/` folder).
4. Re-insert a `SigningSession` + `SignedAgreement` row per email. Minimum viable fields:
   - `customerName`, `customerEmail`, `signedAt` from email headers
   - `agreementSnapshot` = the template text (if unchanged) or extracted from PDF
   - `signatureData` = a placeholder (`''`) if you can't extract from PDF; the legal artifact is the PDF itself
   - `pdfUrl` = the Drive file's shareable URL
5. Mark the session `isSigned = true`, `status = 'SIGNED'`.

The signature image inside the PDF is what matters legally — the base64 `signatureData` blob in the DB is just a convenience for re-rendering. You can recover without it.

---

## 5. Google OAuth / Drive upload broken

### Symptoms
- Signing works, customer gets confirmation, but PDF never appears in Drive
- Error log mentions `invalid_grant` or `401` from googleapis

### Fix

The refresh token in `GOOGLE_REFRESH_TOKEN` env var has expired or been revoked. Refresh tokens from Google OAuth can expire if:
- Not used for 6 months
- User changed account password
- User revoked app access at https://myaccount.google.com/permissions

Regenerate:
```bash
# Run locally; opens a browser for you to authorize
npx tsx scripts/get_refresh_token.ts
```

Then paste the new token into Vercel env as `GOOGLE_REFRESH_TOKEN` and redeploy.

`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` only change if you recreate the OAuth app in Google Cloud Console — rare.

---

## 6. Keep-alive cron (prevents Supabase auto-pause)

Supabase's free tier pauses projects after 7 days of inactivity. We avoid this with:

- **`.github/workflows/keep-alive.yml`** — GitHub Actions, runs daily at 14:17 UTC, curls `/api/health`.
- **`app/api/health/route.ts`** — endpoint that runs `prisma.agreementTemplate.count()` (a real DB query, counts as activity).

### What can break this
1. **GitHub disables scheduled workflows after 60 days of no commits to the default branch.**
   **Mitigation:** push any commit (README tweak, version bump) every month or two.
2. **Deploy breaks the health endpoint.** The cron job turns red in GitHub Actions, which emails you.
   **Mitigation:** the health endpoint returns 500 if the DB query fails — loud failures, not silent.
3. **Custom domain change.** The cron URL is hard-coded in the workflow. If you change domains, edit `.github/workflows/keep-alive.yml`.

### Manual ping (if you need to force activity)
```bash
curl https://songbird-waiver.platform63.com/api/health
# Expected: {"ok":true,"templates":1,"checkedAt":"..."}
```

---

## 7. Periodic manual backups (do every few months)

Even with keep-alive, do a full export occasionally. Paranoia is free.

### Option A: Supabase dashboard
**Project → Database → Backups** (available on paid tier). On free tier, use Option B.

### Option B: pg_dump from local
```bash
# Requires postgres client tools installed (`brew install libpq`)
PGPASSWORD='<your-password>' pg_dump \
  -h db.nykodezwrkdokvftesyg.supabase.co \
  -p 5432 -U postgres -d postgres \
  --no-owner --no-acl \
  > backups/supabase-$(date +%Y%m%d).sql
```

Store the dump somewhere durable — your Google Drive, an S3 bucket, encrypted and off-device. Do not commit dumps to this repo (they contain customer PII).

### Option C: App-level JSON export (no psql needed)
Write a small script that calls `prisma.signedAgreement.findMany({ include: { session: true } })` and dumps JSON. Easier than pg_dump but doesn't preserve the schema — only the data.

---

## 8. Environment variables (complete list)

| Var | Required for | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | Everything | Supabase → Connect → ORMs → Prisma (pooled) |
| `DIRECT_URL` | `prisma db push`, migrations | Supabase → Connect → ORMs → Prisma (direct) |
| `ADMIN_USERS` | Admin login | JSON map `{ "<email>": "<bcrypt hash>" }` — see §10 |
| `AUTH_SECRET` | Session cookie signing | Random 48+ byte base64url string |
| `GOOGLE_CLIENT_ID` | Drive upload, Gmail send | Google Cloud Console → OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | Drive upload, Gmail send | Google Cloud Console → OAuth credentials |
| `GOOGLE_REFRESH_TOKEN` | Drive upload, Gmail send | `scripts/get_refresh_token.ts` |
| `GOOGLE_DRIVE_FOLDER_ID` | Drive upload | Drive URL segment of parent folder |
| `NEXT_PUBLIC_SUPABASE_URL` | Future: Supabase client SDK (unused today) | Supabase → API settings |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Future: Supabase client SDK (unused today) | Supabase → API settings |

Check env vars are loaded in prod: `https://<your-domain>/debug/env` — that route reports presence (never values) of every variable the app expects.

---

## 10. Admin authentication — rotation & management

`/admin` and the per-session download route are gated behind a login form
at `/login`. Authentication is handled by `middleware.ts` + `lib/auth.ts`.
Credentials live entirely in env vars — no database table.

### How it works
- `ADMIN_USERS` is a JSON object: `{ "email": "bcrypt-hash", ... }`.
- `AUTH_SECRET` signs a 7-day JWT cookie (`songbird_session`, HttpOnly,
  Secure, SameSite=Strict).
- Middleware intercepts `/admin/*` and `/api/stage-waiver/*`; unauthenticated
  requests redirect to `/login?next=<original>`.
- `/api/health` is intentionally public (the keep-alive cron must reach it).
- `/sign/[id]` is public (customer-facing).

### To add or rotate a user

Run this locally from the repo root (it prints the final `ADMIN_USERS`
value you paste into Vercel):

```bash
npx tsx -e '
import bcrypt from "bcryptjs";
const users = {
  "roy.rubin@gmail.com": "<existing hash or new one below>",
  "aarubin@gmail.com":   "<existing hash or new one below>",
  "new.admin@example.com": await bcrypt.hash("<their plaintext password>", 12)
};
console.log(JSON.stringify(users));
'
```

Then:
```bash
npx vercel env rm ADMIN_USERS production --yes
printf '%s' '<the JSON above>' | npx vercel env add ADMIN_USERS production
npx vercel --prod --yes  # redeploy so the new env loads
```

### To revoke a user
Remove their email key from `ADMIN_USERS` and redeploy. Their active session
(up to 7 days) keeps working until cookie expires — to kill it immediately,
rotate `AUTH_SECRET` too (this signs out *everyone*).

### If you forget a password
You can't recover it (bcrypt is one-way). Use the same rotation flow above
to set a new hash for that email.

### Security notes
- Passwords should be generated by a password manager, minimum 16 chars.
- Never commit `ADMIN_USERS` or `AUTH_SECRET` to git — both are env-var-only.
- If you suspect compromise: rotate `AUTH_SECRET` first (logs everyone out),
  then rotate affected passwords.
- If the bcrypt hash leaks, a weak password gets brute-forced in hours.

---

## 9. Ownership / contacts

- **Primary owner:** Roy Rubin (`roy.rubin@gmail.com`)
- **Hosting:** Vercel (project: SongbirdWaiver), Supabase (project ref: `nykodezwrkdokvftesyg`)
- **Domain:** `songbird-waiver.platform63.com` (DNS via platform63.com)

If contact is unreachable and app needs to be recovered: everything you need is in this repo + the Gmail archive at `roy.rubin@gmail.com`.
