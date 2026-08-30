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

**No substantial store build is left.** The parametric catalogue this line used to name — item 3
under _Still open_ — SHIPPED (migrations `0151`/`0152`, admin console, required-at-publish), and
its one remaining piece, the seller request queue, was **decided against and dropped** (`0153`).
Part-code search shipped after it (`0154`), the service offering page's dead CTAs after that
(item 8), and product documents after that (`0155`). **The only store item left is a single-line
checkout for "Buy now"**, which needs a payment rail that does not exist — `stripe` is a name in an
enum with no implementation and the `fake` provider is refuse-closed in production. Vidyesh is
doing Stripe and Razorpay later; ⚠️ note Razorpay means widening `CommercePaymentProviderName`,
which is `"fake" | "stripe"` today. (This
line previously named §5, cost of goods; that was **decided against** and the section below says
so.)

**SHIPPED 2026-08-27** — `/studio/pitches`, its composer, the public pitch page and the deal-flow
rail, on two new backend tables (migration `0148`). Proved end to end against the live database.
**One thing still gates it: the terms-of-service rewrite under Decisions needed** — see §12 below.

**Everything else** is either content-blocked (`/anime`), a new backend domain nobody has asked
for yet (§15, §16, and **two** of the planned Studio routes — `earn` and account-level delegation;
`/studio/copyright`, `/studio/pitches` and `/studio/team` all shipped, `/studio/subtitles` is
architecturally impossible on a youtube-embed model, and support/learn/feedback are signposts that
are already correct), or a question for Vidyesh rather than a task (**Decisions needed**).

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

`rg -l "TRANSPORT: mock" src/` returns **three** files. Two belong to the video domain and are the
subject of this section; the third, `src/components/home/anime/anime-page.tsx`, belongs to item 1
(`/anime`, content-blocked) and is tracked there:

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

- ~~**`standardName`**~~ — **exercised.** Two certifications were submitted against a live
  organization (`ISO 9001:2015` as JPEG, `ISO 14001:2015` as PDF), both landing `pending` with
  their evidence documents promoted `pending_scan` -> `available`. Both were uncoded, so
  `standardCode` — the _matchable_ half — is still the part no live payload has set.
- **The delivery-address 429** — the seeded checkout sends no `deliveryAddressId`, so the reveal
  404s before the limiter is in play.
- **The browser.** Most store contracts above were asserted over HTTP rather than watched. Two
  screens HAVE now been watched rendering: the category-attributes admin console (create, both
  toggles, and the 409/422/422 refusals) and the store search results page. Everything else in
  this file still rests on HTTP alone.

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

### 15. Multi-axis variants — STILL DEFERRED, and the FLAT surface under it is now finished

`commerce_product_variant_option{variantId, optionName, optionValue, position}`. A26 defers it
deliberately — building axes early migrates every row that reaches an immutable order-line
snapshot, for a UI nothing has asked for yet. **Unchanged.**

⚠️ **WHAT WAS ACTUALLY MISSING WAS NOT AXES.** Sizing this entry found the flat variant surface had
never been finished on the client — three gaps, all the same class as `productId` on a goods line
before §7 and `serviceOfferingId` before §8, and all now closed:

- **`PUT /products/:id/variants` had ZERO frontend callers.** The 2,932-line wizard never mentioned
  variants, so **a seller could not create one at all** and `variant-picker.tsx` could only render
  against seeded rows. There is now a Variants step between Pricing and Review.
- **The seller's own read SILENTLY DROPPED them.** The backend has returned `variants[]` on the
  owner read since Phase 8, and `src/lib/products/schemas.ts` never named the key — so
  `PublicProductSchema`'s `.strip()` discarded the array on every seller read. That is why nothing
  could hydrate. Same defect the `highlights` docblock in that file already records one field over.
- **`commerce_order_product_line.variantNameSnapshot` was written and never read.**
  `commerce-orders.service.ts` had zero occurrences of "variant", so a buyer who bought "Sea blue"
  saw a line that did not say so — while the column exists precisely so a seller cannot rename what
  someone already bought. Three lines: the projection interface, the projector, the buyer schema.

⚠️ **THE SLUG IS THE IDENTITY, NOT THE ID, AND THIS IS THE THING NOT TO FORGET.** The replace-set
upserts by `publicSlug` and RETIRES whatever the payload omits. **Measured live, not reasoned about:**
renaming a variant while keeping its slug left `store_demo_variant_lamp_brass` untouched and active;
changing the _slug_ **retired that row and created a brand-new one in its place**. So a hydrated
row's slug is rendered READ-ONLY, and only a new row's slug follows what is typed.

⚠️ **`collectVariants` REFUSES A BAD ROW RATHER THAN SKIPPING IT — the opposite of
`collectHighlights`, deliberately.** A half-filled highlight is simply not content. A dropped variant
is a RETIRED variant, so silently skipping one would turn a cleared price field into lost inventory a
seller's past orders still name.

~~**Per-variant volume pricing is not authorable.**~~ ⚠️ **THAT CLAIM WAS WRONG AND IT WAS A
DATA-LOSS BUG. NOW SHIPPED AND FIXED.** The reasoning — "omitting `pricingTiers` is safe because a
variant with no ladder inherits the listing's" — confused a READ-time fallback with a WRITE. The
backend field is `.default([])`, so an absent key parses to `[]`, and `replaceProductVariants` then
runs an unconditional `delete … where variantId = X` (`products.service.ts:901`) with the insert
guarded by `length > 0`. **Every save deleted every per-variant ladder.**

**And it uncovered a second, older one with wider reach.** `PricingTierDraft` had no lead-time field
and `collectListingInput` rebuilt every tier without it, so `products.service.ts:1627` re-inserted
the product ladder with `leadTimeDays: null` — **every listing edit destroyed A27's band lead
times**, and had done since A27 shipped. The root cause was the same class as everything else here:
the frontend seller `ProductPricingTierSchema` omitted `leadTimeDays` and `variantId`, so `.strip()`
dropped them and the form could not see what it was about to overwrite.

**Both reproduced live before fixing, on a save that changed nothing**: two product bands carrying
14 and 28 days came back `null, null`, and a variant carrying two bands came back with zero. After
the fix both survive a no-op save byte for byte. The ladder rows are now shared by one
`PricingTierRows` component so the listing's ladder and a variant's cannot drift again.
**Four smaller gaps closed alongside**, each a field the backend already returned and the client
discarded, or a label map with one consumer:

- **`moderationState` reaches the seller.** A listing a moderator had rejected still showed "Active"
  in the studio — proved live by rejecting a demo listing and reading back `status: "active"` beside
  `moderationState: "rejected"`. Same defect `video.moderationVisibilityState` had before
  `/studio/copyright`: not silence about a takedown, a wrong answer on the screen the person who
  could appeal is looking at. Added to the list-row projection too, so it shows without opening each.
- **`publicSlug` reaches the seller**, so the studio can link to the live buyer page. ⚠️ **NULL until
  published** — the link is gated on the slug rather than on `status`, because the two can disagree
  and the slug is what decides whether a URL exists.
- **`fulfillmentMetrics` stops being thrown away** on every product card and detail. ⚠️ Carry its
  rule: `onTimeShipmentRate: null` must never print 0% — "printing 0% would publish a failure they
  never earned" — and `completedOrderCount` covers the seller who has delivered but has too small a
  sample. The live demo seller is exactly that case.
- **Checkout names the variant.** The cart named it and the order named it; the last screen before
  payment did not. ⚠️ **And its React key was `productId-sellerOrganizationId`, which two variants of
  one listing collide on** — a latent bug that became reachable the moment variants were authorable.
- **Incoterms render as words**, through the label map that had exactly one consumer. The lookup is
  guarded, because the read side is `z.string().nullable()` and an unrecognised code should render as
  itself rather than blank. Backend `incotermSnapshot: string | null` tightened to `CommerceIncoterm`.

**Still deliberately not done:**

- **Retired variants are shown as a count, not as editable rows.** They cannot be deleted at all —
  `commerce_order_product_line.variant_id` is `restrict` — and re-editing one would revive a version
  the seller withdrew. Note that re-sending a retired slug DOES re-activate it, which is the right
  behaviour for a deliberate act and the wrong one for an accident.

**Three more reasons A26 is bigger than this entry implies**, found while sizing: 7 FK tables and 5
DB triggers key off `variantId`; the order line snapshots only a flat name string, so historical
orders can never be back-filled into axes; and `commerce_product_variant_position_uidx` is a strict
per-product unique position an axis matrix would have to serialize into.

### 16. Incoterm semantics — the DIVERGENCE is closed; the CONCEPT is not

⚠️ **THE HEADLINE HERE CHANGED. Do not reopen "an uncovered inland leg makes the whole journey
unpriceable" as though it were still true.** It shipped: `composeJourneys` runs a second pass over
the **covered** legs and publishes it as `partialJourneys[]`, so a good ocean rate is shown with the
inland leg named as excluded instead of the whole journey being emptied. `STORE_BACKEND_STRUCTURE.md`
§19.9 called that "the largest practical divergence in the phase".

**The doc contradicted itself and that was the opening.** §19.6 bullet 2 said an uncovered leg makes
a journey unpriceable rather than cheaper; bullet 3 said "report the components you have, name the
ones you do not". Bullet 2's real guard is against a total that LOOKS complete while a leg is
missing — not against pricing what priced beside a named absence. So the payload shape changed and
the rule did not. All three doc sections (§19.6, §19.8, §19.9) are corrected.

⚠️ **THE SEPARATE ARRAY IS THE ENTIRE SAFETY ARGUMENT AND MUST NOT BE COLLAPSED.** `journeys[]` keeps
its exact prior meaning — every leg covered, a real delivered total — so `projectFreight`, which
reads only that field, keeps the order arrival window and checkout prepare answering
`unknown / leg_uncovered` **by construction**. An arrival window is a time promise about delivery to
the buyer; a partial ends at the destination COUNTRY with a leg nobody has arranged, and its honestly
shorter transit days would read as a faster delivery rather than a shorter route. An uncovered
**primary** leg still yields nothing — a journey with no international leg is not a shipment.

**On the client**, `delivery-sheet.tsx` gained a "Priced as far as rates exist" section between the
priced path and "No end-to-end price for this route", sharing one `JourneyCard` with the end-to-end
list so the two cannot drift. ⚠️ **The word "total" does not appear in it and must not be added** —
what is missing is a leg of the route, not a rounding.

**STILL OPEN, and it is the Incoterm concept itself.** What shipped is the EFFECT with no incoterm
input, because there is none to read: `commerce_incoterm` sits on exactly two nullable columns —
`commerce_quote_revision.incoterm` (`store.ts:5887`) and `commerce_order.incoterm_snapshot`
(`store.ts:6173`) — both of which exist only AFTER a buyer already has a priced offer. A product
carries no term.

- **A seller-declared incoterm on a listing — a migration.** It is the value that would say which
  legs are the BUYER's to arrange, distinguishing an FOB listing (buyer arranges ocean AND inland)
  from a DDP one (seller arranges everything, and Qatoto should price nothing).
- **`commerce_rfq.desired_incoterm` — a second migration.** `rfqs.schemas.ts` carries no incoterm at
  all, so a buyer cannot state the term they want quoted under. The quote revision states the
  SELLER's offered term; nothing states the buyer's asked-for one.
- **Three vocabulary gaps, all small.** `quote-detail.tsx:169` and `order-detail.tsx:118` print the
  bare wire code ("FOB") rather than routing through `QUOTE_INCOTERM_LABELS`
  (`quotes.schemas.ts:574-586`) — which today has exactly ONE consumer, the composer picker at
  `quote-composer.tsx:1206`. And `commerce-orders.service.ts:135` / `commerce-checkout.service.ts:239`
  still declare `incotermSnapshot: string | null` where `commerce-quotes.service.ts` uses
  `CommerceIncoterm`.

Note the casing: `commerce_incoterm` is UPPERCASE, unlike every other enum on the wire.

⚠️ **NONE OF THIS IS VISIBLE IN PRODUCTION UNTIL §18 IS BOUGHT.** Every rate table is empty (A36), so
the international leg answers `no_active_rate_card` too and there is nothing to compose a partial
from. That is still the right order — _Decisions needed_ said settle the uncovered-inland-leg rule
BEFORE spending on cards, which is what this did.

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

## Cache Components opt-outs — 101 routes left

`export const instant = false` plus a boilerplate `// TODO: Cache Components adoption` was applied
**wholesale** during the migration and never revisited. All 18 in `(disclaimers)` and
`(information)` are now clean.

⚠️ **THE NUMBERS IN THIS SECTION WERE WRONG AND ARE NOW MEASURED.** It read "18 removed, 96 routes
left" over a breakdown that summed to **95**, against "114 carried the TODO, 159 carry the opt-out".
Counted 2026-08-29: **147 files carry the opt-out and 101 still carry the boilerplate TODO** —
`(home)` 61, `(studio)` 24, `(admin)` 11, `(auth)` 4, plus `src/app/layout.tsx`. The two totals
differ because **46 files already had the boilerplate replaced with a real reason** in the
`cart/page.tsx` style, which is the finished state rather than an outstanding one.

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

**The remaining 101** are `(home)` 61, `(studio)` 24, `(admin)` 11, `(auth)` 4 and the root layout — and those genuinely
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

    ⚠️ **THE COST ABOVE IS STALE: THE PUBLIC BACKEND MODULE SHIPPED.**
    `qatoto-backend/src/modules/home/anime/` is mounted at `app.ts:303` with three bare public reads
    (`/anime/hero-slides`, `/anime/series`, `/anime/series/:seriesSlug`), the frontend wrappers exist
    in `src/lib/anime/`, there is a real series-detail page, and `sitemap.ts` announces it. **What is
    left is five page rewires, not "one new public backend module plus five".** The studio's own
    `/series` routes are 13, not eleven, and all still `requireAuth` — that half holds.

    **⚠️ THE BLOCKER IS CONTENT, NOT CODE — and that reorders this whole list.** Re-probed against
    the live database on 2026-08-29, unchanged: `anime_series` **0 rows**, `anime_season` **0**,
    `anime_episode` **0**, and `video WHERE video_type = 'anime_episode'` **0** — while
    `anime_hero_slide` has **4**, which is exactly why the hero is real and the rails are not. Wiring the five pages today would
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

    ~~`/studio/pitches`~~ **SHIPPED, and it closed the longest-standing definition question on
    this surface.** This entry used to say the route was "blocked on a DEFINITION, not on code",
    listing pitch videos, R&D applications and investor outreach as three products the word could
    mean. Decided and built 2026-08-27: **a pitch is a founder publishing a venture to people who
    might fund it — Kickstarter and YC demo day.** The roadmap summary "Pitches you sent and
    received" described the application-inbox reading and is gone with it.

    The full contract, the four constraints behind it and the US-market benchmark are in
    [docs/PITCHES_STRUCTURE.md](docs/PITCHES_STRUCTURE.md); **§10 of that file is the important
    half** — it records the three things the live run changed after the plan was written.

    **The shape, in one line: Qatoto lists a pitch and links out.** No amount, no equity
    percentage, no pledge control, no investor entity, no KYC. `external_funding_url` points at
    whatever licensed platform the founder chose, `external_contact_url` at a page they own, and
    a funding outcome is a two-signature self-reported attestation that mints nothing. Escrow is
    still gone, `ENABLED_FUNDING_ROUND_TYPES` is still `["crowdfunding"]`, and nothing here
    reopened either.

    ⚠️ **THE ONE THING THAT MUST NOT BE TRIMMED IN A LATER REVIEW.** `PitchDisclaimer` renders on
    the public page AND in the founder's own console, and the moderation gate is light on purpose
    — spam, scams and illegal content, never merit. Vetting on quality would make listing a pitch
    read as endorsing it, which is precisely the liability this design exists to avoid. That
    sentence is the liability position, not decoration.

    **The video shipped in a second pass, and the first pass had a disclosure bug.** `pitchVideoId`
    was in the schema and in no component — no picker, no render — and the write accepted any video
    id the client sent, since the FK proves only that a row exists. A founder could have attached a
    stranger's private video. `isVideoEmbeddableByPitch` now requires the video to pass
    `PUBLICLY_SERVABLE` **and** to belong to the same venture; the public read joins it through the
    same gate in the JOIN's ON clause, so a taken-down video nulls the player instead of 404ing a
    live pitch. See §11 of the structure doc.

    **Still open, and it is a writing task rather than a build one:** the terms of service still
    describe "the Qatoto Video Sharing Site" and mention no store, projects, payments or equity —
    see **Decisions needed** below. It was true before this shipped and is more pressing now that
    a funding-adjacent surface is live.

    **`/studio/support` is already correct** and should not be "built". There is no ticket API, and
    `/customer-service` is a directory for exactly that reason — "an unanswered form is worse than an
    honest signpost". A support inbox means a real ticket domain AND somebody to read it.

    ~~`/studio/team`~~ **SHIPPED as the product-team console, and the route changed meaning.**
    2026-08-27. It served YouTube-style video-collaborator credits while sitting in the sidebar's
    **Product journey** section between Pitches and Funding — a section whose own comment says it
    maps "pitch → team → fund". The navigation promised the pipeline stage and delivered video
    credits. The credits moved to **`/studio/collaborations`** under Channel, unchanged.

    **What it does now, and the gap it closed.** The whole team-building domain was PER PROJECT:
    `GET /research-projects/:slug/applications` is maintainer-gated on one venture, so a founder
    running three opened three project pages to answer "who wants to join". Two new
    cross-venture reads on `applicationInboxRouter` — **`GET /applications/received`** and
    **`GET /open-roles/mine`**, both scoped by a membership join at `maintainer` or above — are the
    founder-side mirror of `/applications/mine`. Same gap, same answer, as `GET /funding-rounds/mine`
    for rounds. The WRITES stayed in R&D: accept and decline call the project-scoped route, because
    that transaction locks the role row to serialize two maintainers taking the last seat.

    **A role can finally state its terms.** The "Advertise a role" form collected title, commitment
    and description only — so nobody could advertise "2–4% equity + $40k/mo" even though
    `open_role_compensation`, its three CHECK constraints and the API had supported exactly that
    since the table shipped. Blends are two strands on one role (the unique index is
    `(open_role_id, kind)`), and **no strands is a real answer** — the unpaid hobbyist role.

    ⚠️ **AND ONE BUG THIS UNCOVERED, WHICH HAD NEVER WORKED.** `decideProjectApplication` sent
    `{ reviewNote }`; the backend's `DecisionNoteSchema` is `.strict()` and expects `{ note }`. So
    every accept or decline that CARRIED A NOTE answered `422 Unrecognized key`, while one without
    a note succeeded — meaning the review-note box on every project's Team tab had failed since it
    shipped, and failed only when used. Fixed at the wrapper.

    **Still genuinely needing a new domain: `earn`** (a money rail — escrow left this codebase, §7)
    and **account-level delegation** — roles, access, revocation on an ACCOUNT, which is what
    `/studio/team`'s first summary promised and what no primitive anywhere supports. It is now the
    one substantial Studio feature unbuilt, and it is unrelated to the team console above: that one
    is about who builds a venture, this would be about who may act as you. `learn` and `feedback`
    are the `/customer-service` shape and already signpost correctly.

3. **Category attribute templates — the vocabulary SHIPPED; the seller request queue did not.**
   Design in [docs/CATEGORY_ATTRIBUTES_STRUCTURE.md](docs/CATEGORY_ATTRIBUTES_STRUCTURE.md) and
   `STORE_BACKEND_STRUCTURE.md` §20 / Phase 24.

    **Shipped, migrations `0151` + `0152`, both applied to the live database and verified against
    `information_schema` and `pg_enum` rather than drizzle's exit code:**
    `commerce_category_attribute`, `_choice`, `commerce_product_attribute_value`, admin CRUD on
    the existing categories router, the public resolved read, the seller replace-set at
    `PUT /products/:id/attributes`, the `attribute` / `attributeRange` filters, `attributeFacets`,
    the typed wizard controls, the merged PDP spec sheet, and the compare table now aligning on
    `attributeKey`.

    **Proved live over HTTP**, with probe data seeded and reverted: an attribute defined on a
    PARENT resolved on a child leaf; the filter narrowed 5 results to 2; OR-within-a-key returned
    2; a choice nobody answers returned 0; and — the one that matters — with the results filtered
    to `pine` and showing nothing, the facet still reported `oak · 2`, i.e. what clicking would
    return rather than what is on screen. In the browser: `46.5` reached the wire as `465` and
    came back as "45 mm" on the buyer's Dimensions tab.

    ~~⚠️ **STILL OPEN: `commerce_category_attribute_request` IS AN UNUSED TABLE.**~~ **DROPPED,
    migration `0153`.** The queue was never built and the cut line held: attributes are
    platform-defined on Alibaba too, and a seller whose field has no definition still has the
    free-text specification row. ⚠️ **Two labels in `platform_audit_event_kind` survive the drop**
    — Postgres has no `ALTER TYPE ... DROP VALUE`, and that enum is referenced by every audit row
    ever written. They are unused labels, not a feature that went missing; `0153`'s header says so.

    ~~⚠️ **TWO MORE GAPS.**~~ **BOTH CLOSED.**

    - **Admin UI for attributes — shipped.** `store-category-admin-page.tsx` gained a fourth
      toggle trio ("Fields") and a `CategoryAttributesPanel`, following the file's existing idiom
      rather than inventing one. An inherited attribute is **read-only from the child** (editing
      there would rewrite a parent's vocabulary for every sibling leaf), `isFilterable` is not
      offered on a `text` attribute, and there is no delete control — the backend refuses both,
      and a control that only ever errors is worse than no control. **Verified through the console
      with a real `moderate_commerce` capability**: created, both toggles flipped, and three
      refusals confirmed — duplicate key **409**, filterable-text **422**, kebab-case key **422**.
    - **`isRequiredForPublish` — now enforced.** `ListingRequirementKey` gained
      `"categoryAttributes"`, which is a compile-time trip-wire that forced the frontend label map
      to grow with it. ⚠️ **The projection stayed synchronous on purpose**: making it async would
      have cascaded into `createProduct`'s serializable transaction, so the _caller_ computes
      `missingRequiredAttributeKeys` via `listMissingRequiredAttributeKeys` and passes it in.
      **Verified live**: publish refused naming `qa_probe_wood` alongside the shipping facts, the
      key dropped off the refusal once answered, and the listing then published.

    **One real bug this caught, worth keeping.** `min()`/`max()` over a `bigint` come back from
    node-postgres as STRINGS, so the number facet shipped `minScaled: "450"` and the frontend's
    `z.number()` rejected the whole search response — the page rendered "Client-side contract
    validation failed". Fixed with `.mapWith(Number)`, which the price facet already did for the
    same reason. The defensive parse boundary is what surfaced it.

4. ~~**`modelNumber` reaches nobody.**~~ **MOSTLY SHIPPED. One piece is left and it needs a
   migration.**

    **Done:** `modelNumber`, `countryOfOriginCode` and `unitOfMeasure` are on the seller contract
    and on the identity step — all three were accepted by the backend write schema and absent from
    `src/lib/products/schemas.ts`, and the last two were _already parsed by the buyer's
    `StoreProductDetailSchema`_, so `product-details-sheet.tsx` had been dropping three of its five
    "Item details" rows for every listing on the site. The country control is a select over the
    app's own `COUNTRY_OPTIONS` normalised through `toOptionalCountryCode`; the unit is free text
    with a datalist, because `unitOfMeasure` is free text on the wire and a `<select>` would refuse
    units the backend accepts.

    **Also done, backend:** `model_number` is folded into `searchText` in
    `refreshProductSearchDocument`. No migration — `search_document` is `GENERATED ALWAYS` over
    `search_text`, so it lands at weight class `C` on its own, and `updateProduct` already enqueues
    a refresh unconditionally.

    ~~⚠️ **STILL OPEN: the exact-match rank boost, and it is a migration.**~~ **SHIPPED,
    migration `0154`** — and it WAS a migration, which is the half `STORE_BACKEND_STRUCTURE.md`
    §21.1 got wrong when it said "three edits, no migration" while telling you to put the column
    _into_ `store_search_document`. That doc is corrected.

    **What shipped:** `model_number` on `store_search_document` plus a generated
    `model_number_normalized` (lowercased, non-alphanumerics stripped), one `CASE WHEN` inside the
    single `rankExpression` const — which feeds ORDER BY, both cursor predicates and the projected
    score, so one edit keeps all four in sync — and the code now renders on the result row.

    ⚠️ **THE BOOST ALONE WOULD HAVE BEEN A NO-OP, and this is the part worth remembering.** A row
    that membership excludes cannot be reordered into view. Measured live:

    ```
    to_tsvector('english','LM-358')         -> '-358':2 'lm':1
    websearch_to_tsquery('english','LM358') -> 'lm358'      (numnode = 1)
    ... @@ ...                              -> FALSE
    ```

    A stored `LM-358` produces `lm` and `-358` and **never** `lm358`, and the `ILIKE` fallback
    fires only when the QUERY fails to parse — `LM358` parses fine. So the normalized equality is
    OR'd into the shared text predicate, widening what matches for **all three sorts and every
    facet count**. That is A39's rule working as intended, not a violation of it: a sort must not
    change what matches.

    **Proved live, with the assertion that separates a boost from a coincidence.** A _Calibration
    Kit_ was given `model_number = 'banquet'`; searching `banquet` put it **first at 1000000.2**,
    ahead of _"Banquet chair, stackable"_ whose TITLE matches at weight `A` — and the chair was
    **still returned** at `0.545`, which is the half that would have made this a regression if it
    had been dropped. `LM358` / `LM-358` / `lm 358` / `lm358` all resolved to the same listing;
    `LM359` returned nothing. Four tied rows paged 2-at-a-time with no duplicate and no skip, and
    the `documentKinds` facet reported `product: 4` against 4 results — the facet/result parity
    that widening a shared predicate most endangered. All probe values reverted to NULL after.

    ⚠️ **The normalization rule now lives in two places** — the Postgres generated column and
    `normalizeModelNumberQuery` — because a generated column cannot call application code. They
    must stay byte-for-byte equivalent, and **the order is load-bearing**: both strip
    `[^a-zA-Z0-9]` _before_ lowercasing, since characters like U+212A KELVIN SIGN only become
    `[a-z0-9]` after case folding. Drift raises nothing; it silently stops exact matches matching.

    ⚠️ **The boost constant has a ceiling.** `encodeRelevanceSortKey` is
    `rank.toFixed(12).padStart(24,"0")` and `padStart` only pads — above 11 integer digits the
    fixed-width encoding stops sorting lexicographically and keyset pagination breaks silently.
    `1_000_000` sits five orders under that and six above `ts_rank_cd`'s `[0,1)` range.

    ⚠️ **No UNIQUE constraint on `model_number`, ever.** Two sellers listing the same manufacturer
    part is the premise of a parametric marketplace, not a data error. `sku` is the unique one,
    per seller organization.

5. ~~**Nothing on a listing can say "discontinued".**~~ **SHIPPED** — migration `0150`,
   `product_selling_state` = `selling | paused | discontinued`, applied to the live database and
   verified independently of drizzle's exit code.

    **The two rules that make it work, and either one would silently undo it.** `sellingState` is
    absent from `store_search_document.isEligible` and from `publicProductEligibility`. The first
    is element [0] of the shared search WHERE with no per-facet escape, so folding selling state
    into it would delete a discontinued listing from the results _and_ from the count on the very
    chip a buyer would click to find it. The second is the sole 404 decision for a product page —
    leaving it alone is what keeps a discontinued page at **200** with its `replaces` rail intact.
    Both now carry comments saying so.

    ⚠️ **THE DEFAULT FILTER IS THE ONE THAT ACTS WHEN UNSET.** Omitting `sellingState` excludes
    `discontinued`; naming a value narrows to it. The predicate is
    `selling_state IS NULL OR selling_state <> 'discontinued'` — **the NULL arm is load-bearing**,
    because offerings and organizations share that table and `NULL <> 'discontinued'` is NULL, not
    true. Without it every supplier and service vanishes from an unfiltered search.

    **Verified live:** a discontinued product left the default results (17 → 16), came back under
    `?sellingState=discontinued`, still counted 1 in the facet, and its page and companions rail
    both answered 200. Test data reverted; all 17 products are `selling`.

    **A backfill was needed and is done.** The new document column starts NULL, so the facet was
    empty until existing rows were populated from `product.selling_state` (17 rows, dry-run first,
    `updated_at` deliberately untouched because no product actually changed and that field feeds
    the sitemap's `lastModified`).

    **Cart and checkout refuse both non-selling states** with a new `PRODUCT_NOT_SELLING` (409),
    distinct from `PRODUCT_NOT_PURCHASABLE` so a page the buyer can see says why — and placed
    _after_ the visibility gate so it cannot become an id oracle for hidden listings. An existing
    cart line keeps `getCart`'s non-fatal `pricingError` rather than vanishing.
    ~~⚠️ **The cart refusal is NOT verified live**~~ — **verified.** Signed in, the same listing
    accepted an add at **200** while `selling` and refused it at **409** once `discontinued`
    ("This listing has been discontinued and can no longer be ordered"), while the owner read
    still answered **200**.

6. **Product PDFs — REFRAMED after asking what Alibaba does, and mostly answered by wiring what
   already existed.**

    Alibaba's listing pages carry spec content as stacked image-and-text blocks; documents are
    exchanged in the RFQ thread and certificates live at organization level. Qatoto had all three,
    and the third — `commerce_product_highlight` — was **built and unreachable**: table, both
    routes, the Cloudinary pipeline and the buyer renderer all shipped, and `src/lib/products/*`
    referenced none of it. **That is now wired** (up to 12 ordered blocks of heading + body +
    image, a wizard step, two-phase save). No migration.

    It also sidesteps the scan question entirely: `src/lib/image.ts` decodes and **re-encodes**
    every upload, "strips EXIF/metadata and any non-image payload smuggled in the container", so
    what lands in storage is sharp's output rather than the uploader's bytes.

    ~~**What is still open is the PDF specifically**~~ — **SHIPPED, migration `0155`.**
    `commerce_product_document`: content-addressed, **no `url` column**, PDF-only, capped at five,
    with a seller step in the wizard and a Documents block on the PDP.

    ⚠️ **UNSCANNED, 201 NOT 202, AND NO `state` COLUMN — a decision, not an omission.**
    `video_document`, the precedent §21.3 is told to copy, is not scanned at all, and the only
    working scanner is an EICAR-only fake whose `clamav` sibling returns `SCANNER_UNAVAILABLE`.
    ⚠️ Unlike the payment and escrow factories, **that fake is permitted in production on purpose**
    — so a `pending_scan` gate would have stamped every upload `clean` and promoted it while
    implying a review nobody performed. No copy on this surface says the file is checked. A gate
    that passes everything is worse than an honest absence.

    ⚠️ **`certificate` WAS DROPPED FROM THE KIND ENUM, AND THE SPEC CONTRADICTED ITSELF.** §21.3
    lists it two paragraphs after saying `commerce_encrypted_document` "is the right home for a
    business registration certificate and the wrong home for a datasheet".
    `commerce_organization_certification` already carries reviewed claims — three-way state, a
    reviewer who may not be the submitter, validity dates, evidence that never rides the wire. A
    seller-uploaded "certificate" would look identical to a buyer with none of that behind it.
    Postgres cannot DROP an enum value; adding one is a one-line migration. Four kinds is
    reversible, five is not. Doc corrected.

    ⚠️ **AND ITS "`deleteVideo` is the precedent to copy" WAS ALSO WRONG** — the same class of
    error as §21.1's "no migration". `deleteVideo`'s cleanup is BEST-EFFORT; the two sweeps already
    inside `deleteProduct` REFUSE and abort before the transaction. Three near-identical cleanups in
    one function must behave alike, so the document sweep matches its siblings. **My own plan
    repeated the doc's error and was corrected against the code.**

    **Proved live, end to end.** A 695-byte PDF uploaded through the seller path answered **201**;
    the public read carried `downloadPath` and **no `url` key**; the route answered **302** with
    `Cache-Control: no-store` to a presigned Backblaze URL, and following it returned the same 695
    bytes, `%PDF-` header and original text intact. ⚠️ **The gate was tested by making it fail**:
    unpublishing the listing turned that same link into a **404**, and republishing restored it —
    which is the entire reason there is no `url` column. **A discontinued listing still serves its
    documents**, the deliberate exception, because the buyer who most needs a manual is the one who
    already owns the thing. Re-uploading identical bytes **converged at 201 with the count still 1**
    rather than 409; a GIF renamed `.pdf` and declared `application/pdf` was refused **422** by the
    magic-byte check the mimetype gate would have let through; the cap refused the sixth with
    `TOO_MANY_DOCUMENTS limit 5`. Deleting the listing left **0 objects in the bucket and 0 rows**,
    checked against object storage itself rather than a delivery URL — the misread that cost time
    last round. Probe listing deleted, organisation reverted.

    ⚠️ **The upload limiter (10/15min) fired mid-verification**, which is the limiter working; the
    cap was then proved at the service level instead. Worth knowing before anyone tests by hand.

    **Certificates got the opposite answer, deliberately — and the difference is the point.**
    A highlight image is _looked at_; a certificate is _read_, and it is the artefact a moderator
    uses to decide whether a compliance claim is true. So:

    - ⚠️ **PDF is stored byte-for-byte, no transform.** It is what SGS, TÜV and Bureau Veritas
      actually issue; refusing it makes a supplier photograph an official document and makes
      multi-page scope annexes unrepresentable. **Verified: 419 bytes in, 419 bytes stored,
      `application/pdf` intact.** The premise for dropping PDF did not survive checking — the
      certificate path already scans (`scheduleDocumentScan` after commit, Phase 14b), unlike
      `video_document`.
    - **JPEG/PNG are re-encoded to AVIF**, which strips EXIF and anything smuggled in the
      container. **Verified: a 210,563-byte JPEG stored as 88,401 bytes of `image/avif`.**
    - ⚠️ **A DOCUMENT PROFILE, NOT THE PHOTO PROFILE.** `validateAndNormalizeImage` hardcoded
      `avif({ quality: 55 })`, tuned for photographs; certificates pass `outputQuality: 88` at a
      2400 px cap through a new **optional** `outputQuality` that defaults to the old value, so
      the other seven call sites are untouched. ⚠️ **Honest note on the justification**: a
      side-by-side re-encode of a clean synthetic certificate showed q55/1600 still legible, so
      "q55 destroys the evidence" was overstated. The document profile is still the right default
      — a phone photo of a real certificate under uneven light, already carrying JPEG noise, is a
      far harder input than clean vector text, and that is the case the cap protects — but the
      claim was stronger than the evidence for it.

    ⚠️ **THE REAL GAP, RECORDED RATHER THAN PAPERED OVER: THE SCANNER IS AN EICAR-ONLY FAKE.**
    `clamav` is a configurable value with no implementation and returns `SCANNER_UNAVAILABLE`, so
    every scan above this line is ceremony until a real one is wired. Image-only uploads would not
    have fixed it either: that degrades every certificate while leaving a malicious PDF merely
    _unuploadable_ and a malicious image _neutralised by luck of the re-encode_. Wire a real
    scanner; that is the fix.

    ⚠️ **AND ITS SCAN DECISION IS STILL UNMADE.** Only the scanner _adapter_ is reusable;
    `scanEncryptedDocument`, `sweepPendingDocumentScans` and the job all name
    `commerce_encrypted_document`, its `state` enum and its envelope columns, and the payload has
    no table discriminator. `video_document`, the precedent, is **not scanned at all**, and the
    only working scanner is an EICAR-only fake. Either add a second scan service, job and `state`
    column — or ship unscanned and answer **201**, with no copy claiming the file is checked.

    ⚠️ **The cascade cleans rows, not bytes.** `deleteProduct` must delete the objects explicitly,
    the way `deleteVideo` does. SQL cannot reach object storage.

7. ~~**The product page cannot start an RFQ.**~~ **SHIPPED, and it removed a dead control rather
   than adding a fourth one.**

    The inert "Send inquiry" button was also a **duplicate**: `store-and-chat-actions.tsx` already
    renders a working contact control — an exhaustive switch over `contactAffordance` giving Chat
    now / Ask a question / Sign in, with `ManufacturerChatSheet` behind it. A second, dead entrance
    to a live feature is worse than no entrance. It is now **"Request a quote"**, linking to
    `/store/rfqs/new?productSlug=…`.

    That route is a server component: it fetches the listing and hands `RfqComposer` a typed seed
    for goods line 0 — title, specification snapshot, quantity and unit. **Three absences are
    preserved rather than papered over:** a listing with no specifications falls back to its
    description and then to blank; a null `minimumOrderQuantity` seeds no quantity, because
    unstated is not one; a null `unitOfMeasure` seeds no unit, because this page does not get to
    decide what a seller sells in. A bad or stale `?productSlug` renders an empty composer rather
    than a 404 — the slug is a convenience, not the route's identity.

    **`productId` now travels on a product line.** `RfqProductLineInput` always supported it and
    the composer never sent it; a seeded line carries it so a provider can see which listing
    prompted the request instead of re-matching on title text. A hand-typed line **omits** the key
    rather than nulling it — `CreateDraftRfqSchema` is `.strict()`.

    ⚠️ **"Buy now" stays inert and its comment explains why.** Checkout prepares the ENTIRE cart
    across every seller, so a button labelled as buying one chair would misstate what the buyer
    committed to. It waits on a single-line checkout, not on a handler.

    ⚠️ **AND IT WAITS ON MORE THAN THAT — THERE IS NO PAYMENT RAIL AT ALL.** `stripe` is a name in
    an enum with no implementation, and `resolveCommercePaymentProvider` refuses everything except
    `fake`, which is itself **refuse-closed in production**. "Buy now" cannot mean "pay now" when
    there is nothing to pay into. Separately, `prepareCheckout` locks and reserves EVERY cart line
    and consumes reservations keyed to the whole `checkoutPrepareId`; there is no line-scoped path
    and no `selected` flag on a cart line. Two blockers, not one.

8. ~~**The service offering page cannot start an RFQ either, and its blocker had expired.**~~
   **SHIPPED — the twin of item 7, frontend only, no migration.**

    `/store/services/[offeringSlug]` had **two buttons with no `onClick`** and — unlike the product
    page — **no chat, no inquiry, no contact path of any kind**. It was the last dead-end surface
    in the store.

    ⚠️ **THE REASON IT GAVE FOR BEING INERT HAD SHIPPED.** The file said an RFQ "needs a buyer
    organization, which is the auto-provisioning decision Batch D lands" — Batch D landed in Phase
    21 / A37, which is why the product page's quote link and the storefront rail's had both worked
    for some time. Only the comment was still there. **Read a stale blocker as a claim to check,
    not a fact.**

    ⚠️ **AND UNDERNEATH IT, THE SAME DEFECT THIS WHOLE ARC HAS BEEN CLOSING.**
    `RfqServiceLineInput.serviceOfferingId` was fully wired server-side — column (`store.ts:5498`),
    validated against real offerings (`commerce-rfqs.service.ts:418-439`), stored and read back —
    and **no client had ever sent it.** That is `productId` on a goods line before item 7 wired it,
    exactly.

    **Proved live, both halves in one round-trip.** A draft raised from
    `/store/services/store-demo-sea-freight` came back with service line 0 carrying
    `serviceOfferingId: "store_demo_offering_sea"` and a second, HAND-TYPED line carrying `null` —
    which is the half that matters, because `CreateDraftRfqSchema` is `.strict()` and a hand-typed
    line must OMIT the key rather than null it. A bad `?offeringSlug=` renders an empty composer
    rather than a 404, and `?productSlug=` still opens on Basics exactly as before. Probe RFQ
    deleted, organisation reverted.

    ⚠️ **THE TYPED REQUIREMENT IS SEEDED EMPTY, DELIBERATELY.** An offering's `detail` says what
    the PROVIDER offers; a requirement says what the BUYER needs. Copying one into the other would
    write the buyer's requirement for them — the same refusal item 7 made when it declined to seed
    a quantity from a `minimumOrderQuantity` the seller never stated. Only `providerKind`,
    `requirementSummary` and the offering id are seeded; the buyer fills the lanes and modes.

    **"Add to an order" was REMOVED, not left inert.** It is not merely unfinished: there is **no
    route that creates a service engagement at all** — `/commerce/service-engagements` exposes only
    `GET`, `/events`, `/commands` and `/transitions` — and it would need an existing order to
    attach to, which a buyer arriving from a public offering page may not have.
    `commerce_order_service_link` still exists and attaching a service to an order stays reachable
    from the order surface. One live CTA beats one live and one dead, which is the call item 7 made
    when it deleted the inert "Send inquiry".

---

## ⚠️ The frontend is far behind the backend — ~90 routes have no caller

Six instances of one defect class were closed one at a time (`productId` on an RFQ goods line,
`serviceOfferingId`, `pitchVideoId`, `commerce_product_highlight`, `commerce_product_variant`,
`variantNameSnapshot`). A systematic sweep on 2026-08-29 found the class is not a punch-list — it is
the shape of the whole gap. **Do not treat these as oversights to fix opportunistically; each is a
feature-sized build, and several are user-visible today.** Ranked:

1. ~~**Product Q&A is read-only.**~~ **SHIPPED — all six writes, frontend only, no migration.** Ask,
   answer, the helpful pair and the two author retractions. `contactAffordance: "ask_question"` now
   gates a control that exists, and `viewer.hasVotedHelpful` renders.

    ⚠️ **THE CREATE IS KEYED ON `productId`, NOT THE SLUG** every other read on that page uses, so
    `product.id` is threaded into the island beside `publicSlug`. Posting the slug is a 404 that looks
    exactly like a missing product.

    ⚠️ **AND THE WRITES MOUNT UNDER `/commerce`, THE READS UNDER `/store`.** One surface, two mounts —
    the reads are public (`attachOptionalUser`) on the storefront router, the writes authenticated on
    the trust router. Do not "tidy" a write onto the `/store` prefix.

    **Two of the six require an `Idempotency-Key` HEADER and answer 400 without one** — a missing key
    is a refusal, not a default. Minted by the component through
    `useResettableAttemptIdempotencyKey`, rotated only on confirmed success: the ask box is not
    one-shot, and reusing the first key on a second question dedupes it into silence. The four others
    take no key, idempotent by verb.

    **Proved live end to end, 16 checks, probe data written and withdrawn:**

    - No key → **400**. Key + body → **201**. Same key + same body → **201 replayed** with
      `Idempotency-Replayed: true` and the SAME id, with the list still showing **one** question.
      Same key + different body → **409**.
    - A buyer with no completion answering → **403** _"Only the seller or a verified buyer of this
      product may answer."_ The seller answering → **201** with `authorKind: "seller"` (derived — the
      body carries no `authorKind` and `.strict()` makes sending one a 422).
    - ⚠️ **The second answer from the SAME ORGANIZATION → 409 _"Your organization has already
      answered this question."_** Per organization, not per user — so a colleague having answered
      refuses you. Surface the backend's sentence; "you already answered" is false for that person.
    - Helpful: author endorsing their own answer → **403**; the buyer org → 200 with
      `helpfulCount: 1` and `viewer.hasVotedHelpful: true` read back; withdraw → back to 0.
    - Retraction: a NON-author → **404, not 403**, so the route never confirms a row they may not
      touch exists. The author → 200.

    ⚠️ **A PREREQUISITE THAT COST A ROUND AND IS NOT IN ANY DOC I READ:** every commerce route
    resolves its actor from `session.active_organization_id` and **there is no auto-select**. Signing
    in is not enough — the seller answered with a flat 403 until
    `POST /commerce/organizations/:id/activate` was called. The Better Auth organization plugin
    endpoints (`/api/auth/organization/list`, `/set-active`) are **404**; that activate route is the
    only way. `scripts/smoke-store-phase-15.ts:185-189` says so and is the only place that does.

    ⚠️ **DELETE CONTROLS RENDER ONLY ON ROWS THE SESSION POSTED, AND THAT IS A BACKEND GAP.**
    Retraction is author-only matched on the USER, but the question projection carries **no `viewer`
    object at all** and an answer's `author` is the ORGANIZATION — so neither payload says whether the
    reader wrote the row. The ids returned by the two 201s are the only authorship the client can
    prove. **The fix is `viewer.canDelete` on both projections**; until then a control on every row
    would 404 for almost everyone, which is what the category-attributes console already refused to
    ship.

    **Withdrawal is not deletion, deliberately** — the row moves to `removed_by_author` because an
    answer thread is other people's writing and a real delete would cascade it away. So the probe rows
    still exist as withdrawn rows; they are excluded from the public list, the seller inbox and every
    counter. That is the revert this surface has.

    ~~**Still unwired: `GET /commerce/seller/questions`.**~~ **SHIPPED — `/studio/questions`.** The
    last unwired route on the Q&A surface. Its own route comment named the gap: a seller with two
    hundred listings could answer any question they were SHOWN and had no way to find one.

    ⚠️ **"AWAITING YOUR ANSWER", NOT "UNANSWERED", AND THE DIFFERENCE IS NOT PEDANTRY.** The backend
    filter is `hasSellerAnswer = false` — a maintained column — **not** `answerCount = 0`. A question
    a verified BUYER already answered still matches, so an "Unanswered" chip would be a false
    statement about a question that has an answer.

    ⚠️ **AN EMPTY INBOX AND "YOU ARE NOT A SELLER" ARE THE SAME RESPONSE. I expected a 403 and was
    wrong.** The demo BUYER organization answers **200 with zero items** —
    `requireActiveSellerCommerceOrganization` admits any caller holding a seller/owner membership, and
    the protection is the `product.sellerOrganizationId` scoping rather than the guard. A real 403
    needs no active organization at all. So the empty state says "no questions" and never "you are not
    a seller": a seller who has cleared their queue gets a byte-identical payload.

    ⚠️ **OLDEST FIRST, SO THE BUTTON SAYS "SHOW NEWER".** `asc(createdAt), asc(id)` is deliberate —
    newest-first is how the oldest unanswered question stays unanswered forever. `seller-reviews-page`
    says "Show older" and is right for ITS newest-first default; copying that label points backwards.

    ⚠️ **THE INVALIDATION WAS THE REAL WORK, AND IT WOULD HAVE FAILED SILENTLY.**
    `useAnswerProductQuestion` invalidated only `productQuestions(slug)` — a key the inbox does not
    use, because the inbox is keyed on the SELLER. Answering from the studio would have posted
    successfully and left the row on screen still reading as unanswered, never leaving the queue it
    had just been cleared from. Fixed with a `sellerQuestionInboxRoot()` prefix that ALWAYS fires,
    the same root/leaf shape `sellerReviewInboxRoot` already uses. ⚠️ And `productSlug` is now
    **nullable** on that hook: an inbox row's listing may be unpublished, and the product-scoped keys
    are skipped rather than writing `["store","products",null,"questions"]`, a key nothing reads.

    **Proved live, probe rows written and withdrawn:** a buyer's new question appeared under
    "Awaiting your answer" (1 of 5); the seller answered → **201 `authorKind: "seller"`** → the row
    **left** the filtered queue (0) while staying in "All questions" (5) with `hasSellerAnswer: true`.
    Paging `limit=2` walked 3 pages / 5 rows / 5 unique — no duplicate, no skip. A buyer-org session
    got 200 with 0 items. Both rows withdrawn, inbox back to its baseline 4.

    ⚠️ **AND IT UNCOVERED A DRIFT BUG THAT WAS NOT MINE.** `/studio/reviews` — built by the identical
    slice — was registered in `site-capabilities.ts` and **never in `site-roadmap.ts`**; the
    `/studio/quotes` LIST route was missing too, with only its `[quoteId]` detail present. The
    roadmap's own drift loop walks roadmap → filesystem and so cannot see a page that has no entry.
    Both were added alongside `/studio/questions` rather than left for the next reader. **A new studio
    route needs six edits across four files**: the route, the component, THREE separate structures in
    `studio-sidebar.tsx` (`ICON_PATHS`, `STUDIO_ROUTES`, `STUDIO_NAVIGATION_CONFIG`), and both roadmap
    files. Only `iconKey` is compiler-checked.

    ⚠️ **`STORE_BACKEND_STRUCTURE.md` DOES NOT LIST FOUR OF THESE ROUTES.** §6.4's table has the
    helpful pair and the seller inbox; the two creates and two deletes appear in no table, and §A35
    admits it. The code was the authority for all of the above.

2. ~~**Customization option authoring.**~~ **SHIPPED — a Customization step in the wizard, frontend
   only, no migration.** Both halves: the write had no caller, AND the seller read was discarding
   `customizationOptions` through `.strip()` — `src/lib/products/schemas.ts` named it nowhere, so the
   wizard could not have hydrated a slot even once the write existed. That is `variants` before §15,
   verbatim, and the seventh instance of the class.

    ⚠️ **THE VERIFICATION THIS ENTRY DEMANDED CAME BACK NEGATIVE, AND THE ENTRY WAS WRONG.** All 17
    purchasable products scanned (the search's own `documentKinds` facet says `product: 17`,
    `hasMore: false`, so the scan was complete): exactly ONE carries slots, and both are
    `isRequired: false`. **No buyer could hit `REQUIRED_OPTION_MISSING`** — nothing could mint a
    required slot, because the only route that can has no caller. The two halves of the old claim
    cancel each other out. The doc is where it came from: `STORE_BACKEND_STRUCTURE.md` A23 says a
    required slot meant a product "could not be checked out by anybody" in the past tense, describing
    a class of bug as though it were an incident. **Worth correcting at the source before it
    propagates a fourth time.**

    ⚠️ **AND `isRequired` IS DELIBERATELY NOT AUTHORABLE. Shipping the toggle would have CREATED the
    blocker this entry imagined.** `rg customizationSelections src/` returns **nothing** — no client
    submits a selection, not artwork and not even a plain choice; `customization-sheet.tsx` collects
    locally and sends none of it, because an upload lands `pending_scan` and cannot be attached until
    a scanner promotes it. Meanwhile `checkout/prepare` revalidates **every cart line
    unconditionally**, even one with zero selections. So one required slot would make its listing
    permanently uncheckoutable BY ANYBODY, including a buyer who wanted to answer. The key is never
    sent; the backend defaults it to `false`. **The toggle unlocks when cart selections are wired —
    that is now a precise dependency, not a vague one.**

    ⚠️ **A REAL BACKEND BUG FOUND WHILE VERIFYING, AND IT IS DETERMINISTIC. NOT FIXED — it lives in
    the other repo.** Retire a slot, then save again, and the write answers **500 forever** on that
    listing. `replaceProductCustomizationOptions` parks existing rows at
    `position + (existing.length + options.length + 1000)` before rewriting, but **a retired row is
    never given a final position, so it keeps its parked value permanently**. The next save whose
    offset lands on that stale number collides on
    `commerce_product_customization_option_position_uidx` and raises `23505`, which `ProductError` has
    no member for — so it escapes as an unmapped 500.

    ```
    after retiring one of two slots:  packaging_material pos=0 active · your_logo pos=1004 retired
    next save, 2 options: offset = 2+2+1000 = 1004 → packaging 0→1004 collides   500  (3× in a row)
    next save, 3 options: offset = 2+3+1000 = 1005 → no collision                200
    ```

    **That is the whole mechanism, proven by falsification rather than inferred.** It is reachable by
    the most ordinary sequence there is — remove a slot, save, edit something else, save — so the
    step is shipped but a seller who removes a slot may hit it. The fix is server-side: reset a
    retired row's position, or park with an offset that cannot collide with one.

    **Everything else proved live on a throwaway listing, then deleted:** both kinds saved with
    `isRequired: false`; omitting a slot **retired** it rather than deleting; re-sending its key
    **revived the same row**; a choice slot carrying `acceptedMediaTypes` → **422** (the XOR refine);
    a kebab `slotKey` → **422 "Slot key must be snake_case"**, which is why the step has its own
    `toSlotKey` rather than reusing `toVariantSlug`'s kebab output. ⚠️ **The seeded chair's two slots
    were confirmed byte-identical afterwards** — it is the only listing in the database with slots,
    and a replace-set `PUT` omitting them would have retired them.

    **Two adjacent findings, recorded not fixed:** `DELETE /products/:id` for a listing ever bought
    with a customization hits an `onDelete: restrict` FK from the order line and surfaces as a raw
    500, since `ProductError` has no member for it. And `platform_audit_event_kind` declares
    `product_customization_options_replaced`, which nothing emits — retiring a commercial term a
    buyer is held to leaves no trail.

3. **Seller profile writes** — all 11 `commerce-seller-profile` routes. The buyer storefront already
   renders stakeholders, site access, capabilities and certifications from `declaredProfile`; nothing
   can fill any of it in.
4. **Product relations** (`companions` is read and rendered, nothing writes it), **settlement
   agreements** (`hasEscrowProtection` is labelled copy over an unreachable flow), **logistics
   writes** (a provider can watch a shipment, not create or advance one), **pathway authoring**,
   **commerce moderation and dispute-opening** (a buyer can read a dispute they cannot open),
   **provider offering edit/submit/coverage**, image reorder, the product view-beacon, RFQ
   invitations.
5. ~~⚠️ **Two frontend files assert in prose that a shipped backend route does not exist.**~~
   **BOTH SHIPPED, frontend only, no migration.** Each route was proved to exist against the running
   backend before anything was written, by the assertion that separates "the route is missing" from
   "the wrapper is missing": a path that really does not exist answers `Route not found`, and
   neither of these did.

    ```
    GET /research-projects/project-immortal/override-queue   -> 401 "Please sign in."
    GET /research-projects/project-immortal/override-quueue   -> 404 "Route not found: …"
    GET /discovery/market-insights/__none__                   -> 422 (id shape)
    GET /discovery/market-insights/mi_x/nope                  -> 404 "Route not found: …"
    ```

    - **The override queue is now a surface.** `listOverrideQueue` + `useOverrideQueueQuery` +
      `OverrideQueueIsland`, mounted ABOVE the claim index as "Waiting on a person". ⚠️ **IT IS PER
      STEP AND THE FLAGGED-CLAIMS CHIP IS PER CLAIM — both are kept**, because a claim with one
      answered step and one still waiting appears under the chip either way, which tells a reviewer
      nothing about what is left. The row mounts the SAME `ClaimDetailDisclosure` the index does, so
      a maintainer answers from the queue; the override mutation already invalidates the `poe`
      prefix, so an answered step drops out on its own. A contributor sees the queue and cannot
      answer it — the read is `contributor`, the write is `maintainer` — deliberately, because
      hiding the backlog from the people whose equity is waiting on it helps nobody.
    - **The half of the old comment that was RIGHT and must not be re-deleted:** there is still no
      `VerificationOverrideRequest` entity and there must not be one. The queue is a PREDICATE over
      facts that already exist (`status = 'flagged' AND overridden_status IS NULL`), so a request
      table would duplicate the flag's timestamp, author and finding and could say review was
      pending on a step somebody had answered.
    - **`STEP_KIND_LABELS` moved to `lib/rnd/labels.ts`** and is now typed over the enum. It had one
      consumer; the queue is the second, and two maps for one enum drift.
    - **Market insights have a detail page** at `/research-and-development/knowledge-hub/insight/
[insightId]`, the `relatedInsights` chips link to it, and the card headline links too — the
      headline rather than the whole card, because the source citation is its own `<a>` and an
      anchor inside an anchor is invalid HTML.
    - ⚠️ **`insightId` IS `z.uuid()`, SO A BAD ID IS A `422`, NOT A `404`** — measured, not assumed.
      The new page routes 422 to `notFound()` as well, because the only input this route validates
      is the path segment: a 422 here means the URL is a typo, and a typo is a 404. Without that arm
      the SENTINEL PARAM `withSentinelValues` prerenders serves an error panel, which is the one
      outcome `@/lib/static-params` says it must not.
    - ~~⚠️ **`cluster-detail-page.tsx` has the same gap.**~~ **FIXED TOO, and the CLASS is closed
      rather than the instance.** `ClusterIdParamSchema` is also `z.uuid()`. The sweep that followed
      is the part worth keeping: **exactly TWO page segments in the whole app validate as `z.uuid()`**
      — `clusterId` and `insightId`. Every other detail route addresses by slug or by a prefixed
      string id (`store_demo_…`), which `__none__` satisfies, so the lookup runs and answers a real 404. Probed live: `/commerce/products/__none__` and the commerce id routes never reach a shape
      refusal. The remaining strict-uuid schemas (`videoId`, `commentId`, `submissionId`) are query
      params or have no frontend page segment at all.
    - **Proved side by side against `pnpm start`, before and after.** Before: `/problem-map/cluster/
__none__` rendered **"Couldn't load this cluster"**. After: `__none__` and `not-a-uuid` both
      render only the 404 page, and a REAL cluster id still renders its content — "People who
      reported it", "Submissions in total", "Opportunity score" all present, no error panel.
    - ⚠️ **THE SENTINEL WAS THE ARGUMENT, NOT THE ONLY WAY IN.** With the backend up,
      `generateStaticParams` prerenders two real cluster ids and no sentinel — so the panel was
      reached by a TYPED URL here, and by the sentinel only where the list read is empty or failing
      (CI, backend down), which is most machines. Both are the same 422.
    - **Note the status code**, so nobody re-tests this and thinks it regressed: both routes answer
      **HTTP 200** for a bad id, and that is the app-wide default rather than anything these two do.
      ⚠️ **It is the SUSPENSE BOUNDARY, not PPR** — I first wrote "PPR commits the status before the
      dynamic hole resolves", and `/channel/nope`, which is `◐` and answers a real **404**, is the
      counter-example that separates the two. See _"`notFound()` answers 200 wherever a `loading.tsx`
      sits above it"_ below for the mechanism and the measurements.
      ⚠️ **And assert on the ERROR-PANEL string, not on "This page could not be found"** — the
      streamed document carries the not-found boundary's markup either way, so that phrase appears
      even on a page that rendered perfectly. It is what made the first A/B read as ambiguous.

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
- ~~**The uncovered-inland-leg rule.**~~ **SETTLED — see §16.** An uncovered inland leg no longer
  empties the sheet: the covered legs compose into `partialJourneys[]` with the missing leg named.
  Decided before the rate cards are bought, which is the order this entry asked for.
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

## ⚠️ `notFound()` answers 200 wherever a `loading.tsx` sits above it — WORKING AS DESIGNED

**19 of 21 record-detail routes render the not-found page with an HTTP 200.** This is documented Next
behaviour, not a defect, and the SEO harm it looks like it causes is already prevented. Recorded
because it cost most of a session to establish and because two plausible wrong explanations are easy
to land on. **Do not "fix" it without reading the cost line at the bottom.**

**The mechanism, from Next 16.3.0's own bundled docs** (`node_modules/next/dist/docs/`):

- `01-app/03-api-reference/03-file-conventions/loading.md:105` — _"Because the response headers have
  already been sent to the client, the status code of the response cannot be updated."_
- `01-app/02-guides/streaming.md:611` — _"When a `<Suspense>` fallback renders or a component
  suspends, the server must commit to `200 OK` in order to start sending the HTML stream. If a
  `notFound()` fires mid-stream, Next.js cannot go back and change the status to 404."_
- `loading.md:118` — _"The response body starts streaming when a Suspense fallback renders (for
  example, a `loading.tsx`)… Place `notFound()` before those boundaries and before any `await` that
  may suspend."_

Exactly two places in Next's source turn a `notFound()` into a status —
`server/app-render/app-render.js:2382-2385` and `:5889-5894` — and both are `catch` blocks around the
**whole** React render. A Suspense boundary above the throw absorbs it before it reaches either, so
neither `catch` ever runs.

**THE DISCRIMINATOR IS A `loading.tsx` AT OR ABOVE THE SEGMENT, and the correlation is exact:**

| Route                                                                          | `loading.tsx` in ancestry | Status  |
| ------------------------------------------------------------------------------ | ------------------------- | ------- |
| `/blogs/nope` · `/press/nope` · `/channel/nope`                                | none                      | **404** |
| `/store/**` · `/anime/series/**` · every `/research-and-development/**` detail | yes (segment or a parent) | 200     |

`/store/forum/[threadSlug]` is what proves it is ANCESTRY rather than the segment: it has no
`loading.tsx` of its own, and still answers 200 because `(home)/store/loading.tsx` sits above it.

⚠️ **TWO EXPLANATIONS THAT LOOK RIGHT AND ARE WRONG. Do not re-derive them — both were measured and
refuted.**

- **NOT session forwarding.** The soft-404 routes mostly call `callerRequestOptions()` first, so
  `cookies()` looks like the cause. `series-detail-page.tsx` refutes it: its banner says _"the route
  is PUBLIC, so no `callerRequestOptions()` and no cookie forwarding"_ and it answers 200 anyway.
  Reading `cookies()` only CORRELATES, because under `cacheComponents` it is what forces the route to
  have a Suspense boundary — `src/lib/server-http.ts:46-48` already says exactly this.
- **NOT `"use cache"`.** `/blogs` and `/press` read through `cms.ts`'s cached getters and 404
  correctly, which makes caching look like the answer. `/channel/nope` refutes it: it reads the live
  API through `loadChannelProfileOnce` and still answers a real 404, because nothing above it
  suspends.

⚠️ **THE SEO RISK IS ALREADY HANDLED, AND THAT IS WHAT DECIDES THIS.** Next injects
`<meta name="robots" content="noindex">` into every one of these responses by itself
(`client/components/http-access-fallback/error-boundary.js`). **Verified in the served HTML** — the
meta is present on `/store/forum/nope`, `/knowledge-hub/insight/nope` and `/channel/nope`.
`loading.md:109`: _"Some crawlers may label these responses as 'soft 404s'. In the streaming case,
this does not lead to indexation because the page is explicitly marked `noindex`."_ **A dead URL is
therefore NOT indexed.** What is left is Search Console labelling, analytics and compliance — which is
why this is recorded rather than fixed.

**If it is ever revisited, the two real options and what each costs:**

- **Remove the Suspense boundary above the check** — delete or narrow the `loading.tsx` so
  `notFound()` throws before anything streams. Cheap diff; costs those routes their instant skeleton
  and makes the navigation block on the server, which is the exact trade `loading.tsx` exists to make.
- **`proxy.ts`** — check existence before the render and return a 404. Keeps the skeletons; costs a
  backend round trip **per request, per detail route**, against `loading.md:113`'s own warning to
  _"keep proxy checks fast, and avoid fetching full content there"_. ~20 route patterns, each a
  different lookup. There is no `proxy.ts` today. ⚠️ Note `middleware` is deprecated and renamed to
  `proxy` (`proxy.md:12`).
- ⚠️ **NOT AN OPTION, so nobody spends an afternoon looking:** there is no API to set a response
  status from a page render. `next/headers` exports only `cookies`, `headers` and `draft-mode`.
  `not-found.tsx` is a UI convention and does not touch the status. `generateMetadata` cannot set one.
  `dynamicParams: false` needs the complete param set at build time, which a UUID detail route cannot
  have — and the docs contradict themselves on whether it even works under `cacheComponents`
  (`dynamicParams.md:22` says it is unavailable, `migrating-to-cache-components.md:595` says it is
  unchanged; no validation code enforces the former).

**`src/lib/static-params.ts` reads slightly wider than it is.** Its docblock argues a sentinel
prerender is safe because the page "calls `notFound()` on a 404". That holds for the BODY —
`/…/__none__` does render the not-found page — but the response is a 200 on every route with a
`loading.tsx`. Nothing is broken: `sitemap.ts:163-169` filters `UNRESOLVABLE_PARAM_VALUE` so the
sentinel is never advertised.

### A separate defect found on the way, NOT fixed

`pitch-detail-page.tsx:40` and `src/app/(home)/store/factories/[factorySlug]/inquire/page.tsx:38` call
`notFound()` on **any** failed read — `if (!result.success) notFound()` — where every other detail
page in the app tests `error.code === "404"` first. So a backend outage renders "this pitch does not
exist". That is precisely the lie `series-detail-page.tsx:14-22` documents its `unavailable` state to
avoid: _"rendering 'this show does not exist' for a backend outage would be a lie that a crawler would
then cache."_ One line each.

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
    $(find src/lib \( -name '*.api.ts' -o -name 'api.ts' \)) | sort -u); do
  rg -q "\b$f\b" src/hooks src/components src/app src/lib || echo "UNCALLED-API $f"; done
```

⚠️ **THIS LOOP HAS NOW BEEN WRONG THREE TIMES, AND THE THIRD AND FOURTH FIXES ARE ABOVE.** The glob
`-name '*.api.ts'` missed **`src/lib/products/api.ts`** — the file that owns every seller `/products/*`
write, and therefore exactly where the biggest gaps were hiding. And the caller search omitted
`src/lib`, so a wrapper consumed by another `src/lib` module read as dead: it printed a false
`UNCALLED-API listPublicAnimeSeries`, which is called from `sitemap-sources.ts:134` and from its own
sibling at `series.api.ts:70`. Both halves are fixed above.

**THE GLOB IS NOW `find`, NOT FOUR HAND-LISTED DIRECTORIES**, and that is the third time this has
bitten. It started as `src/lib/store/*.api.ts` alone, which is why seven R&D wrappers went unnoticed;
it was widened to four directories, and `src/lib/users/*.api.ts` then shipped outside all four — so
the audit that is supposed to catch unverified code was not looking at the newest code in the repo.
A hand-maintained list of places to check is a list that will be wrong again.

**Both are silent again**, after the loop itself was corrected — the one name it printed was a
false positive caused by the search path, not unverified code. The second printed seven R&D names until those wrappers were wired
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
