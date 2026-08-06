# Songbird Terrace — Boarding Operations Platform (Plan v2)

**Status:** Superseded by the shipped implementation — kept as the record of what was decided and why.
Current truth lives in the platform repo: `prisma/schema.prisma` for data, `README.md` for behaviour.
**Date:** 2026-08-05
**Decisions locked in this revision:** new standalone site (existing waiver app untouched), single signing ceremony, Settings-driven everything, Drive archival for all documents, proration on, full test suite, animated revenue graph, backfill from the fees spreadsheet.

---

## 1. What we're building

A new, standalone admin platform for running the boarding business. **The existing waiver site keeps running exactly as it does today** — this is built as a separate project, tested locally, and deployed as its own site. Nothing is overwritten.

Three areas behind one login, all mobile-optimized:

1. **Dashboard** — revenue (with an animated growth/decline graph), boarder count, horses, feed demand, anything needing attention.
2. **Waivers** — existing waiver functionality, reskinned, now attachable to a boarder account (a boarder can carry extra waivers for family/other riders).
3. **Boarders** — create a boarder, build their term sheet, and send **one link** where they sign everything at once.

Plus **Settings**, which drives every variable in the system — prices, feed types, service list, dropdown options, templates. Nothing is hardcoded that the operator might want to change.

---

## 2. Decisions (from your answers)

| Question | Decision | How it's implemented |
| --- | --- | --- |
| **Proration** | **Yes** | First month is day-counted per the contract ("Payment due for partial months will be calculated based on the number of days in the month"). The wizard shows the prorated first-month amount, the full monthly rate, and the balance due, all computed live. |
| **Re-papering on price change** | **Not needed** | A rate change updates the boarder's monthly amount going forward and logs the change. No forced re-signature. Signed documents keep their original snapshot; history stays honest. |
| **Waiver expiry / renewal** | **No** | Waivers do not expire. No renewal nagging on the dashboard. |
| **Blank rates on the sample term sheet** | **Settings page for all items** | Every rate, feed type, service, and dropdown option lives in Settings and is editable in the UI. Seeded from the real numbers in your fees spreadsheet (below). |
| **Signing** | **Single ceremony** | A new boarder gets one link and signs once — boarding agreement + liability waiver together, one signature, both documents produced and archived. |
| **Site strategy** | **New site** | New project, new repo, new Vercel deployment. Local testing first. Existing site untouched. |

---

## 3. Real data extracted from *Songbird Terrace Boarding Fees.xlsx*

This is what the system gets seeded and backfilled with.

### 3.1 Feed price list (sheet `input prices`) — seeds the Settings catalog

| Feed | Cost/bale | Flakes/bale | Cost/flake |
| --- | --- | --- | --- |
| Alfalfa | $19.00 | 12 | $1.583 |
| Timothy | $33.50 | 12 | $2.792 |
| Orchard | $30.00 | 12 | $2.500 |
| Teff | $28.75 | 12 | $2.396 |
| Timothy 3rd cut | $30.00 | 12 | $2.500 |

Monthly shipment reference: 70 Timothy · 30 Orchard · 20 Alfalfa (bales).

**This is the key modeling insight:** your real pricing is **per-flake, per-day**, not the flat "market value" line on the paper term sheet. A horse eats *N flakes/day* of each hay type; monthly feed cost = `flakes/day × cost-per-flake × 30`. The system models it exactly that way, so when hay prices move you change one number in Settings and every boarder's cost updates.

### 3.2 Current roster (sheet `feed cost`)

**13 boarder accounts, 18 horses.** Individual names, horses, and contact details are deliberately **not reproduced here** — they are customer PII and stay in the gitignored spreadsheet and the database. What matters for the design is the shape:

| Characteristic | What the sheet shows |
| --- | --- |
| Horses per boarder | 1 to 4 (most have 1; two accounts have 2; one has 4) |
| Board rate tiers | six distinct rates spanning roughly $800–$2,450/month |
| Add-ons in use | shavings (~$80–$120/mo), trailer parking |
| Feed types in use | Alfalfa, Timothy, Teff — 0.5 to 6 flakes/day per horse |
| Data-quality issues | one owner spelled two ways; one horse with no board rate; one with no feed plan |

Aggregate monthly total on that sheet is ≈**$21.9k**; the most recent monthly collection sheet shows ≈**$27.1k across 25 horses** (the gap is accounts that appear on the collection sheet but not the feed sheet).

Contact details (phone numbers, email addresses) exist on separate sheets and are matched to boarders by fuzzy name during import — again, held only in the gitignored source file and the database.

### 3.3 Revenue history — **June 2015 → June 2024**

~110 monthly sheets, each with per-boarder amounts, horse counts, and (for recent months) an expense block (labor, trash, toilet, insurance, hay, shavings) and computed profit. Example June 2024: income $30,000, expenses $12,436, profit $17,564.

**This is what feeds the animated dashboard graph** — nine years of real monthly revenue, not an empty chart waiting to fill up.

---

## 4. Data model

New Prisma schema in the new project.

```
Customer           status, type (BOARDER|ARENA), typeLockedAt, primary + secondary owner,
                   contacts, vet, emergency, address, notes, deposit held/returned,
                   billingActive, quickbooksCustomerId
Horse              customerId, name, breed/color/notes, status
ServiceCatalogItem code, name, category, unit, currentRate, isMarketRate, active, sortOrder
FeedType           name, costPerBale, flakesPerBale, costPerFlake (derived), active   ← Settings-driven
RateChange         item, oldRate, newRate, effectiveDate, note, changedBy             ← full price history
Agreement          customerId, templateId, startDate, effectiveFrom, supersededById, status,
                   deposit, monthlyTotal, adjustmentType (AMOUNT|PERCENT), adjustmentValue,
                   prorationDays, proratedFirstMonth, signedAt, signatureData,
                   pdfUrl, driveFileId, snapshot
TermSheetLine      agreementId, catalogItemId, horseId?, feedTypeId?, rateAtSigning,
                   quantity, lineTotal                                                 ← immutable snapshot
FeedPlan           horseId, feedTypeId, flakesPerDay                                   ← drives feed demand
SigningSession     tokenHash (UNIQUE), status, expiresAt, customerId?, agreementId?,
                   documentKinds[], signerName/Email/Phone/Address, isRiderWaiver,
                   sentAt, signedAt                                                    ← one session, N documents
SignedDocument     sessionId, kind, templateId, signerName/Email/Phone/Address,
                   source (ELECTRONIC|UPLOADED), signatureData?, contentSnapshot,
                   termSheetSnapshot?, originalFilename/uploadedBy/uploadNote,
                   pdfUrl, driveFileId, driveFolderId, archivedAt,
                   signedAt, ipAddress, userAgent                                      ← one row per document
InvoiceLine        quickbooksInvoiceId + lineNum (UNIQUE), quickbooksCustomerId, month,
                   itemName, quantity, rate, amount                                    ← what revenue was FOR
MonthlyBilling     quickbooksCustomerId + month (UNIQUE), invoiced, paid, invoiceCount ← what was charged
RevenueCategoryMapping  itemName (UNIQUE), category, auto                              ← QB item → report bucket
RevenueSnapshot    month, revenue, expenses, profit, horseCount, customerCount, source ← historical backfill
AppSetting         key, value (JSON)                                                   ← all prefill lists & options
Document archival  driveFolderId / driveFileId on every document row
```

> **`SigningSession.agreementId` is load-bearing, not decoration.** §5.3 requires
> voiding *"any other outstanding session for the same agreement"*. Scoped by
> `customerId` instead, that rule would void sessions belonging to a different
> agreement of the same customer — killing a live link someone is about to sign.
> An earlier draft of this table listed only `boarderId`, which would have led
> straight to that bug; the shipped code scopes by `agreementId`.
>
> **`SignedDocument` is the evidentiary record, which is why it is this wide.**
> It stores the exact text agreed to, who signed, from what address and browser,
> and whether the signature was captured electronically or the document was a
> scan of paper. A row that recorded only a PDF link would prove nothing if the
> agreement were ever disputed: the file could be regenerated from a template
> that has since been edited.
>
> **`prisma/schema.prisma` in the platform repo is authoritative.** This block
> is a design sketch and will drift; when the two disagree, the schema is right.

**Why this scales:** horses are rows (1, 3, or 7 all work) · two owners per lease supported · rates snapshot at signing so history is immutable · feed is per-flake so a hay price change ripples correctly · `AppSetting` means new dropdown options never require a code change · `InvoiceLine` means revenue can be attributed to what it was actually for, which an invoice total cannot be split back into.

**Changed since this plan was written:** `Boarder` became `Customer` with a `type` of `BOARDER` or `ARENA`, since arena riders keep no horse here and sign a different contract. `BoardingAgreement` became `Agreement` for the same reason. QuickBooks is the sole source of truth for billing, so nothing here compares a signed price against an invoice — reconciliation checks only for absence.

---

## 5. Interface

**Design language:** the existing warm ranch palette (espresso, cream, leather, gold — the tokens already in `globals.css`), Fraunces display / Inter body. Card-based, generous spacing, large tap targets, plain language, no jargon. **Mobile-first:** bottom tab bar on phones, sidebar on desktop; every table becomes cards on small screens.

### 5.1 Dashboard
- **KPI row:** Monthly Revenue · Active Boarders · Horses on Property · Pending Signatures.
- **Animated revenue graph** — the centerpiece. Nine years of real monthly revenue. Line/area chart that draws itself in on load, animated gradient fill, hover scrubbing with a value tooltip, growth-vs-decline coloring, and a headline delta ("▲ 12.4% year over year"). Range toggles (1Y / 3Y / All) animate between states rather than snapping. Built as custom SVG with spring motion — no generic chart-library look.
- **Feed outlook:** monthly bale demand by hay type, computed from every horse's feed plan.
- **Needs attention:** unsigned contracts (with re-send), boarders missing a waiver, stale feed prices.
- **Recent activity:** signatures, new boarders, rate changes.

### 5.2 Boarders
- **List:** searchable, status chips (Active / Pending signature / Prospect / Former), monthly amount, horse count.
- **Profile:** Overview (people, vet, emergency, horses) · Contract & pricing (term sheet lines, monthly total, deposit, signed PDF, adjustments) · Waivers (all under this account + add rider waiver) · History (rate changes, signature timeline, archived documents).
- **New Boarder wizard — 4 steps, phone-friendly:**
  1. **People** — primary + optional secondary owner, contacts, vet, emergency.
  2. **Horses** — add horses; per horse, set the **feed plan** (flakes/day by hay type) from Settings-driven dropdowns.
  3. **Term sheet** — services per horse from the catalog (rates prefilled, editable per line), bedding/shavings, trailer parking. Live **Monthly Total**, **Prorated first month** (day-counted from the start date), **Deposit**, **Balance Due** — the paper Addendum A, computed.
  4. **Review & send** — preview both documents, one button: *Send for signature*.

### 5.3 Single signing ceremony (`/sign/[token]`)
One link. The boarder reviews the **Boarding Agreement** (with their actual term sheet rendered as a clean table) and the **Release & Waiver of Liability**, checks acknowledgement for each, and **signs once**. That signature is applied to both documents. Two PDFs are generated, archived to Drive, emailed, and the boarder flips to **Active**.

Standalone waiver links (extra riders, non-boarders) remain a single-document flow — unchanged behavior.

#### Token lifecycle — required, not incidental

The token in the URL is a **bearer credential**: anyone holding it can read a boarder's contract, see their pricing and contact details, and execute a legally binding signature. It is treated accordingly:

| Rule | How |
| --- | --- |
| **Unguessable** | 256 bits of randomness from a CSPRNG. Brute force is not a practical attack. |
| **Stored hashed** | Only SHA-256 of the token is persisted, behind a unique index. The plaintext exists just long enough to build the outbound link. |
| **Shape-checked before any query** | A malformed token is rejected by a regex, so scanning junk values costs no database work. |
| **Expires** | Every session is created with `expiresAt`, from a Settings value (default 30 days, clamped 1–365). Enforced on both the page and the submit action. |
| **Single-use** | Signing moves the session to `SIGNED`; a second submit is refused. One link, one signature. |
| **One live link at a time** | Re-sending **rotates the token on the existing session** — a new token is generated, its hash replaces the old one, and the expiry is extended. The previously issued link stops working immediately. Any other outstanding session for the same agreement is `VOIDED`. |
| **Auditable** | Each executed document records IP address, user agent, and timestamp alongside the signature. |

Because only the hash is stored, an admin cannot read a live link back out of the system — there is no plaintext to recover. Re-sending therefore *cannot* reissue the same link even in principle; it rotates the token instead. That is a feature rather than a limitation: a link that was forwarded or leaked stops working the moment a replacement is issued.

Stated once, unambiguously, because a spec that says "reuse the existing link" would be unimplementable under hash-only storage and would push an implementer back toward keeping plaintext:

> **On every send or re-send:** generate a new token, store its hash on the existing session, extend the expiry, and void any other outstanding session for the same agreement.

One deliberate non-choice, recorded so it is a decision rather than an oversight:

- **No app-level rate limiting on the signing endpoint.** With a 256-bit token there is nothing to brute force, and an attacker without one only generates 404s. That is generic traffic abuse, and the control for it is **Vercel's platform-level DDoS protection and firewall** on the `boarding-operations` project — named here so the mitigation is explicit rather than assumed. Revisit if the endpoint ever accepts anything guessable.

An earlier revision of this document argued for storing tokens in plaintext, on the grounds that a database dump would already expose the signatures and PII the token guards. That reasoning was too narrow: a plaintext token also survives leaks much smaller than a full dump — read-only SQL injection, a query logged by accident, a stale backup, a support console — and in each of those it remains a live capability to execute a signature, while a hash is inert.

### 5.4 Waivers
Reskinned list (signed / pending), linked boarder shown where applicable, stage-new-waiver flow, PDF links, template editor.

### 5.5 Settings — *everything variable lives here*
- **Board & services:** stall types and rates, pasture, trailer parking, shavings, daily cleaning, custom line items. Add / rename / retire any of them.
- **Feed:** hay types with cost-per-bale and flakes-per-bale (cost-per-flake computed and shown). Add a new hay type any time.
- **Bulk price adjust:** raise or lower selected items by **$ or %**, with an effective date and a note. Writes full rate history.
- **Price history log:** every change, who and when.
- **Prefill lists:** dropdown options used across the app (horse colors/breeds, service categories, payment methods, boarder statuses) — all editable.
- **Documents:** boarding agreement and waiver legal text, versioned.
- **Operation:** barn name/address, late fee ($50 after the 5th), past-due interest (10% APR), default deposit rule, Drive archival folder.

---

## 6. Google Drive archival

Every document the system produces or imports is archived to Drive using the existing OAuth integration, in a real folder structure instead of one flat dump:

```
SongBird-Waivers/                     ← existing root, preserved
  Boarders/
    <Boarder Name>/
      Agreements/    boarding-agreement-<date>.pdf
      Waivers/       waiver-<rider>-<date>.pdf
      Documents/     imported/historical files
  Waivers/           standalone (non-boarder) waivers
  Archive/           superseded / terminated
```

Folder creation is idempotent (find-or-create, cached), uploads retry on transient failure, and every row stores both `driveFileId` and the shareable link so the admin UI can deep-link straight to the file. Historical PDFs pulled in during backfill land in the same structure, so Drive becomes the complete document archive.

---

## 7. Backfill

**From the spreadsheet (in hand, doing now):** roster (owners, horses, feed plans, board rates), contact info (phones, emails), the feed price list, and ~110 months of revenue history → seeded through an **Import Review** step so you confirm/correct before anything becomes a real record.

**From the barn's operations mailbox (when you provide access):** search the mailbox for signed contracts and waivers, parse boarder details and pricing, stage them in the same Import Review screen, and on approval attach the original PDFs into the Drive structure above. This path is proven — the same technique already recovered 15 historical waivers for the current site.

---

## 8. Testing & validation

A real suite, not a smoke test:

- **Unit (Vitest):** pricing engine — line totals, adjustments by amount and percent, **proration across month lengths and leap years**, deposit rules, feed-demand aggregation, MRR rollup, spreadsheet parsing.
- **Integration:** server actions against a real test database — boarder creation, term sheet persistence, signing state machine, rate-change history, settings updates.
- **E2E (Playwright):** the whole wizard, the single-signing ceremony, settings edits and bulk price adjust, dashboard rendering, waiver flow — run at **desktop and mobile viewports**.
- **Validation pass:** typecheck, lint, production build, accessibility checks on key screens, and a manual drive-through of the running app with screenshots.

Everything must be green, with failures fixed rather than skipped.

---

## 9. Build phases (all executed in this engagement)

1. Scaffold new project + local Postgres + test infrastructure
2. Data model & migrations
3. Pricing engine (proration, adjustments, feed math) + unit tests
4. Admin shell & design system (mobile-first)
5. Settings (price list + all variable items)
6. Boarders + new-boarder wizard
7. Single signing ceremony + PDF generation
8. Dashboard + animated revenue graph
9. Drive archival
10. Spreadsheet backfill (roster + 9 years of revenue)
11. Full test suite, run and fixed
12. Local verification, then deploy as a new site

---

## 10. Guardrails

- **Existing site untouched** — separate project, separate deployment, no changes to the running waiver app.
- Local development runs against a **local Postgres in Docker**; production database wiring is confirmed with you at deploy time.
- PDFs stay in-memory → Drive. No filesystem writes (Vercel is ephemeral).
- Customer PII never committed. Spreadsheet and any exported data stay gitignored.
- Auth model carried over: gated admin, JWT cookie, both existing admin users.
