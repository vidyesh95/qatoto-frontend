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

- **§3** ~~[Sixteen stub routes rendering a bare `<h1>`](#3-sixteen-stub-routes)~~ — **shipped**; `rg "return <h1>" src/app` is empty
- **§5** [Phase D — cost of goods, and therefore margin](#5-phase-d--cost-of-goods-and-therefore-margin)
- **§6** [Five backend capabilities with no UI at all](#6-backend-capability-with-no-ui) — **three shipped**; two need authoring flows that do not exist
- **§8** [SEO leftovers — OG images, `manifest.json`](#8-seo-leftovers)
- **§9** [Three things never exercised against live data or a browser](#9-never-exercised)
- **§24** ~~[Feed preferences — the reviewable do-not-recommend list](#24-feed-preferences--the-reviewable-do-not-recommend-list)~~ —
  **all four parts shipped**; kept only for the follow-ups it left behind

**Backend (`qatoto-backend`)**

- **§10** [Privacy Part 3 — SHIPPED, behind two default-off flags](#10-privacy-part-3--shipped-behind-two-default-off-flags)
- **§11** [`phone_number` column](#11-phone_number-column--blocked-on-a-vendor-not-on-code) — **blocked**; needs an SMS vendor, not code
- **§12** ~~[`updatedAt` on the store card schemas](#12-updatedat-on-the-store-card-schemas--shipped)~~ — **shipped**; `/sitemap.xml` went from 6 dated entries to 24
- **§13** ~~[Message attachments](#13-message-attachments--stale-this-shipped-and-the-entry-never-caught-up)~~ — **stale**; `POST /commerce/documents` shipped and the message body already takes the ids
- **§14** [Liked / watch later / subscriptions](#14-liked--watch-later--subscriptions--backend-shipped-frontend-not-wired) — **backend shipped**; the three routes exist, `/library` is not wired to them
- **§15** [Multi-axis variants](#15-multi-axis-variants)
- **§16** [Incoterm semantics](#16-incoterm-semantics)
- **§17** [Provider directory filters](#17-provider-directory-filters)

**Waiting on the backend, not on the frontend**

- **§2** [The video domain's five `TRANSPORT: mock` banners](#2-the-video-domain-is-waiting-on-the-backend) — the **cheap subset shipped**; three banners can come down, the rest need a model that does not exist

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

### 3. ~~Sixteen stub routes~~ — **SHIPPED, and it was never sixteen**

`rg -l "return <h1>" src/app` now returns **nothing**.

**The count was wrong in two directions.** `/report-history` had already shipped with video content
reporting — it reads `GET /users/me/video-reports` and its `robots` block was removed at the time —
so the `(home)` count was 3, not 4, and the total was 15. `docs/REMAINING_WORK.md` had this right;
this file did not.

**The three `(home)` pages are real pages now.** `/customer-service`, `/advertise-with-us` and
`/policies-and-safety` follow the plain `(disclaimers)` pattern, carry authored content, have lost
their `noindex`, are `kind: "route"` on the roadmap and are in `sitemap.ts`. `/policies-and-safety`
was reachable from nowhere and is now in the sidebar's second footer row.

None of them invents a capability: customer service is a DIRECTORY of surfaces that already work
(there is no ticket API and a form here would collect messages nothing reads), advertise-with-us
names no rate, format or mailbox (no placement API exists and the mailboxes are still an open
decision below), and policies-and-safety is a hub over the five existing policy documents rather
than a sixth one to keep in sync.

**Two of the twelve have since graduated.** `/studio/analytics` and `/studio/comments` are real
pages now — they were the only two whose data already existed and simply had no reader. See the
new §25 for what that surfaced.

**The remaining EIGHT `(studio)` pages are honest placeholders, and they are STILL `kind: "planned"`.**

⚠️ **THE SENTENCE THAT USED TO BE HERE WAS WRONG, AND WRONG IN THE EXPENSIVE DIRECTION.** It read
"nine of them have **no backend whatsoever** … building those nine is nine backend domains, not nine
screens" — and the evidence it offered (`feedback`, `subtitles`, `copyright`, `pitches`, `learn`,
`support`, `team`) **never named `funding` at all**. It was counted, not checked. The R&D funding
domain is complete — `funding_round`, `funding_round_pledge`, milestones, and routes for create,
open, close, patch, delete, pledge, cancel, backers and deals. What `/studio/funding` was missing was
ONE READ: everything funding-related is scoped to a project, and nothing spanned a founder's
projects. `GET /funding-rounds/mine` closed it and the page graduated.

The honest breakdown of the eight that are left — **five genuinely need a new domain**: `subtitles`
(no caption table; `captionCertification` is a text column on `video`), `copyright` (`copyright` is a
video-REPORT-REASON enum member, not a claims table), `pitches` (`pitch` is a `video_type` enum
member, not a table), `team` (account-level collaborators; the `video_collaborator` table that exists
is per-video and already wired) and `earn` (a money rail — escrow left this codebase, §7). The other
three — `learn`, `support`, `feedback` — are the `/customer-service` shape and have **not** been
costed since that page shipped as authored content. Check before inheriting a number.

**It was ten until `customize` graduated** — see §31. It is `kind: "route"` now, with
`GET|PATCH /users/me/channel-profile` behind it, and it is the only one of the twelve that left this
list by growing a backend rather than by having one found.

What shipped is `studio-planned-page.tsx`: the roadmap summary verbatim, what the page will do, and
— where one truthfully exists — a link to the surface that does the job today. **Six of the twelve
have no such link and say so out loud**, because a redirect that does not answer the need spends the
reader's trust. The two with real backends (`earn`, `funding`) point at `/sales` and
`/research-and-development` rather than rebuilding a second view of one endpoint.

**Explaining an absence is not filling it.** The roadmap kinds stay `planned` deliberately — a
`route` there is a claim the capability exists, and `site-capabilities.ts`'s `PROMISES A STUB`
drift-grep is the machinery that enforces the difference.

### 5. Phase D — cost of goods, and therefore margin

Revenue shipped; margin is what is left, and the input does not exist anywhere in the backend — no
cost column, no purchase record, no expense table. It needs a per-order-line cost the seller
enters, its write route, and the part that is not mechanical: **A13's declared-vs-measured split**.
A self-entered cost is a DECLARED stat sitting directly beside platform-MEASURED revenue, and the
wire has to make that visible or a seller will read an unverified number as a verified one.

Until then `src/components/commerce/sections/seller-earnings-panel.tsx` says margin is not shown
and why, rather than relabelling revenue.

### 6. Backend capability with no UI — **THREE SHIPPED, TWO ARE NOT WHAT THEY LOOK LIKE**

**Shipped:**

- **A39's search facets.** `/store/search` returned nine dimensions and `cursorPageOf`'s `.strip()`
  dropped every one. Three gaps closed in `catalog.schemas.ts`: the facets themselves, the seven
  filter keys the backend has always accepted and the interface never declared, and the five per-hit
  A25 columns. They render as real chips WITH their counts — unlike the category page's read-only
  summary, and the difference is not stylistic: a facet is clickable only if the route accepts it as
  a query key, and `/store/categories/:slug` accepts `limit` and `cursor`. A dimension with fewer
  than two buckets renders nothing, because one bucket is not a choice.
- **`checkout/prepare`'s `arrivalWindows`.** Parsed and rendered. **It never prints a date** —
  `arrivalWindow` is null at prepare time by construction, so the panel names components and, where
  one is unknown, names the absence. The three component renderers were extracted to
  `arrival-window-component-lines.tsx` and are now shared with the order panel rather than copied;
  the mode picker is optional there, because re-pricing freight needs an order to re-price.
- **`POST /commerce/orders/:orderId/refunds`**, including the transport change it needed.

**The transport change, since it touches every surface.** `readEnvelope`'s failure branch copied
`statusCode`, `message` and `errors` and dropped `data`, so `409 OVER_REFUND`'s remaining balance was
unreachable from anywhere in the app. `ApiError` gained an optional **`details?: unknown`** and the
branch passes `envelope.data` through. `unknown` rather than a typed shape on purpose: promoting one
route's payload into a contract every surface shares is what the old note in `payments.api.ts` was
right to refuse. The refund control parses it with Zod at its own boundary. Purely additive — no
existing caller reads it.

**~~Deferred~~ — BOTH SHIPPED. See §28.** Kept here because the diagnosis was right and the cost
estimate was wrong in a way worth remembering: both were described as blocked on "build the
authoring surface", and in both cases the BACKEND was already complete. The work was frontend-only.

- ~~**A40's incoterm on the quote form.**~~ **Shipped.** There is a quote form now. The incoterm is
  an eleven-value picker on it, never a text field — the enum exists precisely because
  `z.string().max(20)` once accepted `BANANA` and the submit trigger froze it forever.
- ~~**`commerce_review_media_state`.**~~ **Shipped.** The author-facing surface exists and renders
  "this video is no longer available on YouTube" against an `unavailable_upstream` row. The note
  about the public read was correct and still is: it filters those rows out and carries no state.

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

### 11. `phone_number` column — BLOCKED ON A VENDOR, not on code

`session.user.phoneNumber` and `phoneNumberVerified` are declared client-side in
`src/lib/auth-client.ts` via `inferAdditionalFields`, and the backend has no `phoneNumber()` plugin
and no column — `rg phoneNumber qatoto-backend/src` returns nothing. The fields type-check and are
`undefined` at runtime, so `PhoneNumberPanel`'s OTP calls hit a route that does not exist and the
row reads "Not set" for everybody. The value shown is the honest one.

**Re-filed as blocked, alongside §18.** Better Auth's `phoneNumber()` plugin requires a `sendOTP`
implementation, and there is no SMS provider anywhere in `src/config/index.ts` or `.env.example` —
the only OTP delivery configured is Brevo, which is email. So this is a purchase before it is a
migration, the same shape of blocker as a freight rate card, and writing the plugin first would
leave a route that mints codes nobody receives.

### 12. ~~`updatedAt` on the store card schemas~~ — SHIPPED

`StoreSearchHit` carries `updatedAt`, `StoreSearchHitSchema` parses it as `z.iso.datetime()`, and
`getCatalogSitemapEntries` emits it as `lastModified` on `/store/product/:slug` and
`/store/services/:slug`. **`/sitemap.xml` went from 6 dated entries to 24**, verified against the
running dev server.

It needed no migration: `store_search_document.updatedAt` already existed and is an honest content
clock rather than a refresh stamp — the re-projection is enqueued after a product, offering or
organization mutation and re-reads the authoritative row, so there is no nightly sweep moving every
date at once.

**Storefront entries stay undated, deliberately.** Their slugs are DERIVED from the product and
offering hits, so the only date available is the newest of a storefront's listings — and a
storefront changes for reasons no listing records. `sitemap.ts`'s header refuses a manufactured
`lastModified`; dating by proxy is that, arrived at more slowly.

### 13. ~~Message attachments~~ — STALE; this shipped and the entry never caught up

**Checked against the routers, not the doc.** The upload path it asks for exists:
`POST /commerce/documents` (`commerce-documents.routes.ts`) takes a multipart file behind
`requireProvisionedBuyerCommerceWorkspace` and returns an authorized document id, with
`GET /commerce/documents/:documentId` as its download half — the two were shipped together
precisely so a composer could not attach a file nobody can open.

The message side is wired too: `commerce-messages.schemas.ts:55` accepts `encryptedDocumentIds`
(max 20), the service dedupes and stores them, and `listMessages` projects them back per message.

Nothing to build. Left here as a heading rather than deleted, because the _claim_ is what was
wrong and a reader who remembers this item should be able to find the correction.

### 14. Liked / watch later / subscriptions — BACKEND SHIPPED, frontend not wired

~~No routes mounted at all.~~ **All three now exist**, session-gated and keyset-paginated:

- `GET /users/me/liked-videos`
- `GET /users/me/saved-videos`
- `GET /users/me/subscriptions`

`?limit=` (1..50, default 20) and `?cursor=`; a constructed cursor is a **422**, never a silent
first page. Backend `HOME_BACKEND_STRUCTURE.md` §5.2d has the full contract. Migration `0137`
added two indexes; `video_save` deliberately got none, because its existing viewer index already
serves the read on a backward scan (proven with `EXPLAIN`, not asserted).

Three behaviours the frontend has to render correctly rather than assume:

- **The two video lists are public-gated.** A liked video the creator later makes private drops
  out of the list while the like row survives — so the list length is NOT the number of things
  the viewer liked, and there is no total anywhere to display beside it. Un-privating restores it.
- **One row shape for liked and saved**, with `addedAt` rather than `likedAt`/`savedAt` — one card
  component, two tabs. Carries `videoId, title, thumbnailUrl, durationSeconds (nullable),
viewCount, creatorId, creatorName, creatorHandle (nullable), addedAt`.
- **Subscriptions include creators with no videos and no `creator_stats` row**, at
  `subscriberCount: 0`. Do not filter them — that would make the subscription unliftable from the
  only surface that lists it.

**~~What is left, and it is frontend-only~~ — DONE.** `src/lib/library/{schemas,api}.ts`,
`src/hooks/library.ts` (three `useKeysetList` queries), and four tabs on `library-page.tsx`:
Playlists · Liked · Watch later · Subscriptions. The "Not here yet" panel is deleted.

**No count is rendered beside Liked or Watch later**, per the rule above — the server drops rows
whose video went private, so `rows.length` is not the number of things you liked.

**Subscription rows link NOWHERE, and that is deliberate** — see §27.

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

### 2. The video domain — the cheap subset is DONE on both sides; three banners remain

`rg -l "TRANSPORT: mock" src/` now returns **three** files, down from five:

- `src/components/home/watch/comments.tsx` — `trending` only
- `src/components/home/watch/watch-content.tsx` — `transcript` and `isPremium` only
- `src/lib/videos/studio-view.ts` — `attachedDocumentNames` only

`series-editor-modal.tsx` and the `seasons`/`saleItem` halves came off: their fields ship now.

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

**The cheap subset — ALL THREE SHIPPED on the backend. The frontend banners are what is left.**

1. ~~**`seasons` on `GET /feed/watch/:videoId`.**~~ **Shipped.** It needed a genuinely new public
   read: all eleven `/series` routes are `requireAuth` and owner-scoped, correctly — `getSeries`
   returns unreleased titles, premiere dates and the production schedule. `loadPublicSeasonsForVideo`
   is that read, embedded in the payload rather than given its own route, because the watch page
   does not learn the series id until the first read returns.
   **Two rules the frontend has to honour:** `null` means "not an anime episode" and `[]` means "a
   series with nothing public yet" — do not collapse them; and **only publicly-servable episodes are
   listed, so episode numbers can have gaps.** `isPremium` is deliberately NOT on the wire — the
   column exists, no entitlement model does, and a lock over a free episode is a claim we cannot back.
2. ~~**`POST /series/:seriesId/poster`.**~~ **Shipped**, with `DELETE` beside it — `PATCH` cannot
   clear the column because `posterUrl` is `HttpUrlSchema` and has no null to send. Multipart
   `image`, 5 MB, sharp → avif at 1080px, `seriesPosterUploadLimiter`. The `PATCH` path stays:
   removing it would strand every series already carrying a pasted third-party URL.
3. ~~**`attachedProducts` on the watch payload.**~~ **Shipped.** Each entry is re-checked for public
   eligibility at read time through the store's own `resolveEligibleProductCardsByIds`, so a seller
   unpublishing a listing makes the list SHORTER rather than leaving a dead card — and the join row
   survives, so re-publishing brings it straight back. Proven both directions against live data.
4. **`attachedPitchId` on the `.strict()` `POST /videos` body**, plus a column — still open. The
   document half is bigger; it needs a storage route.

**The frontend caught up — all four are wired.**

- **The season picker is live.** Every episode is a `<Link>` to `/watch?v={videoId}`; it used to be
  local state that changed nothing, which was correct while the list was a fake with no videos
  behind it. `null` hides the panel, `[]` renders an empty catalogue, and **gaps in the numbering
  are preserved** — 1, 2, 4 means episode 3 is not public and renumbering would invent a fact.
- **Attached products render `CatalogProductCard`**, the store's own card, linking to
  `/store/product/{slug}`.
- **The Reviews tab is real, and "product reviews (no table)" above was STALE.**
  `GET /store/products/:productSlug/reviews` ships, `listStoreProductReviews` was already in the
  api layer, and `RatingsAndReviews` takes `{ productSlug, initialPage }` — so the tab mounts the
  store's own component. Verified in a browser: it renders the store's honest empty state,
  "Reviews can only be left by a buyer whose order completed."
- **The series poster picker uploads.** Edit-only: a series being created has no id to upload
  against, so create mode says "Save the series first" rather than showing a picker that would 404.

`isPremium`, `transcript` and trending search terms stay marked — each needs a table, a job or a
model that does not exist.

**~~Separately: `/studio/analytics` is greenfield on BOTH sides.~~ Shipped** — see §25.

### 18. Freight rate data

`delivery-sheet.tsx` works. The routes, tables and rating service all exist, and the rate tables
ship **empty by design** (A36). Every lane answers `no_active_rate_card` and `shippingInCents` is
permanently `0` until a forwarder lane list is purchased. Nothing to build — this is a buying
decision, and [the uncovered-inland-leg rule](#decisions-needed) should be settled before the money
is spent.

---

## 25. Creator analytics and the comment inbox — SHIPPED, and one bug they exposed

Two Studio pages stopped being placeholders. Both were the same shape of gap: **the data existed
and nothing read it.**

- `GET /users/me/creator-summary` and `GET /users/me/video-analytics` —
  `creator_stats.published_video_count` and `total_view_count` were written by three services and
  selected NOWHERE in the codebase before this. `video_stats` carried every per-video counter live.
  No new table, no new job.
- `GET /users/me/video-comments` — the creator's inbox across all their videos. The authorization
  was already correct: `deleteVideoComment` has always permitted the author OR the video's creator.
  What was missing was a way to FIND the comment without opening each video's thread.

**All three live under `/users/me/*` rather than `/videos/*`**, because `app.ts` mounts the videos
router first and `GET /videos/:videoId` permanently shadows any two-segment `/videos/X`.
`/me/video-reports` documents the same trap.

**One migration, `0136`, and it is a correctness fix rather than a performance one.** The public
thread's `video_comment_thread_idx` is partial on `parent_comment_id IS NULL`, so an inbox built on
it would have silently omitted every REPLY — 6 of 9 rows on live data. The new index is
non-partial. It is still a merge across the creator's videos, not a single range scan, because
`video_comment` carries no `creator_id`; denormalising that would mean a write-path change plus a
backfill, which is not worth it at tens of videos.

### The bug this exposed — FIXED, and there were TWO of them

`creator_stats.published_video_count` was maintained on publish and unpublish and nowhere else.
Reading it for the first time turned up **two unmaintained paths, drifting in opposite directions**:

- **`deleteVideo` removed a published video without decrementing.** Drifts UP, permanently, once
  per published video a creator ever deleted.
- **`content-review.service.ts` published an approved anime episode without incrementing.** Drifts
  DOWN. Its own comment already called that path "the second door into publish" and gated it — it
  simply did not MAINTAIN what publishing maintains.

Because they pull opposite ways they could have cancelled out on one account, which is a good
reminder that "the number looks plausible" is not evidence.

**Both are fixed at the source**, and `scripts/reconcile-creator-stats.ts` (modelled on
`reconcile-project-stats.ts`, wired as `pnpm db:reconcile-creator-stats`) repaired the one drifted
row — 5 → 4 — and now reports clean platform-wide. Proven with real writes: publish twice → cache
2, delete a published video → 1, delete a draft → still 1.

**`total_view_count` is reported but never repaired**, deliberately. It is a LIFETIME counter and
deleting a video does not un-happen its views, so summing over surviving videos would "repair" it
to a smaller, wrong number. A mismatch there means the beacon transaction has a bug — investigate,
do not overwrite. Same call `reconcile-project-stats` makes about `dailyLogStreakDays`.

The summary reads the cache again now that it is correct. The live-count workaround is gone: a
cache the page refuses to trust is a cache nobody ever fixes, and this read being its first
consumer anywhere is exactly how the drift stayed invisible.

### The scheduled-publish gap — FIXED

Noticed while auditing the counter's writers: **nothing anywhere flipped a video from `scheduled`
to `published`.** Two paths set it — `publishVideo` when a creator picks a future date, and
`approveAnimeEpisode` when a moderator approves an episode with a later premiere date — and no job
ever acted on either. Since `PUBLICLY_SERVABLE` requires `publish_status = 'published'`, a
scheduled video was permanently invisible: in no feed, on no channel, reachable by no link. The
scheduling UI worked; the schedule did not.

`publish-scheduled-videos` is a tick-plus-job pair on a **one-minute** cron, modelled on
`sweep-dispute-windows` beside it. A creator announces a publish time to an audience; missing it by
up to an hour is a broken promise, and the sweep is one indexed range scan that finds nothing
almost every time.

**It re-runs the publish gates rather than trusting the schedule**, because time passes between
scheduling and firing: a moderator can hide the video, an edit can send an episode back to review,
a PATCH can clear `isMadeForKids`. `publishVideo` refuses all of those at the creator's request,
and the clock does not get a weaker gate than the creator. A row that no longer qualifies is **left
scheduled and logged**, not failed and not draughted — the condition is usually temporary, and
silently draughting someone's video because a sweep caught it mid-review is worse than the delay.

**It is the third door into publish, and it maintains what the other two maintain** —
`publishedVideoCount` moves in the same transaction as the status. That is the whole lesson of the
drift above.

Three details worth keeping: `published_at` is set to the **announced** instant rather than the
sweep's, so feed order matches what was promised rather than cron jitter; an embargoed anime
episode gets its `released_at` filled in here, since approval deliberately leaves it null; and each
row is taken `FOR UPDATE SKIP LOCKED` in its own transaction, so two sweeps cannot double-publish
or double-count and one bad row cannot roll back the others.

**Nothing was stranded.** No video anywhere was in `scheduled` state, so the bug had never bitten
real data — it was waiting for the first person to use the feature.

### Deliberately not built

- **No time series.** Every rollup is keyed by VIEWER or is platform-wide and none can be narrowed
  to a creator; the per-video snapshots that could back one are pruned at 14 days. A chart would
  need a new creator-keyed table and a nightly job.
- **No comment moderation state.** `video_comment` gains no columns. The schema records their
  absence as deliberate, and the tombstone delete erases `body_text` to `''`, so a hold-and-approve
  queue could not show what it was holding without changing that too.
- `video.commentModeration` and `commentSortOrder` remain unbacked, as documented.

---

## 26. Audit of §25 — five more counter doors, two ordering bugs, and the comments that lied

§25 said the drift was fixed. It was fixed at **two** of five doors. An audit of that session's own
work found the rest, plus a live parse failure on `/store/search` that predated it. All of the
below is DONE unless the sub-heading says otherwise.

### Live breakage — `/store/search` returned nothing

`SEARCH_DOCUMENT_KINDS` was `["product", "provider_offering"]` and the backend indexes a third,
`organization` (`store-search.service.ts:1353`). `items` parses as an array inside
`StoreSearchPageSchema`, so ONE organization hit failed the WHOLE page. Verified against live: an
unfiltered search returned 20 hits of which **9 were organizations** — every unfiltered search was a
dead result set. The frontend comment asserting "a seller organization is not indexed, so there is
no supplier directory browse" was the stale premise that made it wrong.

Fixed: third enum member, third branch in `SearchHitRow` linking to
`/store/organizations/{publicSlug}`, and the `documentKind` chip row iterates the same tuple so an
Organizations filter fell out for free. All 20 hits parse now.

### The three remaining counter doors

`published_video_count` also drifted through:

- **`publishVideo` moving `published` → `scheduled` with no decrement.** Reachable from public
  routes: publish, PATCH a future `scheduledPublishAt`, publish again. Video goes dark and stays
  counted.
- **`updateVideo`'s review reset moving `published` → `draft` with no decrement.** An anime creator
  hit this on **every title edit after approval**. There was no `creatorStats` write in
  `updateVideo` at all.
- **No row lock on read-then-write.** `loadOwnedVideoRow` was a plain SELECT outside the
  transaction in publish, unpublish and delete. Double-click Delete and both requests read
  `published`, one deletes, both decrement. `GREATEST(…, 0)` keeps it non-negative, which is not
  the same as correct.

All three fixed through one new helper, `lockOwnedVideoPublishState`, which takes `FOR UPDATE`
inside the transaction and re-reads the status — every counter move is now decided from the locked
row, never from the pre-transaction read. Proven with a 7-case harness including both
double-click races. The reconciler reports clean.

### Analytics listed drafts first

`creator-analytics.service.ts` ordered `desc(video.publishedAt)`. **Postgres `DESC` defaults to
NULLS FIRST**, and a draft has a null `publishedAt` — so a creator with 30 drafts opened
`/studio/analytics` to a page of 20 all-zero rows. The comment on that line claimed drafts "sort
last under `desc`". Now a raw `publishedAt DESC NULLS LAST` with `desc(video.id)` as the
unique tiebreak, matching `problem-clusters.service.ts:498`. This repo writes the NULLS FIRST trap
out in three files and still walked into it.

### The reconciler could introduce the drift it removes

`scripts/reconcile-creator-stats.ts`, three defects, all from §25's own session:

- **`--fix` had no `WHERE`.** It rewrote every row from a statement snapshot, so a concurrent
  `publishVideo` committing 5 → 6 mid-scan was overwritten back to 5. Now `SELECT … FOR UPDATE` on
  the drifted rows inside one transaction, so the increment path blocks and applies on top.
- **`::int` on a `bigint` sum** — `integer out of range` past 2^31 would take down the whole script,
  including the `published_video_count` repair that has nothing to do with views.
- **`total_view_count` was in the drift `WHERE`** while the module comment says it is EXPECTED to
  differ after any delete. Every creator who ever deleted a video was reported forever. Reported
  column now, not a predicate.

### The scheduled-publish sweep, hardened

`assertGatingSupported` was missing — `publishVideo` calls it as "the backstop re-check" and the
sweep's own docstring promised the clock gets no weaker gate. Unreachable today because
`video_gating_ck` covers it, but a stated-invariant hole. Also: no `LIMIT` and no `ORDER BY` against
a 300 s expiry, so a backlog would expire mid-loop and dead-letter after `retryLimit: 3`. Now
`ORDER BY scheduled_publish_at ASC, id ASC LIMIT 50`. Lock-skips are counted and logged separately —
a sweep that skipped 200 locked rows used to log nothing.

### The daily-log re-sweep — NEW

Deferring YouTube verification changed the failure mode: before, a failed verify meant no row; after,
the row survives with `video_verified_at` null. If the job dead-lettered — video deleted, private, or
an outage outlasting the retry ladder — **nothing ever re-checked it**.
`revalidate-youtube-embeds` filters `is_source_verified = true` on `video` and never touches
`daily_log`; `updateDailyLog` refuses edits once submitted, so the member had no route to fix it.

`resweep-unverified-daily-logs` is a tick-plus-job pair on `20 4 * * *` that re-enqueues the existing
`verify-youtube-video` job on its `dailyLogId` arm — no new verification logic. **The 7-day age bound
is the give-up policy and it is deliberate**: a genuinely deleted video will never verify, and
retrying nightly forever is a queue that never drains. Past the window `isVideoVerified: false` is
the honest permanent answer and the operator surface is `job_failure`. Proven both ways — an
in-window row is re-enqueued, a 30-day-old one is not.

### Comments that had gone false

Small edits, but the difference between comments you can trust and comments you have to verify:

- `analytics.schemas.ts` said `publishedVideoCount` is "COUNTED live server-side … that cache is not
  decremented" — a preserved description of a REVERTED version. It reads the cache.
- `studio-view.ts`'s `TRANSPORT: mock — NEITHER OF THE NEXT TWO IS EVER SENT` banner had drifted onto
  `researchProjectSlug`, a live wire field. Scoped to `attachedDocumentNames`, which is still mock.
- `video-elements-step.tsx` claimed it writes a `researchProjectId`; it writes a slug.
- `schema/studio.ts` called applying to a video's open role "a future feature (§12)" thirteen lines
  above the `openRoleId` docblock that describes it shipping.
- **The eleven `§22` citations in backend code meant FRONTEND `todo.md` §22.** Every other `§N` in
  those files points at a backend doc, so they read as a backend section that does not exist.
  Replaced with self-contained wording or the real `Appendix B4`.
- `commerce-trust.service.ts` and `STORE_BACKEND_STRUCTURE.md:3704` — "that job reads the `video`
  table alone". Its payload is a union now and it branches to `daily_log`. The conclusion (it never
  touches `commerce_review_media`) still holds; the premise did not.
- `commerce-product-venture.service.ts` cited `store.ts:2762-2784`; the column is at `:2781`.

Also wired: `useDeleteVideoCommentMutation` now invalidates `creatorAnalyticsKeys.commentInboxRoot`.
The key factory was an exported-but-uncalled surface — deleting a comment from the watch page left
it listed in `/studio/comments`.

### NOT DONE — doc drift, recorded here because each needs its own decision

None of these change behaviour; all of them mislead a reader.

1. **Sections written in future tense about shipped work**: `HOME_BACKEND_STRUCTURE.md` §8.3,
   `STUDIO_BACKEND_STRUCTURE.md` §9, §13 and §5.1. **§13 is the urgent one** — its verification
   recipe tells a reader to expect a behaviour that no longer happens, so following it looks like
   finding a bug.
2. **Route and job tables missing this session's additions**: `GET /users/me/creator-summary`,
   `/users/me/video-analytics`, `/users/me/video-comments`, `/research-projects/attachable`, the
   product-venture read, and the two new jobs (`publish-scheduled-videos`,
   `resweep-unverified-daily-logs`).
   **Partly closed:** the channel-profile pair and both self-read report routes now have rows in
   `docs/BACKEND_STRUCTURE.md`. The four `/users/*/reports` moderation routes still do not — they
   want a `§5.2f` in `HOME_BACKEND_STRUCTURE.md` modelled on §5.2c's table.
3. **The frontend repo carries stale FORKS of four backend docs.** They are copies, not links, and
   they have drifted. Decide whether to re-sync them or delete them and point at the backend repo —
   a fork that nobody updates is worse than no copy.

## 27. ~~`/channel/:handle` is linked from every feed card and DOES NOT EXIST~~ — FIXED

The channel page ships. `/channel/[handle]` renders a creator's header — avatar, name, `@handle`,
subscriber count, the same non-optimistic `FocusButton` the watch page uses — over a grid of their
public videos, keyset-paginated. Verified in a browser against a real creator: the page renders,
and **the cards inside it link back to channel pages**, which is the shape of the fix.

**Both broken link forms are gone.** `toVideoCardProps` kept `/channel/{handle}` because it is now
a real destination; `venture-video-reel.tsx`'s `/@{handle}` — a THIRD URL shape for a page that did
not exist — became the same one.

**Backend:** `src/modules/home/channels/`, mounted at `/channels` (not on `creatorRouter`, which
takes an **id** where these take a **handle**). Migration `0138` adds
`video_creator_recent_idx (creator_id, published_at DESC, id DESC)`, partial on the same five
status literals as `video_feed_candidate_idx` — `EXPLAIN` confirms an index scan with no Sort.
Full contract in `HOME_BACKEND_STRUCTURE.md` §5.2e.

**No new video projection.** `feed.service.ts` now exports `publicVideoPredicate`,
`feedSelectClause`, `toFeedVideoItem` and `FeedRow`, so a channel card and a home-feed card come
off the same select clause and cannot drift apart.

**It is a catalogue, not a feed** — no personalization, no already-watched exclusion, no recency
window, and **no `creator_mute` / `video_not_interested` suppression**: arriving at a channel is an
explicit request for that creator, the same call `GET /feed/search` makes.

Proven 9/9 against throwaway fixtures: newest-first order · a privated video leaves and returns ·
a moderator-hidden one leaves · one-row keyset pages walk the catalogue with no skip or duplicate ·
a constructed cursor is 422 · anonymous gets a real `false` · a subscriber gets `true` · an
unclaimed handle 404s.

### Left open, deliberately

**The channel page is not in `sitemap.ts`**, and it is the most linked-to public page on the site.
There is no public handle-enumeration read anywhere — `/handles/availability` answers about the
CALLER's own handle and is `requireAuth` — so there is no list to build entries from, and
`sitemap.ts` refuses invented entries as firmly as it refuses invented dates. Closing this needs a
bounded public read (say, creators with at least one published video), which is a backend decision
rather than a sitemap one.

**No `generateMetadata`.** The page title is "Channel" rather than the creator's name, because
titling it properly means a second fetch of a route the page already reads. Worth doing; not
measured yet.

## 28. Procurement's reply half and the review lifecycle — SHIPPED, frontend only

Two complete backend capabilities had **zero** frontend code. Not partial wiring — no wrappers, no
hooks, no components. Both are wired now, and neither needed a migration, a route or a product
decision.

**The pattern is worth naming, because it is how both stayed invisible.** A route with no caller
looks identical to a route that does not exist, and the uncalled-wrapper audits at the bottom of this
file only catch a wrapper that EXISTS and is unused. Neither of these had a wrapper to catch.

### 28a. A provider can answer an RFQ

A buyer could draft and open an RFQ and a provider could list incoming ones — and then the flow
stopped. `(studio)/studio/rfqs/[rfqId]/page.tsx` described itself as "A request for quotation **you
can answer** on Qatoto" and offered no way to answer it. `GET /commerce/provider/quotes` had no
wrapper anywhere and there was no `/studio/quotes` list route at all, only `[quoteId]`.

Shipped: `quote-composer.tsx` at `/studio/rfqs/[rfqId]/quote`, the eight-arm
`quote-service-detail-fields.tsx`, `/studio/quotes` as a real list, four api wrappers, four hooks,
and entry points from the RFQ detail, the quote detail and the studio sidebar.

**Five backend facts shaped it, none of them guessable from the route list.** They are restated in
the composer's header because getting any one wrong produces a screen that works until it doesn't:

- **Creating the shell tells the buyer you answered** — it flips the invitation to `responded`,
  which the buyer's page renders as "Quoted". So the shell is minted on the first pricing attempt,
  never on mount.
- **One quote per provider per RFQ, forever.** A second is a 409 regardless of the first's status, so
  withdrawing does not free the slot. That 409 is a RECOVERY, not an error.
- **Append is a commitment, not a save.** Only one unsubmitted revision may exist and there is no
  abandon route, so the composer goes terminal after a successful append rather than back to a form
  whose next press would 422.
- **Only the shell call checks the RFQ's state.** Append and submit check the QUOTE's status, so a
  provider with an existing quote may keep revising after the buyer closes the RFQ. Gating the
  revise path on `state === "open"` would block a legitimate revision.
- **Three routes, three idempotency keys.** The middleware replays a key against the body it first
  saw, so one key shared across them makes the second call return the first call's answer.

**The FX rate is the riskiest field on the surface**, and it is parsed as a string rather than a
number. `Math.round(Number("1.0840") * 10 ** 4)` computes through `10839.999999999998`; the
string parse is exact and preserves the trailing zero, because a rate quoted to four places is a
different commitment from one quoted to three. Hand-verified to round-trip through
`formatFixedPointRateLabel`.

**One gotcha for anyone extending this**: the RFQ requirement union discriminates on `providerKind`
and the quote's `serviceDetail` union discriminates on `kind`, with freight and logistics sharing one
arm on the write side. `rfq-requirement-detail-fields.tsx` is the structural model, **not** a file to
copy — copying it 422s every service line.

### 28b. A buyer can leave a review, with evidence

`GET /commerce/completions` exists on the backend specifically because `completionId` "was projected
on NOTHING, so a buyer had no way to obtain the id the route demands. Ratings, review photos and
review videos were all reachable only by guessing a UUID." **It was never wired.** That is why the
product page's "Reviews can only be left by a buyer whose order completed" was true in a way nobody
intended: no buyer could leave one either.

Shipped: `/orders-and-returns/reviews` over the completions read, `review-composer.tsx` (rating,
body, per-axis scores, and the one edit), and `review-media-panel.tsx` (photo upload, YouTube
attach, remove) — the author-facing surface `commerce_review_media_state` was built for.

Rules the UI honours rather than assumes: `shipping` is offered only on a product completion
(a 422 `UNSUPPORTED_SCORE_AXIS` on a service engagement); `scores` is at-least-one-axis or an omitted
key, never `{}`; `hasReview` counts hidden reviews, so a hidden one still spends the slot; media
position is server-assigned and the photo upload takes no text fields at all.

### ~~What 28 left open — two backend asks~~ — BOTH CLOSED. See §30.

Both shipped. The first one is worth reading for the finding rather than the fix.

### Not built, deliberately, and each is its own piece of work

- **Documents on a quote.** There is no route to attach one, the same gap the RFQ composer already
  names. The review step says so and ships no control.
- **`/studio/quotes` has no status filter UI.** The read accepts `?status=` and the wrapper passes it;
  nothing sets it yet.
- **`/studio/reviews` does not page.** The read is keyset and its cursor is SORT-SCOPED — carrying one
  across a change of sort is a 422 — so paging needs a cursor that resets on every filter change. The
  page says plainly that it shows the first page only rather than pretending to be complete.

---

## 30. The quote-expiry trap, and the rest of the review lifecycle — SHIPPED

Both of §28's backend asks, plus the three review surfaces that had routes and no callers.

### 30a. The expiry trap is closed, and the database had allowed it all along

`DELETE /commerce/quotes/:quoteId/revisions/:revision` ships. A provider who priced a revision and
watched its deadline pass can now discard it and price again, from either the resume panel or the
just-appended panel, behind one confirm press.

**THE FINDING WORTH KEEPING: no migration was needed, because the schema anticipated this route.**
`commerce_quote_revision_append_only` has fired `BEFORE UPDATE OR DELETE` since `0045`, and its
DELETE arm raises only when `submitted_at IS NOT NULL` — otherwise `RETURN OLD`. Deleting an
unsubmitted revision has been permitted since Phase 3; only the HTTP layer was missing. §28 costed
this as a schema change and was wrong.

**The counter rollback is the whole risk, and it is `max(revision_number)` of the survivors rather
than `latest - 1`.** A stale `latestRevisionNumber` does not merely skip a number: `submitRevision`
and `acceptQuote` both refuse unless the revision number EQUALS it, so a counter naming a deleted row
would leave a surviving SUBMITTED revision permanently unsubmittable and unacceptable — and the
expiry sweep only matches a quote whose latest revision row exists, so such a quote could never
expire either. `latest - 1` is only accidentally correct because append is the sole writer.

**No audit entry, deliberately.** The four `quote_*` audit kinds are all events the BUYER can
observe; an unsubmitted revision was never visible to the counterparty. Auditing it would need a new
enum value in its own migration shipped ahead of the code, for an event with no counterparty. Say so
if you disagree — it is a two-step deploy, not a line.

The service guards `submittedAt` and answers `INVALID_STATE` (409); the trigger stays the backstop
rather than the mechanism, because its `23514` is indistinguishable from any other check violation.

**Ten comment sites that asserted this was impossible were corrected.** They were the files that made
the trap legible, and a comment that outlives its fact is worse than none.

### 30b. The review lifecycle is complete on both sides

- **`GET /commerce/reviews/:reviewId` — new**, the only author-facing review READ. Every other
  author route is a write, so before this a buyer could publish a review with photos and never see
  them again: closing the tab made the attachments unlistable, unremovable, and a YouTube video the
  host later deleted undiscoverable rather than reported. It projects media `state`, which the public
  read drops along with the unavailable rows themselves. `ReviewMediaPanel` now hydrates from it, and
  its "only while you are on this page" caveat is gone.
- **Helpful votes** — frontend only, and `review.viewer` finally has a reader. It was parsed on the
  wire and consumed by nothing. The control renders unpressable when `viewer` is null, exactly as
  `ratings-and-reviews.tsx` had already specified in prose. It lands on both surfaces that mount that
  component — the product page and the watch page's Reviews tab.
- **`/studio/reviews`** — the seller's inbox, reusing `StoreReviewListPageSchema` verbatim because the
  backend answers the same `{ summary, items, page }` the product page reads. The sidebar's
  `rateReview` icon had been defined and used zero times, waiting for it.
- **The seller's reply**, from the inbox.

**Three inbox behaviours that look like bugs and are not**, all recorded in the file headers: the
seller's `viewer.hasVotedHelpful` is permanently `false` (a party may never vote, so no control is
offered there), `reviewer` is null for a non-public buyer organization (no privileged identity in
your own inbox), and `summary` is computed over every visible review rather than the filtered page.

**The reply is not a free-form upsert.** A first reply is always allowed however old the review, but
revising is bounded twice — once only, and within 30 days of the REPLY's creation — and `editedAt` is
not on the wire, so the client cannot pre-empt either refusal. Both controls stay enabled and the
server's own sentence is rendered verbatim; a disabled button there would be a guess.

---

## 31. The channel profile, and the abuse path that had to ship with it — SHIPPED

The channel page grew an About panel, a description and links, and the reporting domain that makes
publishing them defensible. Four migrations (`0139`–`0142`), all additive.

### 31a. The About panel, and two counters that are NOT the cached ones

`joinedAt`, subscribers, videos and views. The last two are **aggregated over
`publicVideoPredicate()` — the grid's own predicate — rather than read from `creator_stats`**, and
that is the whole reason they are publishable:

- `published_video_count` counts published rows REGARDLESS OF VISIBILITY, so it routinely exceeds
  the grid beneath it. A header saying 12 over a grid of 9 reads as a bug, and explaining it means
  explaining which three are private.
- `total_view_count` is a lifetime figure including views of videos since made private or deleted —
  a fact about withdrawn content, and one a viewer could diff against the visible grid to infer that
  deleted videos existed. It is also never reconciled and is EXPECTED to disagree with the sum over
  survivors.

Verified against live data: 4 videos / 4 cards, 3 views / 3 views.

**It also shipped a hydration error, which is worth recording because every gate missed it.**
`<ChannelAboutOpener>` sat inside a `<p>`, and the sheet it renders is a `fixed inset-0` DIV — which
a `<p>` may not contain, so the parser closed the paragraph early and the server's markup and the
client's tree genuinely differed. `tsc`, oxlint and `next build` all passed. Only the browser caught
it.

### 31b. `user.bio` + `user_profile_link`

Public the moment they are written, which **diverges from every precedent in this schema** —
`talent_profile.visibility` defaults to `private`, `community_cofounder_profile.state` to `draft`
behind moderation. That is only defensible because §31c shipped with it. If the reporting domain is
ever removed, the bio must go back behind a gate.

`https://`-only on the URL, enforced by a database CHECK — proven against live data, an `http://`
link is refused with `23514`. It is a security control, not a format preference: the value becomes an
`href` on a public page.

**The editor is ONE component rendered by two surfaces** — the account dropdown panel and
`/studio/customize`, which graduated from `kind: "planned"` to `kind: "route"`. They cannot link to
each other: `AccountMenu` has no URL and closes on an outside click, which is why `/settings` and
`/your-account` were deleted as routes. The preview renders the _same_ `ChannelProfileDetails` the
channel page does, so it cannot drift.

### 31c. Reporting a profile, and a lever that is deliberately narrow

`user_report` + `user_moderation_action` + `user.profile_moderation_state`, a report sheet on the
channel and a queue at `/admin/profile-reports`.

**Upholding hides the bio and links and NOTHING ELSE** — not the name, not the avatar, not a video,
not the ability to sign in. That narrowness is the design: those two fields are new, so the channel
read is their only public consumer and one enforcement point covers them completely. A platform-wide
"hidden user" would need every public read of a person to honour a new predicate — six modules in
`home/` alone before the feed, spotlight, store and R&D — with **nothing failing if one were
missed**. A half-enforced hide is worse than an honest narrow one.

It is **not** `deactivated_at`: that column's invariant is that a live session implies NULL, so a
moderator writing it would be undone the next time the person signed in.

**The subject is told.** `getMyChannelProfile` returns the moderation state and the editor renders a
banner, because upholding a report notifies nobody — without it, somebody asked to fix a problem
would open an editor that looked exactly as it did before. "They can still edit it" is only true if
they know there is something to edit.

**`severe_harm_escalation` is a reason with no matching action, on purpose.** The other five name
things the lever can address. Severe harm is not one, and the alternatives were worse: `child_safety`
would read as the platform having acted when it had not, and omitting it entirely collapses real
danger into `other` where it is triaged like spam. So the queue marks those rows as needing something
this product cannot do. **It must never acquire an automatic action** — a reason that triggers a hide
on a count makes brigading measurable and then effective.

### 31d. The privacy work, which is the part with no safety net

- **`user.bio` is invisible to `db:verify-anonymization-coverage`.** That script walks foreign keys
  into `user`; a scalar column has none. The scrub's single `bio: null` line could be deleted and
  nothing would turn red — so the `"the identity is gone"` assertion in `scripts/smoke-privacy.ts`
  was extended to cover it. Those two belong together.
- **`user_report.reported_user_id` is `retain`.** A report filed ABOUT somebody survives their
  erasure, because otherwise requesting deletion would erase the enforcement history against you —
  deletion becomes a ban-evasion route, and the record a future moderator needs is what it destroys.
- `user_profile_link` rides in the Art. 15 export beside the bio. It was nearly missed: the bio is a
  column and the links are a table, so adding one did not surface the other.

**The verifier was already red before any of this**, and that is the finding worth keeping. Six user
references from migrations `0127`–`0130` were never classified, so by the manifest's own definition
their PII survived an erasure silently. It reads `All 6 anonymization-coverage guarantees are in
force` now, over 163 references.

### What 31 left open

- **`talent_profile.bio` is the one other public self-description with no moderation lever.** A
  person whose channel bio is hidden can put the same text there. Out of scope by decision, not by
  oversight — recorded so the next reader knows which.
- **One entry point for reporting a profile** — Channel → About → Report. Video reporting sits on
  every card menu.
- **No tests on the new domain.** The behaviours that would actually bite: uphold-closes-all-siblings,
  `MODERATOR_IS_SUBJECT`, the already-visible restore refusal, and the `isNull(anonymizedAt)` guard
  on the profile write.
- **Nothing has been watched in a browser.** Every authenticated path here — saving a bio, filing a
  report, upholding one — was verified structurally and by route gating, not by eye.

---

## 29. Still open, in the order worth taking them

Written down after auditing every claim in this file against HEAD, because several entries above had
gone stale in both directions.

1. **`/anime` end to end — the last fabricated surface on the site.** Five pages read
   `@/mocks/anime-mocks` and the routes are excluded from `sitemap.ts` for exactly that reason. The
   backend has the tables — `anime_series` / `anime_season` / `anime_episode`, with `genreTags`,
   `status` (ongoing/completed/hiatus), `releaseScheduleDay`/`Time` and `premiereDate` — plus
   `trendingVideoSnapshot` (hourly, ranked) for the ranking page. What does not exist is any PUBLIC
   catalogue read: all eleven `/series` routes are `requireAuth` and owner-scoped, and the feed has
   no `videoType` facet, so anime episodes are indistinguishable in it. This is one new public
   backend module plus five page rewires. Two notes for whoever takes it: **`/anime/favorite` is
   nearly free** — it is Liked and Bookmarked, which `GET /users/me/liked-videos` and
   `/saved-videos` already serve, needing only a `videoType` filter — and **`/anime/genre`'s chips
   and `/anime/ranking`'s sort currently change nothing**, they re-render the same mock array, so
   wiring them is a behaviour change rather than a data swap.

    **⚠️ THE BLOCKER IS CONTENT, NOT CODE — and that reorders this whole list.** Probed against the
    live database on 2026-08-27: `anime_series` **0 rows**, `anime_season` **0**, `anime_episode`
    **0**, and `video WHERE video_type = 'anime_episode'` **0**. Wiring the five pages today would
    replace five pages of invented content with five blank ones. **YouTube's own decision is the
    precedent: it does not ship a vertical it cannot fill** — Movies & Shows launched with licensed
    inventory, not a browse skeleton. Leaving `/anime` on mocks is therefore a decision, recorded
    here, and it is revisited when the first series is seeded rather than on a schedule.

    **IT IS ALSO CHEAPER THAN THE PARAGRAPH ABOVE BILLS IT.** No migration — every column exists. The
    projection discipline is already written: `src/modules/studio/series/public-series.service.ts` is
    "the ONLY public read of an anime series anywhere on the platform" and already states why the
    studio's own eleven `/series` routes must stay owner-scoped (they return unreleased episode
    titles, premiere dates and the production schedule). And `/anime/watch` is already the real watch
    page, not a mock.

    **TWO DECISIONS BLOCK IT, and only one was known.** (a) `genreTags` is a free-text array, so a
    genre chip row needs a canonical list. (b) **`/anime/ranking`'s period selector cannot be served
    by `trending_video_snapshot`** — its columns are `as_of`, `rank`, `trending_score_points`,
    `counted_views_in_window` and the component points, with **no period dimension at all**. It is a
    rolling HOURLY top-200. "This week" and "this month" are not filters over it; they are a second
    snapshot cadence, or they are not offered.

2. ~~**SEO closeouts.**~~ **SHIPPED.** `/store/product/[id]` and `/channel/[handle]` both carry
   `openGraph` **and** `twitter`, and `src/app/manifest.json` has `start_url`, `scope`, `id` and
   `description`. Three things were learned doing it that the entry above did not know:
    - **⚠️ Next REPLACES `openGraph`, it does not merge it.** A route that sets its own `openGraph`
      discards the root layout's ENTIRELY, `images` included — so a page that omits `images` because
      its own subject has none emits NO `og:image` rather than falling back to the branded card. The
      seeded catalogue has no product photos, which is how this was caught in the served HTML. The
      fallback is now named explicitly through `SITE_SHARE_IMAGE` in `src/lib/site.ts`.
    - **`twitter` is a separate top-level key that does not read `openGraph`.** Setting only
      `openGraph` left the root layout's twitter block inherited whole, so X kept showing
      "Qatoto : Product Research…" on every product and creator link while Slack showed the real one.
      One network still generic is the same defect, not a smaller one.
    - **The channel `generateMetadata` objection was removed rather than accepted.** It was refused as
      "a second fetch of a route the page already reads" — true, because that read is `cache:
"no-store"` (the profile carries the viewer's own subscription state) and Next does not memoize
      those. `loadChannelProfileOnce` in `src/lib/channels/server.ts` wraps it in React's `cache()`.
      Measured, not assumed: one page load makes ONE backend call with both the metadata and the page
      reading the profile.
3. ~~**The channel sitemap.**~~ **SHIPPED, OPT-IN.** Migration `0144` adds
   `user.is_channel_listed` (default **false**), `GET|PATCH /users/me/channel-profile` carries it, a
   checkbox in the shared `ChannelProfileEditor` sets it, and `GET /channels` is the public
   cursor-paged enumeration `src/lib/sitemap-sources.ts` walks. Five things worth keeping:
    - **Opt-in, and that was the decision rather than the default.** A directory of PEOPLE is not a
      directory of products — the cofounder directory argued it first.
    - **It governs DISCOVERABILITY, not visibility**, and the editor's copy has to say so. The
      channel page is public either way and is already linked from every feed card.
    - **⚠️ THE VIDEO TERM DOES NOT READ `creator_stats.published_video_count`.** It joins `video`
      under `publicVideoPredicate()`. That column is a counter cache AND counts the wrong thing —
      `publish_status = 'published'` regardless of visibility — so a creator whose videos are all
      unlisted has a positive count and an empty channel page. Announcing that files a soft 404,
      which `sitemap.ts`'s own header calls worse for the domain than never announcing it.
      **Verified live both ways**: opted in with no public video → excluded; with one → listed.
    - **⚠️ THE THIRD SCALAR THE ANONYMIZATION VERIFIER CANNOT SEE**, after `user.bio` and
      `video_document`'s object keys. The scrub clears it explicitly and nothing structural would
      turn red if that line went. `smoke-privacy.ts` now creates its probe with the flag ALREADY
      TRUE — asserting `false` against a column that defaults `false` is a guard that can only pass.
    - **⚠️ IT SHIPS WITH ZERO URLS.** 69 users have handles; only **2 creators have any public
      video**, and nobody is opted in. The section fills itself as creators tick the box — nothing
      here is fabricated — but it does not grow today, and the deliverable is the control.

4. ~~**Provider directory filters.**~~ **SHIPPED, all eight keys plus facets.**
   `ProvidersQuerySchema` went from 3 keys to 11, `PublicProviderCard` gained `providerKinds`, and
   the response carries `facets` beside `items`/`page`. Four things worth keeping:
    - **1a shipped WITH the filters, not after.** A row could not say what it did —
      `commerce_provider_kind_link` was filtered on and never projected — so narrowing to customs
      brokers returned cards that did not say "customs broker", which looks broken rather than
      absent. Filters without it would have been worse than no filters.
    - **The A13 split became a conflation risk rather than an omission.** The card now carries
      profile-level AND per-kind verification, so they get two label maps —
      `PROVIDER_VERIFICATION_LABELS` (every string says "Profile") and
      `PROVIDER_KIND_VERIFICATION_LABELS` (no string says "profile"). Neither implies a regulator's
      licence.
    - **The chips are facet-driven, not enum-driven.** The kind row used to render all nine
      `PROVIDER_KINDS` regardless; with one provider seeded that is eight chips returning an empty
      page. Verified live: every facet count equals the row count its own filter returns, and no
      zero-count bucket is emitted. `FacetChipRow` was hoisted out of `store-search-page.tsx` so the
      rule lives in one place.
    - **A latent cursor bug fell out of it.** `buildFilterHref` dropped `page` but carried `cursor`
      across a filter change, so filtering from page 2 resumed the NEW result set partway through and
      silently hid every row sorting before it. It now drops `cursor` unless the patch names it —
      paging SETS a cursor, filtering CLEARS one. This also fixed `/store/search`, which had it too.
5. ~~**The six missing doc rows**~~ **WRITTEN.** The three creator self-reads went into a new
   `HOME_BACKEND_STRUCTURE.md` §5.2f (with the reason they sit on the users router rather than the
   videos one — `videosRouter` mounts first and shadows any two-segment `/videos/X`);
   `publish-scheduled-videos` joined HOME §6's job table; `resweep-unverified-daily-logs` and
   `GET /research-projects/attachable` joined R&D §4e and §5's tables.
6. ~~**`attachedDocumentNames` costs a creator data today**~~ **SHIPPED — three halves, not one.**
   The studio's "Attach documents" control kept `documentFile.name` and threw the bytes away;
   `toCreateVideoInput` dropped even the name, under copy promising "Deck or whitepaper shown as a
   download under the video". A creator lost their file with no error. What was actually missing:
    - **Write.** Nothing had ever written `video_document` — **0 rows**. Now `POST
/videos/:videoId/documents` (multipart, PDF, 25 MB, 5 per video) and `DELETE …/:documentId`,
      built on the research-paper rail: `createSingleFileUpload`, byte-level `validatePdfBytes`, and
      Backblaze object storage.
    - **Public read.** `videoDocument` was read by the STUDIO owner projection alone, so even a
      populated row rendered nowhere. `GET /feed/watch/:videoId` now carries `documents`.
    - **Frontend.** Pending `File` objects live in modal state like the thumbnail already did, and
      upload in a **fourth follow-up pass** in `saveDraft`.

    Five decisions worth keeping:
    - **⚠️ `video_document` HAS NO `url` COLUMN, AND ADDING ONE WOULD BE A REGRESSION.** A URL
      outlives the gate: a link handed out while the video was public keeps working after it is
      unpublished, because bytes do not know a row's visibility changed. The key is stored instead
      and every download re-runs the video's public gate. **Verified live**: a signed-out download
      404s the moment the video goes private, while the owner's still 302s.
    - **Content-addressed, so there is no idempotency key.** The object key derives from the SHA-256
      and the row is unique on `(video_id, content_sha256)`, so a retried upload converges on the
      same object and the same row — stronger than a replayed response. Verified: re-uploading the
      same file returned the same document id.
    - **⚠️ THE CASCADE CLEANS ROWS, NOT BYTES.** `video_document` cascades from `video`, which
      cascades from `user`. `deleteVideo` deletes the objects beside its thumbnail cleanup, and the
      account scrub does it as a **resumable step before the manifest loop** — after that loop there
      is no row left naming the keys. `video_document` correctly gets **no manifest entry** (no FK
      into `user`); one would fail the verifier's check 2 as stale, the same trap `user.bio` hit.
    - **`ObjectStorageError` is translated, not merged**, into the studio's error union: its three
      literals are byte-identical to `CloudinaryError`'s, so merging would have made a failed PDF
      upload answer _"Could not store the image"_.
    - **A latent bug caught before shipping:** `sanitizeDownloadFileName` appends `.pdf` because it
      is built for a paper TITLE, so an uploaded `deck.pdf` would have downloaded as `deck.pdf.pdf`.
      The filename-preserving `sanitizePrivateFileName` is used instead.

7. ~~**One of the nine graduated: `/studio/funding`.**~~ **SHIPPED**, and it corrected a claim this
   file had been repeating. §26 said the planned Studio routes "each need a whole backend domain,
   not a screen" and that "nine of them have no backend whatsoever" — the evidence list it offered
   never named `funding`. The R&D funding domain is **complete**; what was missing was ONE READ.
   `listProjectFundingRounds` is per-project and `listMyPledges` is backer-side, so nothing spanned
   a founder's projects and a founder with three ventures raising at once opened three pages.
   `GET /funding-rounds/mine` closed it. Three decisions:
    - **Founder-scoped, matching the WRITES.** `researchProject.founderUserId`, the same gate
      `POST …/funding-rounds` uses. A read that showed maintainers rounds they cannot open or close
      would be a looser rule wearing the same name. **Verified: a non-founder sees zero rows.**
    - **⚠️ `/funding-rounds/mine` IS DECLARED BEFORE `/funding-rounds/:roundId`** or the literal is
      captured as a round id and every founder gets a 404 instead of a failure.
    - **It reads and does not write.** Open, close, edit and milestones stayed on the project's own
      funding tab where they are already wired and already gated; each row links through. Two sets
      of controls over one set of columns is two places to fix a bug and two chances for the money
      copy to drift.
8. **The eight `planned` Studio routes that are left.** ⚠️ **DO NOT INHERIT A COST FROM THIS LINE
   WITHOUT CHECKING IT** — the version above it was wrong about `funding` for months. **Five
   genuinely need a new domain**: `subtitles` (no caption table; `captionCertification` is a text
   column on `video`), `copyright` (a video-REPORT-REASON enum member, not a claims table),
   `pitches` (`pitch` is a `video_type` enum member, not a table), `team` (account-level
   collaborators; the `video_collaborator` table is per-video and already wired) and `earn` (a money
   rail — escrow left this codebase, §7). The other three — `learn`, `support`, `feedback` — are the
   `/customer-service` shape and have not been costed since that page shipped as authored content.

### Corrections to this file, found by checking rather than reading

- **`REMAINING_WORK.md` §1 — "The sidebar has no session gating at all" — is STALE.** `sidebar.tsx`
  imports `useViewerSignedIn`, filters on a `requiresSession` flag and suppresses emptied sections;
  `sidebar-slot.tsx` is the server wrapper that supplies the boolean, and its header narrates fixing
  the exact defect that entry still describes in the present tense.
- **`docs/BACKEND_STRUCTURE.md` DOES have a privacy section** (§11), contrary to §10 above.
- **The channels routes ARE documented** — `HOME_BACKEND_STRUCTURE.md` §5.2e — contrary to §26's
  third doc-drift item. The other two doc-drift items stand.
- **`findings.md` is entirely stale.** Every move it costs out shipped as §19–§23.

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
    $(find src/lib -name '*.api.ts') | sort -u); do
  rg -q "\b$f\b" src/hooks src/components src/app || echo "UNCALLED-API $f"; done
```

**THE GLOB IS NOW `find`, NOT FOUR HAND-LISTED DIRECTORIES**, and that is the third time this has
bitten. It started as `src/lib/store/*.api.ts` alone, which is why seven R&D wrappers went unnoticed;
it was widened to four directories, and `src/lib/users/*.api.ts` then shipped outside all four — so
the audit that is supposed to catch unverified code was not looking at the newest code in the repo.
A hand-maintained list of places to check is a list that will be wrong again.

**Both are silent today.** The second printed seven R&D names until those wrappers were wired
(`listRoundBackers`, `listEquitySnapshots`, `verifyStatementChain`, `getAuditHashInput`,
`updateWorkshopChatMessage`, `deleteWorkshopChatMessage`) or deleted as a duplicate
(`getProjectEquity`). A name reappearing here is unverified code, not a style nit.

Note the banner check uses `--files-without-match`; `rg -L` is `--follow` and silently reports
the opposite of what it looks like it reports:

```bash
rg --files-without-match 'TRANSPORT:' src/components/home/research-and-development --glob '*.tsx'
```
