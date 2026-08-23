# TODO

Rewritten 2026-08-19. **Open work only.** Everything that shipped was deleted from this file — the
code and `git log` are the record of what was built and why. Nothing below is done.

---

## At a glance

**Blocked — nothing, as it turns out**

- **§1** ~~[`pnpm db:generate`](#1-pnpm-dbgenerate-needs-a-human-at-a-tty--stale-and-it-was-stale-when-written)~~ — **stale**; the
  migration exists and the tables are live

**Frontend** — items 4 and 7 shipped and were deleted; item 2 moved to _Waiting on the backend_,
because it was never frontend work.

> **The §N markers are the section numbers and they have gaps.** Numbers are NOT reindexed when an
> item ships: they are anchors, and several sections cite `§19.10`/`§19.11` in the BACKEND contract,
> which a renumber would silently turn into references to the wrong thing. This list is bulleted
> rather than numbered for the same reason — markdown renumbers an ordered list sequentially, which
> would print numbers that disagree with the headings below.

- **§3** [Sixteen stub routes rendering a bare `<h1>`](#3-sixteen-stub-routes)
- **§5** [Phase D — cost of goods, and therefore margin](#5-phase-d--cost-of-goods-and-therefore-margin)
- **§6** [Five backend capabilities with no UI at all](#6-backend-capability-with-no-ui)
- **§8** [SEO leftovers — OG images, `manifest.json`](#8-seo-leftovers)
- **§9** [Three things never exercised against live data or a browser](#9-never-exercised)
- **§24** ~~[Feed preferences — the reviewable do-not-recommend list](#24-feed-preferences--the-reviewable-do-not-recommend-list)~~ —
  **all four parts shipped**; kept only for the follow-ups it left behind

**Backend (`qatoto-backend`)**

- **§10** [Privacy Part 3 — SHIPPED, behind two default-off flags](#10-privacy-part-3--shipped-behind-two-default-off-flags)
- **§11** [`phone_number` column](#11-phone_number-column) — the panel calls a route that does not exist
- **§12** [`updatedAt` on the store card schemas](#12-updatedat-on-the-store-card-schemas)
- **§13** [Message attachments](#13-message-attachments)
- **§14** [Liked / watch later / subscriptions](#14-liked--watch-later--subscriptions)
- **§15** [Multi-axis variants](#15-multi-axis-variants)
- **§16** [Incoterm semantics](#16-incoterm-semantics)
- **§17** [Provider directory filters](#17-provider-directory-filters)

**Waiting on the backend, not on the frontend**

- **§2** [The video domain's five `TRANSPORT: mock` banners](#2-the-video-domain-is-waiting-on-the-backend)

**Waiting on money, not on code**

- **§18** [Freight rate data](#18-freight-rate-data) — every lane answers `no_active_rate_card` today

**[Cross-pillar seams](#cross-pillar-seams)** — R&D, Store and Studio hold separate copies of the
same venture. Ordered; 19–21 are the narrow lap and need no new thinking.

- **§19** ["Built in the open" on the product page](#19-built-in-the-open-on-the-product-page) — no migration
- **§20** [`video.researchProjectId`](#20-videoresearchprojectid) — 1 migration + a membership check
- **§21** [The venture reel and the venture badge](#21-the-venture-reel-and-the-venture-badge) — reads 20
- **§22** [Daily-log YouTube: format CHECK and a deferred job](#22-daily-log-youtube-format-check-and-a-deferred-job)
- **§23** [Apply from the watch page](#23-apply-from-the-watch-page) — a mount, not a build

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

### 3. Sixteen stub routes

Each renders a bare `<h1>`. `rg -l "return <h1>" src/app` finds them, and all are `kind: "planned"`
in `src/lib/roadmap/site-roadmap.ts`, so the public roadmap is honest about them.

- **Twelve under `(studio)`** — analytics, comments, subtitles, copyright, customize, earn,
  funding, pitches, team, learn, support, feedback
- **Four under `(home)`** — `/customer-service`, `/advertise-with-us`, `/report-history`,
  `/policies-and-safety`

Each carries `robots: { index: false, follow: false }` with a comment saying REMOVE THIS LINE when
the page gets content. That is about the current state, not a policy about the route.

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

### 24. Feed preferences — SHIPPED, all four parts

The problem: "Not interested" and "Don't recommend channel" both worked, but the Undo lived inside
`VideoCardMenu`, which renders **inside the card it hides**. Scroll once and the choice was
unrecoverable. Separately, both signals were a query-time `NOT EXISTS` that taught the ranker
nothing.

- **Part 1** — `GET /users/me/not-interested-videos`, keyset-paginated (`0130`).
- **Part 2** — negative weight in `recompute-user-affinities` (`0131`). Needed a migration: both
  affinity CHECKs asserted the three positive components summed to `affinity_points`, so a penalty
  could not be subtracted. Rewritten to `… − negative = affinity_points`, penalty stored already
  clamped, `score_algorithm_version` now written as 2.
- **Part 3** — `feed-preferences-panel.tsx`, Settings → Feed preferences. `useMutedCreatorsQuery`
  finally has a caller, so the uncalled-hook audit passes on it.
- **Part 4** — the share sheet's three dead buttons replaced by the four real
  `video_share_channel` targets; `docs/HOME_STRUCTURE.md` §7.1 added and §10's inventory corrected
  to six placeholders across four files.

**What it deliberately left open**, in rough priority:

- **No brand marks for X, WhatsApp or LinkedIn.** `public/icons` has `mail` and nothing else, so
  three of the four share targets render the generic `share` glyph and are told apart by their
  labels. Hand-writing trademarked logo paths from memory was the worse option. Drop real assets in.
- **A topic penalty only lands where a snapshot row already exists**, because the job's `FROM` is
  `video_view_session` — a category dismissed but never watched gets no damping. Widening it means
  writing rows whose only evidence is negative, and since the ranker's `max(COALESCE(...))` treats a
  stored 0 as _stronger_ suppression than an absent row, that is a real ranking change, not a
  one-line fix.
- **Un-muting takes up to one nightly cycle to stop damping.** The hard filter lifts instantly.
- **The anonymous in-request affinity passes `dismissalCount: 0`** — a limitation, not a fact,
  unlike the `likeCount: 0` beside it. That path is fingerprint-keyed; the preferences are
  user-id-keyed. See backend §4.3b.

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

### 2. The video domain is waiting on the backend

**Re-filed out of "Frontend" — it was never frontend work.** `rg -l "TRANSPORT: mock" src/` still
returns exactly five files, all video, and that grep is still the check that this is finished:

- `src/components/home/watch/comments.tsx`
- `src/components/home/watch/share-sheet.tsx`
- `src/components/home/watch/watch-content.tsx`
- `src/components/studio/series/series-editor-modal.tsx`
- `src/lib/videos/studio-view.ts`

**None of them imports a fixture.** Each holds an inline EMPTY placeholder — `[]`, `undefined`,
`false` — so a real component shell survives with its layout intact, and each banner names a
backend gap rather than an unfinished screen. The frontend api layer is already substantial and
wired (`src/lib/feed/api.ts`, `src/lib/videos/api.ts`, `src/lib/series/api.ts`); there is no
refactor here waiting to happen. Deleting a placeholder is a one-line change AFTER its field ships.

**Needs a new backend capability — a table, a job or a model, not just a route:**

- transcript (no ASR pipeline, no transcript table, no column on `video`)
- `isPremium` (no entitlement model, no tier, no paywall anywhere)
- product reviews (no table)
- trending search terms (no aggregation)
- download (structurally impossible — the bytes are on youtube.com)
- the report flow (a deliberate v1 gap, HOME_BACKEND §8.4)
- the "not interested" ranking signal

**Needs only a modest backend change — the cheap subset, in value order:**

1. **`seasons` on `GET /feed/watch/:videoId`.** The data already exists: `/series` has full
   series/season/episode CRUD. But **every `/series` route is `requireAuth` and owner-scoped**, so
   there is no public read — which is exactly why `PLACEHOLDER_SEASONS` cannot be filled. Add a
   series reference to `WatchPayload`, or a public series read.
2. **`POST /series/:seriesId/poster`.** Mechanical: copy the multer pattern from the one existing
   studio upload route, `POST /videos/:videoId/thumbnail`. `posterUrl` is a plain URL today with no
   route that can set it.
3. **`attachedProducts` on the watch payload.** The join table exists and
   `PUT /videos/:videoId/products` already writes it; it is simply not projected onto the public
   read.
4. **`attachedPitchId` on the `.strict()` `POST /videos` body**, plus a column. The document half is
   bigger — it needs a storage route.

**Separately: `/studio/analytics` is greenfield on BOTH sides.** It is one of the 16 stub routes
below AND has zero backend routes — `VideoListRowSchema` carries no counters at all. It is not part
of item 2, but it is the video-domain gap with the most product value.

### 18. Freight rate data

`delivery-sheet.tsx` works. The routes, tables and rating service all exist, and the rate tables
ship **empty by design** (A36). Every lane answers `no_active_rate_card` and `shippingInCents` is
permanently `0` until a forwarder lane list is purchased. Nothing to build — this is a buying
decision, and [the uncovered-inland-leg rule](#decisions-needed) should be settled before the money
is spent.

---

## Cross-pillar seams

R&D, Store and Studio keep separate copies of the same venture. Four seams exist between them:
one real and pointed only inward (`product.researchProjectId`), one real and healthy
(`videoAttachedProduct`), one that is a fiction made of text columns (`videoMilestone`,
`videoOpenRole`, `videoTeamMember`) and one duplicated pipeline (two YouTube verifications).

The five items below are the surviving subset of a four-move proposal audited against the live
schema on 2026-08-19. **Four moves from that proposal were dropped and should stay dropped** —
see [why](#what-was-dropped-and-why) at the end of this section, because the reasoning is the
part that will otherwise be re-derived wrong.

Items 19–21 are the narrow lap: one venture, end to end, from a reported gap to a sold unit with
its record attached. Ship them against **one** real venture and **one** real product before
starting 22 or 23.

### 19. "Built in the open" on the product page

`store.product.researchProjectId` exists (`store.ts:2761-2784`), is partially indexed
(`store.ts:2890`), and the frontend reads it on **zero** product surfaces.
`StoreProductDetailSchema` (`src/lib/store/products.schemas.ts:217-250`) has no such field. Its
only consumer today is the R&D-direction rail (`src/lib/rnd/suppliers.schemas.ts:98`
`launchedProducts`), rendered on `/research-and-development/go-to-market`.

The boundary comment on that column forbids a **write** crossing — "a research route that proxied
a product create". It says nothing against reads, and this is the store's only differentiation a
general marketplace cannot copy, because they do not have the record.

**No migration.** Backend adds a venture projection to `GET /store/products/:slug`; frontend adds
a block to `src/components/home/store/product-detail.tsx`, already `TRANSPORT: server-fetch` and
already doing four parallel reads — this is a fifth.

**The projection must be the public read, not the member read.** `project-detail.tsx` fires nine
member-scoped child reads; a buyer gets none of them. Ship a narrow shape — venture name and
slug, proof-chain summary counts, the milestone that shipped it, public roster names — carrying
no `plannedPayoutInCents`, no slice numerator, no escrow state, no `investor_only` material. Diff
the buyer JSON against `ProjectDetailSchema` before merging.

### 20. `video.researchProjectId`

One nullable column on `studio.video`, `restrict`, mirroring `product.researchProjectId` exactly.
Null means unaffiliated content — anime, general creator uploads — so those surfaces are
untouched. Precedent exists: `store.ts:23` and `platform.ts:17` both already import
`researchProject`. `studio.ts` imports nothing from `rnd.ts` yet, so this is the first edge.

**Who may set it is the whole problem.** `video.creatorId` is a plain `user`
(`studio.ts:190-198`); venture identity is a `projectMember`. Without a server-side membership
check at write, any user attaches their video to any venture. Same shape as `videoAttachedProduct`
re-verifying `product.sellerId` (`studio.ts:511-512`): the client sends an id, the server
verifies membership before accepting it. Test it by POSTing a project the caller is not a member
of and expecting a 403, not a stored row.

### 21. The venture reel and the venture badge

Pure frontend, reads item 20. The venture page assembles its own film reel without the creator
wiring anything up; the watch page gets a badge linking back to the venture. Renders the venture's
public milestone list — **not** a per-label FK, see [what was dropped](#what-was-dropped-and-why).

### 22. Daily-log YouTube: format CHECK and a deferred job

Two real defects, neither requiring a cross-pillar FK.

**`daily_log.youtube_video_id` has no format CHECK.** `studio.ts:424-428` has
`youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'` and its comment says that check "is what closes SSRF".
`daily_log`'s only check is the source/id-presence pair (`rnd.ts:3183`). One migration.

**Verification is inline and destructive.** `daily-logs.service.ts:624-631` calls oEmbed on the
request path and, on failure, returns the error and creates no row — losing a member's
submission to a YouTube blip. This is exactly the behaviour studio deliberately moved away from
(`verify-youtube-video.ts:15-35`). Move daily logs onto the same pg-boss job, reusing
`handleVerifyYoutubeVideo`'s compare-and-swap guard (`verify-youtube-video.ts:118-122`) so a
re-PATCHed id is never marked verified on an old id's proof.

Both sides already call the same `verifyYoutubeVideo` from `#src/lib/youtube.js` and share the
same `YoutubeSourceError` triple. The duplication is the _delivery_ — deferred job vs inline —
not two implementations.

### 23. Apply from the watch page

The write path exists and is verified end to end: `useApplyToProjectMutation`
(`src/hooks/rnd/projects.ts:244`) → `createProjectApplication`
(`src/lib/rnd/projects.api.ts:274`) → `POST /research-projects/:slug/applications`. The sheet
itself, `sheets/apply-role-sheet.tsx`, is already a self-contained `client-query` island. It is
mounted only from `OpenRoleCard`, on three R&D-only surfaces.

Mounting it under the player turns the watch page from a poster into the recruiting surface. Add
`videoOpenRole.openRoleId` (nullable → `projectOpenRole.id`, text kept as fallback so anime and
unaffiliated videos are unaffected), and note the watch page renders a _projection_ of
`projectOpenRole` — the real row carries `skills[]` + GIN, `commitment`, `status`,
`slotsTotal`/`slotsFilledCount` and an `openRoleCompensation` child (`rnd.ts:625`, `:684`).

Verify by applying from the watch page and finding the row in the existing applicant inbox at
`/research-and-development/applications` with the right `openRoleId`.

### What was dropped, and why

**`dailyLog.videoId → studio.video` — dropped. It would break the equity chain.** Both sides
state their delete semantics and they are opposites:

```text
studio.ts:190-198   creatorId → user.id, onDelete: CASCADE
                    "a video bears no ledger, equity or audit weight, so it is a
                     possession that dies with the account rather than a record
                     that must outlive it"

rnd.ts:3095-3100    authorMemberId → projectMember.id, onDelete: RESTRICT
                    "this row is effort evidence and its author must stay
                     resolvable forever"
```

`dailyLog` → `effortClaim` (unique, one claim per log, `rnd.ts:3966`) → `sliceLedgerEntry`. It is
the input to the entire equity ledger. Putting it behind a row that cascade-dies with a user
account puts equity evidence behind a possession — and a `restrict` on `dailyLog.videoId` does
not fix it, it inverts it: the user→video cascade then fails and account deletion throws, which
[the privacy surface](#10-privacy-part-3--shipped-behind-two-default-off-flags) just shipped.

**`video.visibility: "team"` — dropped with it.** Not one enum value. `isSourceVerified` has three
documented readers (`publishVideo`, content-review approve, feed candidate pool —
`studio.ts:204-230`) and `video_gating_ck` (`studio.ts:432`) already refuses `investor_only` for
youtube rows. A fourth visibility state needs all of them to agree, plus content review, plus
feed exclusion.

**`videoMilestone.milestoneId → rnd.milestone` — dropped.** `milestone` carries
`plannedPayoutInCents` (`rnd.ts:6047`) and `escrowRelease` holds a notNull `milestoneId` with
double-payout unique indexes (`rnd.ts:6157`, `:6183`). Pointing a watch-page roadmap label at
that row makes a video label imply money. `studio.ts:50-57` is an explicit, itemised refusal of
exactly this — read it before reopening the question.

**`videoTeamMember.memberId → projectMember` — dropped as unnecessary.** `videoTeamMember` already
has `linkedUserId` (nullable, `set null`, `studio.ts:587-604`) and the frontend renders nothing
from it. Use the column that exists.

**Feeding store sales and reviews into `demandSignalSnapshot`** stays out of this list entirely.
It only produces signal once real ventures have shipped real products, which is what items 19–21
are for.

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
that only globbed `src/lib/store/*.api.ts` is why the seven R&D wrappers went unnoticed for so
long:

```bash
for h in $(rg --no-filename -o 'export function (use\w+)' -r '$1' src/hooks/ | sort -u); do
  rg -q "\b$h\b" src/components src/app || echo "UNCALLED $h"; done

for f in $(rg --no-filename -o 'export (?:async )?function (\w+)' -r '$1' \
    src/lib/store/*.api.ts src/lib/rnd/*.api.ts src/lib/admin/*.api.ts src/lib/account/*.api.ts \
    | sort -u); do
  rg -q "\b$f\b" src/hooks src/components src/app || echo "UNCALLED-API $f"; done
```

**Both are silent today.** The second printed seven R&D names until those wrappers were wired
(`listRoundBackers`, `listEquitySnapshots`, `verifyStatementChain`, `getAuditHashInput`,
`updateWorkshopChatMessage`, `deleteWorkshopChatMessage`) or deleted as a duplicate
(`getProjectEquity`). A name reappearing here is unverified code, not a style nit.

Note the banner check uses `--files-without-match`; `rg -L` is `--follow` and silently reports
the opposite of what it looks like it reports:

```bash
rg --files-without-match 'TRANSPORT:' src/components/home/research-and-development --glob '*.tsx'
```
