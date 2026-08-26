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

- **§19** ~~["Built in the open" on the product page](#19-built-in-the-open-on-the-product-page)~~ — **shipped**, no migration
- **§20** ~~[`video.researchProjectId`](#20-videoresearchprojectid)~~ — **shipped**, migration `0132`
- **§21** ~~[The venture reel and the venture badge](#21-the-venture-reel-and-the-venture-badge)~~ — **shipped**
- **§22** ~~[Daily-log YouTube: format CHECK and a deferred job](#22-daily-log-youtube-format-check-and-a-deferred-job)~~ — **shipped**, migration `0134`
- **§23** ~~[Apply from the watch page](#23-apply-from-the-watch-page)~~ — **shipped**, migration `0133`

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

### 19. ~~"Built in the open" on the product page~~ — **SHIPPED**

Backend Appendix A42 (no migration) + `sections/built-in-the-open.tsx`.
`GET /store/products/:productSlug` now carries a nullable `builtInTheOpen`, and the product page
renders it between `ProductDetailsSection` and `SimilarAndCompare`. Kept here rather than deleted,
because three decisions inside it will otherwise be re-litigated.

**It is a FIELD on the product read, not a fifth parallel fetch** — which is where the plan
changed. Every R&D read surface is addressed by slug and exposes no `id`
(`ResearchProjectDetailSchema` has no top-level `id`; there is no by-id project route), so a client
holding the raw `researchProjectId` UUID could not call R&D with it at all. The backend joins
instead and sends `projectSlug`. The FK is selected only to drive that join and is dropped before
the response, the same discipline as `suppliers.service.ts:576`. No new view-state variant either:
the `"ready"` case already carries it.

**No equity on a buy page.** In: slug, name, tagline, cover, stage, `verifiedEffortMinutesTotal`,
`teamMemberCount`, `statsComputedAt`. Out: `allocatedEquityBasisPoints` — public on
`/launch-ready-projects`, but that rail is contributor-facing, and beside a price an equity
aggregate reads as a claim about the transaction. Also out: `pendingApplicationCount`
(`project_stats` marks it founder-facing) and **the milestone this section originally asked for** —
`listProjectMilestones` is member-scoped and 404s for a buyer, `milestone` rows carry
`plannedPayoutInCents`, and there is no product→milestone link anyway, only the project FK, so
"the milestone that shipped it" has no referent. Public roster names went with it: the counts say
the same thing without naming people on a commerce surface.

**`project_stats` is LEFT-joined**, unlike the launch-ready rail, which inner-joins it. Found by
checking the data: 15 of 41 active projects have no `project_stats` row, and an inner join made the
whole block VANISH for those — telling a buyer nothing built this listing because a counter cache
is missing. `teamMemberCount` is therefore nullable to the wire despite a `notNull` column, and a
missing cache costs the counts, not the credit.

**`status = 'active'` is a disclosure boundary.** A `draft` project 404s for non-members and an
`archived` one was withdrawn; without that predicate the product page names an unpublished venture
to anonymous buyers. Verified: a product linked to a draft project answers `builtInTheOpen: null`
and leaks the slug nowhere in the payload.

**Verified against live data**, by temporarily linking three dev-seed listings and reverting:
stats-present, stats-absent, draft-project and no-venture all render correctly. **No product has
`research_project_id` set in the shared database today** (0 of 17), so the block is invisible in
practice until a real venture ships a real listing — which is what items 20–21 are for.

### 20. ~~`video.researchProjectId`~~ — **SHIPPED**

Migration `0132`. One nullable column on `studio.video`, `restrict`, mirroring
`product.researchProjectId` exactly. Null is unaffiliated content — anime, general uploads —
so those surfaces are untouched. First edge from `studio.ts` to `rnd.ts`.

**Who may set it, resolved.** The wire field is `researchProjectSlug`, NOT an id: every R&D
read is slug-addressed and exposes no id, so a client has none to send. The service resolves
the slug, then requires **active membership AND `researchProject.status = 'active'`** —
`isActiveProjectMember` alone is not enough, because it returns true for a member of a DRAFT
project, and attaching a public video to one would name an unpublished venture to anyone.

**It answers 422, not the 403 this section originally specified.** `studio-error-response.ts`
reserves 403 for the platform-capability refusal alone, because that one is decided _before
any id is read_. A membership refusal on a body-supplied id is an oracle for which project ids
exist, which is exactly what that policy prevents — and every sibling check in the file
(`PRODUCT_NOT_OWNED`, `PLAYLIST_NOT_OWNED`, `ANIME_SERIES_NOT_FOUND`) already answers 422 with
the offending id. `RESEARCH_PROJECT_NOT_JOINABLE` follows them. Verified: a non-member gets 422
and **no row**, and so does a member pointing at a draft.

**The studio's mock chips are gone with it.** `MOCK_PITCH_PROJECT_TITLES` fed a `<select>`
whose value was a project TITLE, and `attachedPitchId` was never client-writable, so the
control wrote nowhere. It is now backed by `GET /research-projects/attachable` — a new
session-scoped read that mirrors the write gate exactly, so the picker cannot offer an option
the save refuses, nor hide a venture a non-founder contributor may legitimately link.

### 21. ~~The venture reel and the venture badge~~ — **SHIPPED**

Pure reads over 20. `GET /research-projects/:projectSlug/videos` is new — there was no public
"list videos by predicate" service at all, because the feed is ranking machinery with no id
facet and search is full-text. It is shaped like `listActiveSpotlightVideos` and imports the
exported `PUBLICLY_SERVABLE` rather than adding a fourth byte-identical raw-SQL copy of it.
Draft projects reuse the roles routes' visibility gate, which was exported for the purpose
rather than copied — three gates that must agree are three chances for one to drift.

**A narrow projection, not `FeedVideoItem`.** That type carries `viewerState`, which needs
per-viewer joins the rail renders nowhere; shipping `false` to a signed-out visitor is a
negative the client has no basis for. The reel links, it does not toggle.

The watch-page badge is identity only — slug, name, stage. The venture's status term lives in
the JOIN, not the WHERE, so a draft venture nulls the badge instead of 404ing a public video.

### 22. ~~Daily-log YouTube: format CHECK and a deferred job~~ — **SHIPPED**

Migration `0134` adds `daily_log_youtube_id_format_ck`, byte-identical to the one `video` has
carried since `0012`. Checked before writing it: every existing row already matched, so it
validated with no backfill.

**Genuinely one queue, not two.** `VerifyYoutubeVideoPayloadSchema` became a **plain `z.union`**
of `{ videoId }` and `{ dailyLogId }`, and the plainness is load-bearing: a rolling deploy
guarantees old-shaped payloads are in flight, and a payload that fails its schema dead-letters
on the FIRST attempt — a `discriminatedUnion` requiring a new key would have killed every
studio verification mid-flight. The legacy shape is arm one, unchanged.

`createDailyLog` now defers on `YOUTUBE_VERIFY_FAILED` only, copying the studio's asymmetry
exactly: a malformed link and an unavailable video stay hard errors, because those are things
the member must fix. It also became a transaction, so the enqueue rides the same connection —
an enqueue after the commit can be lost silently, leaving a row nothing will ever verify.
**The update path still hard-fails on all three**, or an outage could un-verify a live row.

**The frontend gained a third state it previously rendered as the second.** `daily-log-card`
gated the video on the thumbnail alone, and a deferred row has a real embed URL with no
thumbnail — so those logs showed no video at all, which reads as "they didn't record one".
`isVideoVerified` separates "still checking" from "there is nothing here".

### 23. ~~Apply from the watch page~~ — **SHIPPED**

Migration `0133` adds `video_open_role.open_role_id`, nullable, `restrict`. `roleTitle` stays
NOT NULL beside it as the fallback, so anime and unaffiliated videos are untouched.

**The wire shape changed**: `openRoles` is now an array of objects
(`{ roleTitle, roleDescription?, openRoleId? }`), not strings. That forced it out of
`replaceSimpleChildSets`, whose whole property is that it writes label rows with no FK to
validate — the same reason `videoCategory` was never in it. `roleDescription` is written for
the first time; the column had existed since the table did with no endpoint writing it.

Ids are re-verified with the apply gate's own `and(id, projectId)` predicate, so a role from
another venture is indistinguishable from one that does not exist (422
`OPEN_ROLE_NOT_IN_PROJECT`). A video with no venture may link no role at all.

**One edge worth knowing:** a PATCH that moves or detaches the venture without resending
`openRoles` nulls every surviving link, keeping the text. Each one was validated against the
OLD venture, so after a real change none can still be valid — and the alternative is a watch
page advertising another project's vacancy.

The watch payload carries the whole `OpenRoleView`, not an id, which is why `ApplyRoleSheet`
mounts unchanged: it needs `projectSlug` to post to and `skills` to render the chips the
backend validates a subset against. A closed or full role renders its real state rather than
disappearing. **No idempotency key is minted** — that endpoint takes none, and retry safety is
two partial unique indexes plus a self-heal inside the create transaction.

### Store sales in the demand radar — **SHIPPED, as evidence rather than score**

Migration `0135`. `demand_signal_snapshot` gains `sold_unit_count` and `product_review_count`,
both `DEFAULT 0 NOT NULL`, with the counts CHECK rewritten around them.

**A second WRITER was impossible, so they became inputs to the one that exists.** Three
blockers, all structural: `(as_of, rank)` is unique globally so two writers collide on rank;
the store has no region and `region_id` is NOT NULL; and `commerce_category` has no mapping to
`research_category` at all. The attribution path is the one the job already walks —
`commerce_order_product_line` -> `product` -> `research_project` ->
`problem_cluster_project_link` -> `problem_cluster` — because the CLUSTER carries both the
region and the category.

**They are recorded and displayed, NOT scored, and that was a deliberate stop.** Finding a sale
15 or 20 points means taking them from the four component budgets, which are `demand-score.ts`'s
editorial claim about what "demand" means — asserted at module load and covered by a test suite
that checks each component directly. Re-weighting reranks every cell on the board; that is a
product decision, not a side effect of teaching the job a new join. (It was attempted and
reverted: it broke 62 tests, which is the contract saying so.) There is also a real argument the
weight should be small or zero — this hub surfaces demand that is NOT YET SERVED, and a cell
with heavy sales is being served, which the inverted scarcity component already docks it for.

So the numbers reach the leaderboard as evidence a reader can weigh, `scoreAlgorithmVersion`
stays 1, and every historical row stays comparable. **The weighting question is open.**

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

**Feeding store sales and reviews into `demandSignalSnapshot`** SHIPPED, but only as recorded
evidence — see the section above. The prediction here was half right: the numbers are all zero
today because no product carries a `researchProjectId` yet, so the join finds nothing. What was
wrong is the assumption that it needed items 19–21 first; the plumbing was buildable now, and
the counts will start moving on their own the moment a venture ships a listing that sells.

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
