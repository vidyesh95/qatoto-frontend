# TODO

**Open work only.** Everything that shipped is deleted from this file — the code, the backend docs
and `git log` are the record of what was built and why.

> **Pruned 2026-08-27, from 1,531 lines.** The rule above had stopped being true: roughly 1,100
> lines were retrospectives on shipped work, and three of them (§8 SEO, §17 provider filters, §2's
> mock-file count) had gone far enough out of date to actively mislead — they described work that
> had since shipped. Nothing was deleted until its reasoning was confirmed to exist in a code
> comment or a backend doc; the one thing that lived ONLY here — the hand-written migration
> workflow — moved to `qatoto-backend/docs/AUTH_SETUP.md` §6 first, which also had to stop telling
> readers to run `pnpm db:generate`.
>
> **Section numbers are NOT reindexed.** They are anchors: several sections cite `§19.10`/`§19.11`
> in the backend contract, and renumbering would silently point those at the wrong thing. Gaps in
> the sequence mean an item shipped.

---

## At a glance

**Blocked on a purchase, not on code** — §11 (SMS provider), §18 (freight rate cards).

**The one substantial build left** — §5, cost of goods and therefore margin.

**Decided, specced, not yet built** — `/studio/pitches`. The definition that blocked it is
settled and the plan is [docs/PITCHES_STRUCTURE.md](docs/PITCHES_STRUCTURE.md); it needs two new
backend tables and is gated on the terms-of-service rewrite under **Decisions needed**.

**Everything else** is either content-blocked (`/anime`), a new backend domain nobody has asked
for yet (§15, §16, four of the eight planned Studio routes), or a question for Vidyesh rather than
a task (**Decisions needed**).

---

## Blocked

### 11. `phone_number` column — BLOCKED ON A VENDOR, not on code

`session.user.phoneNumber` and `phoneNumberVerified` are declared client-side in
`src/lib/auth-client.ts` via `inferAdditionalFields`, and the backend has no `phoneNumber()` plugin
and no column — `rg phoneNumber qatoto-backend/src` returns nothing.

⚠️ **THIS WAS A LIVE BREAK UNTIL 2026-08-27 AND IS NOW INERT.** The panel shipped a working-looking
two-step OTP flow driving `authClient.phoneNumber.sendOtp()`, which type-checked and put a request
on the wire: `POST /api/auth/phone-number/send-otp` answers **404**. Anyone who opened Settings →
Phone number and pressed "Send code" got an error for a feature nothing implemented. The panel now
renders read-only and says phone verification is not available yet — the `/customer-service` shape,
on its stated ground that an unanswered form is worse than an honest signpost.

**It is a purchase before it is a migration.** Better Auth's `phoneNumber()` plugin requires a
`sendOTP` implementation and there is no SMS provider in `src/config/index.ts` or `.env.example` —
the only OTP delivery configured is Brevo, which is email. Writing the plugin first would leave a
route minting codes nobody receives, the same failure one layer down. `git log` has the removed
flow; nothing about it was wrong except that nothing answered it.

### 18. Freight rate data

`delivery-sheet.tsx` works. The routes, tables and rating service all exist, and the rate tables
ship **empty by design** (A36). Every lane answers `no_active_rate_card` and `shippingInCents` is
permanently `0` until a forwarder lane list is purchased. Nothing to build — this is a buying
decision, and [the uncovered-inland-leg rule](#decisions-needed) should be settled before the money
is spent.

---

## Seller cost-of-goods and margin — DECIDED: NOT BUILDING IT

⚠️ **THIS WAS THIS FILE'S HEADLINE ITEM AND IS NOW CLOSED. Do not reopen it as an oversight.**
`seller-earnings-panel.tsx` says profit and margin are not shown because Qatoto never records what a
seller paid. That copy is correct and stays. Three reasons, in order of weight:

1. **This codebase forbids the operation, in its own words, three times.**
   `commerce-earnings.service.ts`: _"A client is free to render them together. It is not free to add
   them."_ · `commissionOwed` _"sits in its own member and is never netted off"_ · _"there is
   deliberately no grand total in this response, and adding one later would be a regression rather
   than a feature."_ Margin is the most combined number available — a SELF-REPORTED cost subtracted
   from PLATFORM-MEASURED revenue, across the exact A13 boundary
   `commerce_journal_account_memorandum_ck` exists to hold. The same three sentences also rule out
   the tempting middle path of a "net after platform deductions" figure: netting refunds is refused
   because it _"would make a fully refunded order indistinguishable from one that never happened"_.
2. **Alibaba and AliExpress both omit it; only Amazon has it.** Amazon sellers need a COGS input
   because Amazon's own fee soup obscures take-home — Qatoto already shows `commissionOwed` as its
   own line running the other way, so the platform-knowable half of that gap is already closed here.
3. **Nobody would fill it in.** Per-order-line manual entry, no purchase record, no import, no ERP
   hook. A margin computed over 12 of 47 orders is worse than no margin, which is what the panel
   already says.

**If this is ever revisited**, the constraint to design around first is that the cost cannot live on
`commerce_order_product_line` — that row is an immutable commercial snapshot and a seller-entered
cost is correctable.

---

## Frontend

### 2. The video domain — two `TRANSPORT: mock` banners remain

`rg -l "TRANSPORT: mock" src/` returns **two** files:

- `src/components/home/watch/comments.tsx` — `trending` only
- `src/components/home/watch/watch-content.tsx` — `transcript` and `isPremium` only

**Neither imports a fixture.** Each holds an inline EMPTY placeholder — `[]`, `undefined`, `false`
— so a real component shell survives with its layout intact, and each banner names a backend gap
rather than an unfinished screen. Deleting a placeholder is a one-line change AFTER its field ships.

**Each needs a new backend capability — a table, a job or a model, not just a route:** transcript
(no ASR pipeline, no transcript table, no column on `video`); `isPremium` (no entitlement model, no
tier, no paywall anywhere); trending search terms (no aggregation). Download is structurally
impossible — the bytes are on youtube.com.

### 9. Never exercised

- **`standardName`** — the seed creates 7 uncoded and 0 coded factory certifications, so the field
  added for it has never met a live payload.
- **The delivery-address 429** — the seeded checkout sends no `deliveryAddressId`, so the reveal
  404s before the limiter is in play.
- **The browser.** Every store contract above was asserted over HTTP. No screen has been watched
  rendering.

### Share targets have no brand marks

`public/icons` has `mail` and nothing else, so three of the four `video_share_channel` targets — X,
WhatsApp, LinkedIn — render the generic `share` glyph and are told apart by their labels. Hand-
writing trademarked logo paths from memory was the worse option. Drop real assets in.

### The feed's negative signal has two known limits

- **A topic penalty only lands where a snapshot row already exists**, because the job's `FROM` is
  `video_view_session` — a category dismissed but never watched gets no damping. Widening it means
  writing rows whose only evidence is negative, and since the ranker's `max(COALESCE(...))` treats a
  stored 0 as _stronger_ suppression than an absent row, that is a real ranking change rather than a
  one-line fix.
- **Un-muting takes up to one nightly cycle to stop damping.** The hard filter lifts instantly.

---

## Backend (`qatoto-backend`)

### 15. Multi-axis variants

`commerce_product_variant_option{variantId, optionName, optionValue, position}`. A26 defers it
deliberately — building axes early migrates every row that reaches an immutable order-line
snapshot, for a UI nothing has asked for yet.

### 16. Incoterm semantics

Phase 23 shipped the vocabulary only; nothing branches on the value. Needed for port-to-port
pricing on an uncovered inland leg. Note the casing: `commerce_incoterm` is UPPERCASE, unlike every
other enum on the wire.

### Procurement — all three SHIPPED

- ~~**Documents on a quote.**~~ **Both sides now.** `commerce_quote_revision_document` (`0146`) plus
  `documentIds` on the revision-append body, and an attachment step in BOTH composers. The entry
  said "there is no route to attach one" — **that was stale**: `POST /commerce/documents` had
  shipped with encryption, virus scanning and audit entries, and the RFQ composer carried the same
  stale "backend gap" banner. Fourth entry this session costed before its rail existed.
    - **⚠️ KEYED ON THE REVISION, NOT THE QUOTE.** A revision is the immutable offer, so keying on the
      quote would let a provider swap the spec sheet behind an offer a buyer had already read.
      **Proved in a rolled-back transaction**: a document on revision A is invisible on revision B,
      and a duplicate attach is a `23505`.
    - **⚠️ AN UPLOAD IS NOT AN ATTACHMENT.** That route answers **202** — `pending_scan` until an async
      virus scan clears it — and every attach path refuses anything not `available`. The picker lists
      only scanned documents, so what it offers is what the save accepts. Verified: owner + available
      → attachable; another organization → refused; still scanning → refused.
- ~~**`/studio/quotes` status filter.**~~ **SHIPPED**, server-side. The read and the wrapper always
  passed `?status=`; nothing set it. Filtering the fetched page would have short-paged a keyset list
  and made "no submitted quotes" indistinguishable from "none on this page".
- ~~**`/studio/reviews` paging.**~~ **SHIPPED, forward-only.** The cursor is SORT-SCOPED — its sort
  key is inside the cursor, so carrying one across a sort change is a **422**, not a reset — so
  `cursor` is cleared by every filter and sort change. Forward-only is the keyset's shape: there is
  no "previous" token without stacking them, and a page-number control needs a COUNT this route does
  not return. "Start over" is the honest way back.

### Moderation gaps recorded by decision, not oversight

- ~~**`talent_profile.bio` has no moderation lever.**~~ **CLOSED.** It now honours
  `user.profileModerationState`, the flag that already hid the channel bio and links — so one
  moderator action covers every public self-description a person controls, rather than leaving them
  able to paste hidden text onto a second surface. **The gate is in `toTalentProfileView`, the one
  mapper every talent read passes through**, so a fourth read inherits it instead of having to
  remember it. Verified live on a seeded published profile: bio present → hidden → present, with
  name, headline and skills untouched in all three states.
    - ⚠️ **A FOURTH PUBLIC SELF-DESCRIPTION MUST GATE ITSELF.** Nothing structural fails if one is
      added and forgets; the `_core.ts` docblock says so in as many words.
      `community_cofounder_profile` needs no change — it defaults to `draft` behind its own
      moderation, a different mechanism reaching the same place.
- ~~**One entry point for reporting a profile.**~~ **TWO NOW.** The talent detail page mounts
  `ReportProfileOpener` beside the bio — the surface that displays the newly-moderated text is a
  surface you can report it from. Same sheet, same `reportedUserId`, same queue: a report is about a
  PERSON, not a page.

---

## Cache Components opt-outs — 18 removed, 96 routes left

`export const instant = false` plus a boilerplate `// TODO: Cache Components adoption` was applied
**wholesale** during the migration and never revisited: **114 routes** carried the TODO, 159 carry
the opt-out. All 18 in `(disclaimers)` and `(information)` are now clean.

⚠️ **`instant` DOES NOT AFFECT PRERENDERING, AND ASSUMING IT DOES WASTES A ROUND.** This was
measured, not reasoned about: the route table before and after removing all 18 is **byte-identical**
— 205 routes, 28 `○` / 172 `◐` / 5 `ƒ`, **zero symbols changed**. Those pages were already static
WITH the opt-out. Anyone planning this work by promising a static/PPR win is measuring the wrong
thing.

**What it actually controls**, from the bundled docs (`node_modules/next/dist/docs/01-app/02-guides/
instant-navigation.md`): it "opts the segment out of validation feedback… For opted-out segments,
**the navigation blocks on the server**." So the cost is NAVIGATION latency and the loss of the dev
overlay's insights — neither of which appears in the build output.

**Which means the benefit here was not measured and should not be claimed.** The build stays green,
the routes stay static, the false TODOs are gone. Whether navigation into those pages actually got
faster needs the dev overlay in a browser.

**The remaining 96** are `(home)` 59, `(studio)` 21, `(admin)` 11, `(auth)` 4 — and those genuinely
read cookies or a session, so each needs its dynamic read moved behind a Suspense boundary rather
than the opt-out simply deleted. `cart/page.tsx` is the model for the ones that must KEEP it: it
replaced the boilerplate with the real reason ("the cart is a client-query island behind a session —
its data never reaches the server render at all"), which is what a finished route looks like whether
the flag stays or goes.

---

## Documentation drift

~~1. **Sections written in future tense about shipped work.**~~ **DONE.** `STUDIO_BACKEND_STRUCTURE.md`
§13 (its recipe named `scripts/seed-admin.ts` and `src/state/studio-videos-context.tsx`, **neither
of which exists**), §9 (opened "there is no background job, no polling, no callback" — deferred
verification had made that false), and `HOME_BACKEND_STRUCTURE.md` §8.3 (proposed
`isSourceVerified` as a "new column, new flow" that had already shipped) are all corrected.

⚠️ **§5.1 WAS ON THIS LIST AND SHOULD NOT HAVE BEEN.** Checked line by line: it is an accurate
present-tense cost analysis with no future-tense claim in it. A register entry that invents work
is the same defect as one that hides it.

~~2. **The four `/users/*/reports` moderation routes are undocumented.**~~ **DONE** —
`HOME_BACKEND_STRUCTURE.md` §5.2b2, modelled on §5.2c's table, with the limiters, the idempotency
requirement on both admin writes, and the three-field scope of `profile_moderation_state`.

3. ~~**The frontend repo carries stale FORKS of four backend docs.**~~ **DELETED — and it was SIX,
   not four.** `STUDIO_BACKEND_STRUCTURE.md` was 45 lines behind and `ESCROW_LEDGER_STRUCTURE.md`
   was byte-identical, which is a fork that has not drifted yet rather than one that will not.
   `HOME_BACKEND_STRUCTURE.md` was **576 lines behind** — it predated the channel page, the channel
   directory, the creator self-reads and the video-document routes, so a reader got confident,
   detailed, wrong answers about routes that exist. `docs/BACKEND_DOCS.md` replaces all six with a
   pointer and the reasoning. `STUDIO_PRODUCTS_BACKEND_STRUCTURE.md` and `ADMIN_STRUCTURE.md` stay:
   despite the names they have no upstream and this is the only copy.

---

## Still open, in the order worth taking them

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

2. **The six `planned` Studio routes that are left.** ⚠️ **DO NOT INHERIT A COST FROM THIS LINE
   WITHOUT CHECKING IT** — it has now been wrong about four separate routes.

    ~~`/studio/copyright`~~ **GRADUATED, and it closed a defect rather than only filling a gap.**
    ⚠️ **THE STUDIO WAS TELLING CREATORS SOMETHING FALSE.** `video.moderationVisibilityState`
    reached no read a creator could see and `deriveStudioVideoStatus` had **no branch for it** — the
    field appeared nowhere in `videos.service.ts` — so a video a moderator had HIDDEN still derived
    as `published` for its own owner. Not silence about a takedown: a wrong answer, on the one screen
    the person who could appeal would look at. Fixed with a `hidden-by-moderator` status checked
    BEFORE the publish branches (the row really is still `publishStatus: "published"`, which is
    exactly how it came to lie), fed from both the detail and the list selects so the two badges
    cannot disagree. **Proved live**: hide → both badges flip → public gate 404s → restore.

    The page reads `GET /users/me/video-moderation` (new) beside `GET /users/me/video-reports`
    (already shipped — the "yours against others" half was never missing).
    - **⚠️ THREE THINGS IT WITHHOLDS, EACH DELIBERATELY.** The **reporter** — not a name, not a
      count: the queue hides reporter identity from MODERATORS on the stated ground that one who can
      see it can be lobbied, so showing it to the accused is strictly worse, and at this platform's
      size a count alone is often an identity. **Open reports** — decisions only, which is also how
      YouTube treats community flags: you hear when something is acted on, not when somebody clicks
      report. **`reasonNote`** — staff-facing free text inside a hash-chained audit entry; the
      report's `reason` ENUM is projected instead, which is what a YouTube strike notice tells you.
      **Verified**: the response carries exactly five fields and a seeded note reading
      `"reported by jane@x.com"` never left the server.
    - **`report_dismissed` is shown too.** A creator told when their video is removed should be told
      when a claim against it is thrown out; listing only punishments makes it a record of
      accusations rather than outcomes.

    **⚠️ `/studio/subtitles` IS NOT A MISSING FEATURE. IT IS IMPOSSIBLE ON THIS ARCHITECTURE.** Every
    video is `videoSource: "youtube"` — 10 of 10 live — self-hosted video is explicitly deferred by
    STUDIO §0 ("**must NOT be built now**"), and Qatoto cannot inject captions into a YouTube embed.
    It belongs with `download` and `isPremium`, and returns only if self-hosted video does.

    **`/studio/pitches` — THE DEFINITION IS NOW SETTLED, and it is not what the roadmap says.**
    This entry used to read "blocked on a DEFINITION, not on code", listing pitch videos, R&D
    applications and investor outreach as three products the word could mean. Decided 2026-08-27:
    **a pitch is a founder publishing an idea / MVP as a video to an audience of funders —
    Kickstarter and YC demo day.** "Pitches you sent and received" (`site-roadmap.ts:842`,
    `studio-sidebar.tsx:332`) described the application-inbox reading and is WRONG; it changes with
    the build. See the full plan in `docs/PITCHES_STRUCTURE.md`.

    **Four constraints came with it, all downstream of one requirement — Qatoto is bootstrapped and
    must carry no legal liability and no custody. Money happens off-platform or at a licensed third
    party.**

    | Decision              | Answer                                                                                                                                                      |
    | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | Where funding happens | **Outbound link to a licensed platform** the founder supplies (Kickstarter / Wefunder / Ketto / Razorpay page). Qatoto stores a URL and nothing else.       |
    | Contact handoff       | **Founder-supplied external link** (Calendly, their own site). No inbox to moderate, no personal data brokered.                                             |
    | Funding outcome       | **Recorded, both-party confirmed, labelled self-reported.** Qatoto asserts nothing.                                                                         |
    | Publish gate          | **Light gate + visible disclaimer** — spam / scam / illegal only, NEVER merit. Vetting on merit reads as endorsement, which is the liability being avoided. |

    **The result is a listing and discovery board — Product Hunt or a demo-day directory, not
    Wefunder.** The whole design exists to keep that true, and three things are load-bearing:

    - **A pitch carries NO amount, NO equity percentage and NO pledge button.** The ask lives on the
      third-party page behind the outbound link. `store.ts:10280-10296` already refused the same
      question for the cofounder directory ("UNTIL DECIDED, THE BACKEND STORES NO CAPITAL FIGURE")
      and §14 below keeps it open — **it cannot be answered differently in two places.**
    - **`ENABLED_FUNDING_ROUND_TYPES` stays `["crowdfunding"]`.** Nothing here ungates `equity` or
      `venture`, and no investor entity or KYC step is introduced — the design needs neither, which
      is the point.
    - **The outcome record is `compensation_payment_record`'s shape, not a payment.** One party
      records, the counterparty confirms, the page says self-reported. Append-only, no status
      column, no instrument stored — same rule as `research_contribution_ledger_entry`.

    **Two prerequisites, neither of them code.** (a) **The terms of service must be rewritten
    first** — both legal documents still call this "the Qatoto Video Sharing Site" and mention no
    store, projects, payments or equity; shipping a funding-adjacent surface under them is a larger
    exposure than anything in the diff. It is the same item already listed under **Decisions
    needed** below. (b) **Probe published `research_project` counts before shipping the public
    discovery rail** — `/anime` is the standing lesson: five pages stayed on mocks because wiring
    them would have replaced invented content with blank pages.

    **One tension this creates, deliberately left open.** R&D funding rounds still offer an
    on-platform pledge button (`POST /funding-rounds/:roundId/pledges`) while a pitch sends people
    to a third party — two funding models side by side. The pitch page must not carry a pledge
    button; whether the existing round pledge stays, is relabelled or is retired is a SEPARATE
    decision and was not taken here.

    **`/studio/support` is already correct** and should not be "built". There is no ticket API, and
    `/customer-service` is a directory for exactly that reason — "an unanswered form is worse than an
    honest signpost". A support inbox means a real ticket domain AND somebody to read it.

    **Still genuinely needing a new domain: `earn`** (a money rail — escrow left this codebase, §7)
    and **account-level delegation**, which is what `/studio/team`'s old summary promised and remains
    the one substantial Studio feature unbuilt. `learn` and `feedback` are the `/customer-service`
    shape and already signpost correctly.

---

## Cross-pillar seams

R&D, Store and Studio keep separate copies of the same venture. The four moves that shipped
(`product.researchProjectId`, `video.researchProjectId`, the venture reel and badge, the apply-from-
watch link) are in the code. What follows is the part that must not be re-derived wrong.

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
not fix it, it inverts it: the user→video cascade then fails and account deletion throws, which the
privacy surface (`anonymize-account.service.ts`, behind two default-off flags) depends on.

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

## Never verified in a browser

Every contract in this file was asserted over HTTP or in served HTML. Two surfaces in particular
have never been watched rendering: the authenticated channel-profile paths (saving a bio, filing a
report, upholding one) and **`/studio/funding`**, which is a client-query page whose data never
reaches a curl. A browser check is the one gap no amount of route testing closes.

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

---

## ⚠️ Video copyright reporting is a COMMUNITY FLAG QUEUE, not a DMCA process

`/studio/copyright`, `POST /videos/:id/reports` and the moderation queue behind them let anyone
flag a video and let staff hide it, dismiss the report, or redirect the reporter to YouTube. That
is a **moderation** system. **It is not a notice-and-takedown process and nothing in it should be
described as one** — in copy, in a policy page, or in a reply to a rights-holder.

**What a real DMCA safe-harbour process needs that this does NOT have, none of it implied by
what shipped:**

- **Claimant identity disclosed to the accused creator.** Deliberately impossible here: reporter
  identity is hidden from the moderator, let alone from the creator, and the notification that
  reaches a creator names nobody. Reversing that is a policy decision with a retaliation cost,
  not a field to add.
- **A sworn statement** — good-faith belief and accuracy under penalty of perjury. The report form
  collects a reason enum and free text, and asks the reporter to swear to nothing.
- **A counter-notice path.** A creator whose video is hidden can read the notice and cannot
  contest it. There is no appeal route in the backend at all.
- **A repeat-infringer policy.** Nothing counts strikes against a creator or a channel, and
  nothing terminates an account for accumulating them. §512(i) makes this a condition of
  safe harbour, not an optional extra.
- **A designated agent** registered with the Copyright Office, published on the site.

**Why it is nevertheless the right thing to have built now:** every video on the platform today is
`videoSource: "youtube"`, so Qatoto does not hold the bytes and hiding a row does not take
anything down. `redirected_to_source` exists to say exactly that, truthfully, instead of filing a
valid claim as a rejection.

**THE TRIGGER IS SELF-HOSTED VIDEO.** The moment Qatoto stores its own media, a takedown becomes
legally binding rather than a courtesy, `redirected_to_source` goes from the common answer to a
rare one, and every bullet above turns into required work. The data model is source-agnostic and
does not need replacing — the _process_ around it does. Do not let the existence of a working
flag queue read as "copyright is handled".
