# TODO

Rewritten 2026-08-19. **Open work only.** Everything that shipped was deleted from this file — the
code and `git log` are the record of what was built and why. Nothing below is done.

---

## At a glance

**Blocked — nothing, as it turns out**

1. ~~[`pnpm db:generate`](#1-pnpm-dbgenerate-needs-a-human-at-a-tty--stale-and-it-was-stale-when-written)~~ — **stale**; the
   migration exists and the tables are live

**Frontend**

2. [Five video-domain files still on `TRANSPORT: mock`](#2-the-video-domain-is-still-mocked)
3. [Sixteen stub routes rendering a bare `<h1>`](#3-sixteen-stub-routes)
4. [Phase C — the admin freight console](#4-phase-c--the-admin-freight-console)
5. [Phase D — cost of goods, and therefore margin](#5-phase-d--cost-of-goods-and-therefore-margin)
6. [Five backend capabilities with no UI at all](#6-backend-capability-with-no-ui)
7. [Seven R&D api wrappers with no caller](#7-seven-rd-api-wrappers-have-no-caller)
8. [SEO leftovers — OG images, `manifest.json`](#8-seo-leftovers)
9. [Three things never exercised against live data or a browser](#9-never-exercised)

**Backend (`qatoto-backend`)**

10. [Privacy Part 3 — SHIPPED, behind two default-off flags](#10-privacy-part-3--shipped-behind-two-default-off-flags)
11. [`phone_number` column](#11-phone_number-column) — the panel calls a route that does not exist
12. [`updatedAt` on the store card schemas](#12-updatedat-on-the-store-card-schemas)
13. [Message attachments](#13-message-attachments)
14. [Liked / watch later / subscriptions](#14-liked--watch-later--subscriptions)
15. [Multi-axis variants](#15-multi-axis-variants)
16. [Incoterm semantics](#16-incoterm-semantics)
17. [Provider directory filters](#17-provider-directory-filters)

**Waiting on money, not on code**

18. [Freight rate data](#18-freight-rate-data) — every lane answers `no_active_rate_card` today

**[Decisions needed](#decisions-needed)** — the legal entity, four mailboxes, what Qatoto
contracts to do, two §14 calls, four freight/moderation calls, the Postgres ceiling.

---

## Blocked

### 1. ~~`pnpm db:generate` needs a human at a TTY~~ — STALE, and it was stale when written

**Checked against the live database on 2026-08-19: nothing here is true.**
`drizzle/0124_home_watch_metrics.sql` exists, is journalled, and all three tables —
`user_activity_hour`, `user_watch_daily`, `platform_activity_hour_daily` — are present in Postgres.
`GET /users/me/watch-time` and the five `GET /admin/metrics/*` endpoints are not 500ing for the
reason claimed here.

**And `db:generate` is the wrong tool regardless.** Every migration since `0046` is hand-written:
the snapshots in `drizzle/meta/` stop at `0054`, so drizzle-kit tries to recreate four phases of
tables and prompts questions nobody can answer. The workflow that works, and that `0126` used:

```bash
pnpm exec drizzle-kit export --sql     # canonical DDL, no database connection
# extract the new statements by hand into drizzle/NNNN_name.sql, with --> statement-breakpoint
# append an entry to drizzle/meta/_journal.json (it has NO trailing newline — keep it that way)
pnpm db:migrate
```

Also: `.oxfmtrc.json` now ignores `drizzle`. Without that, `pnpm fmt` reformats the snapshot files
and buries a hand-written migration in 5,000 lines of churn.

Still worth doing: `pnpm db:verify-watch-metrics-constraints`, which proves the composite primary
keys landed — without them the view beacon's `ON CONFLICT DO UPDATE` inserts instead of adding, and
watch time silently multiplies by the beacon count.

---

## Frontend

### 2. The video domain is still mocked

`rg -l "TRANSPORT: mock" src/` returns exactly five files, all of them video:

- `src/components/home/watch/comments.tsx`
- `src/components/home/watch/share-sheet.tsx`
- `src/components/home/watch/watch-content.tsx`
- `src/components/studio/series/series-editor-modal.tsx`
- `src/lib/videos/studio-view.ts`

The store and R&D surfaces have none. That `rg` is the check that this item is finished.

### 3. Sixteen stub routes

Each renders a bare `<h1>`. `rg -l "return <h1>" src/app` finds them, and all are `kind: "planned"`
in `src/lib/roadmap/site-roadmap.ts`, so the public roadmap is honest about them.

- **Twelve under `(studio)`** — analytics, comments, subtitles, copyright, customize, earn,
  funding, pitches, team, learn, support, feedback
- **Four under `(home)`** — `/customer-service`, `/advertise-with-us`, `/report-history`,
  `/policies-and-safety`

Each carries `robots: { index: false, follow: false }` with a comment saying REMOVE THIS LINE when
the page gets content. That is about the current state, not a policy about the route.

### 4. Phase C — the admin freight console

Unblocked since §19.10: both reads exist and `bandsEditable` rides on the shared projection, so the
console does not have to derive it. There is no freight UI anywhere under `src/app/(admin)/` or
`src/components/admin/` today; rate cards are consumed read-only in the buyer surfaces
(`home/store/sheets/delivery-sheet.tsx`, `home/store/sections/delivery-cost.tsx`).

**§19.11 is the operator sequence and is not optional reading.** A card authored the obvious way
can never have its bands edited, and a card with no band at `minBillableWeightGrams: 0` reports
every small consignment as an uncovered lane.

### 5. Phase D — cost of goods, and therefore margin

Revenue shipped; margin is what is left, and the input does not exist anywhere in the backend — no
cost column, no purchase record, no expense table. It needs a per-order-line cost the seller
enters, its write route, and the part that is not mechanical: **A13's declared-vs-measured split**.
A self-entered cost is a DECLARED stat sitting directly beside platform-MEASURED revenue, and the
wire has to make that visible or a seller will read an unverified number as a verified one.

Until then `src/components/commerce/sections/seller-earnings-panel.tsx` says margin is not shown
and why, rather than relabelling revenue.

### 6. Backend capability with no UI

Each of these exists on the wire and nothing in `src/` renders it:

- **A39's search facets** — five dimensions; the drill-down is blind to its own filter.
- **A40's incoterm enum** on the quote form, and `commerce_review_media_state`.
- **`POST /commerce/orders/:orderId/refunds`** — needs a control that can render
  `409 OVER_REFUND`, whose remaining balance rides in the envelope's `data`. **The shared transport
  drops that**, so this is a transport change as well as a UI one.
- **`checkout/prepare`'s `arrivalWindows`** — sent and `.strip()`ped today. The window is always
  null at prepare time and only `missingComponents` is meaningful, so rendering it needs a panel
  that names components without printing a date.

### 7. Seven R&D api wrappers have no caller

`getProjectEquity`, `listEquitySnapshots`, `listRoundBackers`, `verifyStatementChain`,
`getAuditHashInput`, `updateWorkshopChatMessage`, `deleteWorkshopChatMessage` — zero references
anywhere outside their own `.api.ts`. No hook wraps them either, which is why the hooks audit is
clean and this went unnoticed.

Each implies a surface that was specified and never built: a project equity panel, an
equity-snapshot history, a round-backers list, workshop chat message edit/delete, and a control
that verifies the audit hash chain. **Wire it or delete it** — an uncalled wrapper is unverified
code. Use the widened loop under [Verification](#verification), not the store-only one.

### 8. SEO leftovers

- `/store/product/[id]` has title, description and canonical but **no OG image and no per-page OG
  block**. Only the root layout, `/blogs/[slug]` and `/press/[slug]` carry one.
- `manifest.json` omits `start_url` and `description`.
- The six `/anime/*` routes are excluded from the sitemap while they read `@/mocks/anime-mocks` —
  real UI over fabricated content. They go in when they read real data.

### 9. Never exercised

- **`standardName`** — the seed creates 7 uncoded and 0 coded factory certifications, so the field
  added for it has never met a live payload.
- **The delivery-address 429** — the seeded checkout sends no `deliveryAddressId`, so the reveal
  404s before the limiter is in play.
- **The browser.** Every store contract above was asserted over HTTP. No screen has been watched
  rendering.

---

## Backend (`qatoto-backend`)

### 10. Privacy Part 3 — SHIPPED, behind two default-off flags

Built and verified against the live database on 2026-08-19. `POST /users/me/deletion-request`
deactivates immediately, revokes every session and schedules the anonymization 30 days out;
**signing in is the cancel** (`databaseHooks.session.create.before` in the backend's
`src/lib/auth.ts`), which is why there is no cancel endpoint and no pending-deletion UI — a
signed-in session implies an active account. `POST|GET /users/me/export` builds a gzipped JSON
archive into the private B2 bucket and hands back a 300-second presigned link. Both panels are
wired; `lib/privacy-request.ts` survives only as the residual-rights link and the failure fallback.

**Two things are still switched off**, and both are deliberate:

- `ACCOUNT_ANONYMIZATION_ENABLED` — default false. The job runs its full selection and logs the
  per-table counts it would touch, writing nothing. **Flip it only after reading those counts on
  real accounts.** This is the first irreversible scheduled job in the codebase.
- `DATA_EXPORT_ENABLED` — default false, and it gates the ROUTE (503), not the job. Until it is
  set, the panel renders the mailbox fallback.

**The audit that keeps it honest**, and it must be run after ANY migration that adds a `user`
reference — a table added next year is PII that survives an erasure, silently:

```bash
pnpm db:verify-anonymization-coverage   # 151 references, 0 missing, 0 stale
pnpm db:smoke-privacy                   # dry run; add ACCOUNT_ANONYMIZATION_ENABLED=true to erase
pnpm db:smoke-data-export               # real upload, real presigned download, real purge
```

The scrub is driven by ITERATING `src/modules/auth/privacy/anonymization-manifest.ts` — 31
deletes, 43 null-outs, 77 documented retentions. Nothing re-states a table name, which is what
stops the manifest being right while the job is wrong.

**What is left:**

- Neither flag has been flipped in production, so no real account has been erased or exported.
- **No screen has been watched in a browser.** Both panels typecheck, lint, build and are wired,
  and that is not the same thing as having seen the download button hand over a file.
- `community_forum_reply` gets `'[removed]'` rather than a real tombstone — its `body` is NOT NULL
  with a length CHECK and its `hidden` state needs a moderator id a job does not have. A proper
  `removed` state is the follow-up.
- `docs/BACKEND_STRUCTURE.md` still has no privacy section.

### 11. `phone_number` column

`session.user.phoneNumber` and `phoneNumberVerified` are declared client-side in
`src/lib/auth-client.ts` via `inferAdditionalFields`, and the backend has no `phoneNumber()` plugin
and no column — `rg phoneNumber qatoto-backend/src` returns nothing. The fields type-check and are
`undefined` at runtime, so `PhoneNumberPanel`'s OTP calls hit a route that does not exist and the
row reads "Not set" for everybody. The value shown is the honest one; **fixing it is backend work.**

### 12. `updatedAt` on the store card schemas

No store list projection carries a timestamp, so `src/app/sitemap.ts` cannot tell a crawler when a
product changed — only forum threads and problem clusters emit `lastModified` at all (6 of 128
entries). Adding it would improve recrawl behaviour across the whole catalogue.

### 13. Message attachments

Needs an upload path returning an authorized document id. The message body takes
`encryptedDocumentIds` of ALREADY-authorized documents, and the only multipart routes are
verification evidence and customization assets.

### 14. Liked / watch later / subscriptions

No routes mounted at all. `/library` ships playlists and names the rest.

### 15. Multi-axis variants

`commerce_product_variant_option{variantId, optionName, optionValue, position}`. A26 defers it
deliberately — building axes early migrates every row that reaches an immutable order-line
snapshot, for a UI nothing has asked for yet.

### 16. Incoterm semantics

Phase 23 shipped the vocabulary only; nothing branches on the value. Needed for port-to-port
pricing on an uncovered inland leg. Note the casing: `commerce_incoterm` is UPPERCASE, unlike every
other enum on the wire.

### 17. Provider directory filters

Six more query keys, and the UI to go with them. The directory has exactly one filter UI today
(kind chips), which is why the query keys were refused when they were first proposed — build the UI
and the keys together or neither.

### 18. Freight rate data

`delivery-sheet.tsx` works. The routes, tables and rating service all exist, and the rate tables
ship **empty by design** (A36). Every lane answers `no_active_rate_card` and `shippingInCents` is
permanently `0` until a forwarder lane list is purchased. Nothing to build — this is a buying
decision, and [the uncovered-inland-leg rule](#decisions-needed) should be settled before the money
is spent.

---

## Decisions needed

Each of these is a question for Vidyesh, not a task.

- **The legal entity.** `LEGAL_ENTITY_NAME`, `LEGAL_ENTITY_REGISTERED_ADDRESS`,
  `GOVERNING_LAW_JURISDICTION` and `GOVERNING_LAW_COURTS` in `src/lib/site.ts` all render as
  bracketed "TO BE CONFIRMED" text in the live privacy policy and terms. **Fill all four in one
  edit; nothing else changes.**
- **Does anyone read `support@qatoto.com`?** The privacy policy commits to answering data-subject
  requests within one month (Art. 12(3)) and every control in the app is a `mailto:` to it.
- **Three more addresses are hardcoded and unverified** — `security@qatoto.com` in
  `disclaimers/vulnerability-disclosure-policy.tsx` (×2), `careers@qatoto.com` in
  `information/careers.tsx` (×4), `press@qatoto.com` in `information/press.tsx` and
  `press-detail.tsx`. None goes through `lib/site.ts`. A vulnerability disclosure policy naming an
  unread inbox is the worst of the three.
- **What does Qatoto contract to do?** Both legal documents still describe a video sharing site —
  the terms call themselves "the Qatoto Video Sharing Site" — and neither mentions the store, R&D,
  orders, payments, equity or projects, which are the parts that create obligations between people.
  Rewriting them changes what they CLAIM, so the answer has to come first.
- **A consent banner becomes mandatory the moment any analytics, advertising or embedded
  third-party script ships.** Cookies are essential-only today and the policy says so in as many
  words; that sentence becomes false with the first script, and the banner is part of that change
  rather than a follow-up to it.
- **§14: cofounder capital range / equity ask.** Publishing what a person will invest beside a
  contact affordance is close to a securities solicitation, and how close is a per-market answer.
  The columns deliberately do not exist and `verify-store-phase-19-constraints` asserts their
  absence by name.
- **§14: "online revenue" on a public seller profile.** Publishable only on explicit consent —
  needs a consent column, a withdrawal path and a third wire member. **Not the same thing as the
  `/sales` earnings panel**, which is self-scoped and authenticated; a seller reading their own
  books needs no consent.
- **The uncovered-inland-leg rule.** Until it is settled, most real lanes show nothing _even after_
  rate data is bought. Worth deciding before spending on cards.
- **Below-smallest-band yields no option.** One reviewable row per card at
  `minBillableWeightGrams: 0` closes it — a data decision, documented as §19.11 step 4.
- **Should `POST /commerce/admin/freight-rate-cards` refuse a silent supersede?** §19.10's list
  route exists now, so an operator can see the incumbent and `supersedesRateCardId` becomes
  expressible.
- **Naming the reporter in the moderation queue.** `CommunityContentReportProjection` carries no
  reporter identity and the queue shows none. A moderator who can see who reported whom is a
  moderator who can be lobbied — worth deciding deliberately rather than by adding a schema field.
- **The Postgres ceiling.** `max_connections = 20` on the free-tier Aiven instance, and API +
  worker + a seed script is most of it. Either the per-process pool comes down or the plan goes up
  before anyone trusts a local run.

---

## Verification

The gate. Run all five — `pnpm exec tsc --noEmit` alone is the one command of the four that misses
a whole class of error that `next build` and oxlint both catch:

```bash
pnpm fmt && pnpm exec tsc --noEmit && pnpm lint && pnpm fmt:check && pnpm build
```

The backend needs **both** processes. Without the worker, payments accept and never settle, with an
EMPTY `last_error`:

```bash
cd ../../backend/qatoto-backend
pnpm dev          # the API
pnpm dev:worker   # pg-boss — DISPATCHES THE PAYMENT OUTBOX
pnpm db:seed-store-demo   # store-demo-{buyer,seller,staff}@example.invalid / store-demo-password-2026
```

A green `/health` proves nothing — it touches no database.

The uncalled-wrapper audits. Note `--no-filename`, without which every name is prefixed by its path
and the loop reports everything as uncalled — **and note the widened glob**, because the version
that only globbed `src/lib/store/*.api.ts` is why item 7 above went unnoticed for so long:

```bash
for h in $(rg --no-filename -o 'export function (use\w+)' -r '$1' src/hooks/ | sort -u); do
  rg -q "\b$h\b" src/components src/app || echo "UNCALLED $h"; done

for f in $(rg --no-filename -o 'export (?:async )?function (\w+)' -r '$1' \
    src/lib/store/*.api.ts src/lib/rnd/*.api.ts src/lib/admin/*.api.ts src/lib/account/*.api.ts \
    | sort -u); do
  rg -q "\b$f\b" src/hooks src/components src/app || echo "UNCALLED-API $f"; done
```

The first is silent today. The second prints the seven names in item 7.
