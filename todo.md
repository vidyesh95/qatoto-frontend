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
(item 8), and product documents after that (`0155`). ~~**The only store item left is a single-line checkout for "Buy now"**~~ — ⚠️ **not quite; four
smaller store items are still open**: the service-offering coverage read, `standardCode` being
unreachable from any client, `viewer.canDelete` on Q&A, and the `DELETE /products/:id` 500 on a
customized listing. The *blocked* one is the single-line checkout, which needs a payment rail that
does not exist — `stripe` is a name in an
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

## Seller console split, and the four things it left blocked

`/studio/sales` used to do four jobs — money, dispatch, orders and a shipments summary that
duplicated `/studio/logistics`. It now does one, and the money moved to `/studio/earn`, which had
been a `StudioPlannedPage` stub pointing at Sales for the panel it should have carried itself:

```
/studio/earn       what has settled to you                 (SellerEarningsPanel)
/studio/sales      orders received, ready to dispatch
/studio/logistics  shipments, legs, transport mode, commands
```

**The leg command rail is wired** — see the corrected bullet in §19.10 above. Four things that ask
depended on are NOT, each blocked on the backend rather than on effort.

### A. Seller cost basis and indicative profit — the JOIN is missing, not the read

⚠️ **This reopens "Seller cost-of-goods and margin — DECIDED: NOT BUILDING IT" above, and only
halfway.** That decision refused a **seller-typed** cost on three grounds. Two of them do not
survive a **platform-recorded** one: a cost taken from a quote the seller accepted on Qatoto is
measured, not self-reported, so it does not cross the A13 boundary
`commerce_journal_account_memorandum_ck` exists to hold, and nobody has to fill anything in.

**It is still not buildable, for a reason the original entry never reached.** There is no join:

- `commerce_manufacturing_inquiry.target_unit_price_in_cents` (`store.ts:9163`) is the **buyer's own
  aspiration** sent to a factory. There is no answering price column — the factory's reply lands in
  `commerce_thread` prose, or the inquiry converts to an RFQ.
- Where a seller genuinely was quoted, `commerce_quote_product_line.unit_price_in_cents`
  (`store.ts:5972`) is the number — but **nothing links that quote line back to the `product` row
  it sourced.** No FK from a listing to the inquiry or quote that produced it.
- Storage is the same shape: `warehouse_quote_service_detail` (`store.ts:6134`) carries capacity and
  temperature, never money; the fee lives on `commerce_quote_service_line` with no link to a product.

**What to design first, before any endpoint.** The link, and the allocation rule with it: a
manufacturing quote prices a BATCH and an order ships a few units of it, so attributing cost to an
order line needs a documented apportionment — not an average nobody can audit. Then the coverage
rule: the figure must be **per order and silent where its inputs are absent**, never an aggregate.
`todo.md`'s own line stands — a margin over 12 of 47 orders is worse than no margin. And the
constraint from the original entry is unchanged: the cost cannot live on
`commerce_order_product_line`.

Until then `seller-earnings-panel.tsx`'s "Profit and margin are not shown" card is correct and stays.

### B. The buyer's transport choice is never persisted

`delivery-sheet.tsx` lets a buyer pick a mode per leg and holds it in
`selectedModeByLegSequence`, **local component state that dies when the sheet closes.** Nothing
carries it to the cart, the order or the seller.

- `PrepareCheckoutSchema` and `ConfirmCheckoutSchema` (`commerce-checkout.schemas.ts:19,25`) are
  `.strict()` and accept only `deliveryAddressId`, `prepareId` and the settlement-agreement array.
- Prepare calls `projectPrepareArrivalWindow` with `requestedMode: undefined`
  (`commerce-arrival-window.service.ts:574`), producing
  `freight: { status: "unknown", reason: "mode_not_selected" }` — the absence is already modelled.
- `ArrivalWindowQuerySchema`'s `?mode=` is **read-only exploration** on an existing order. Its own
  comment: "OPTIONAL, AND NOTHING IS AUTO-SELECTED WHEN IT IS ABSENT." Nothing writes it back.

Carrying the choice through needs a cart or checkout column plus a widened schema. Note the order
this has to happen in: a persisted mode is only worth having once a lane can be priced, and every
lane answers `no_active_rate_card` today (§18).

### C. A leg cannot be added, or reassigned, after the shipment exists — **BACKEND SHIPPED (A43, no migration); FRONTEND NOT WIRED**

~~`commerce_shipment_leg.logistics_engagement_id` is settable only through
`legs[].logisticsEngagementId` on `POST /commerce/orders/:orderId/shipments`. There is no route to
add a leg to an existing shipment, and none to attach or re-point an engagement on one.~~ **Both
routes now exist** — `qatoto-backend` A43, `docs/STORE_BACKEND_STRUCTURE.md`:

| Method | Route                                       | Body                                                         | Answers                      |
| ------ | ------------------------------------------- | ------------------------------------------------------------ | ---------------------------- |
| POST   | `/commerce/shipments/:shipmentId/legs`      | `{ legs: ShipmentLegInput[] }`, 1–50                         | 201 `{ shipmentId, legs[] }` |
| POST   | `/commerce/shipment-legs/:legId/assignment` | `{ expectedVersion, logisticsEngagementId: string \| null }` | 200, the updated leg         |

Both take an `Idempotency-Key` header (8–200 chars) and are **counterparty-only** — deliberately not
the two-branch rule `executeShipmentLegCommand` uses, under which authority passes to the assigned
provider. `null` on assignment detaches; assignment is refused once a leg is past `booked`.

⚠️ **NEITHER HAS A FRONTEND CALLER YET, AND THAT IS THIS FILE'S OWN DEFINITION OF UNVERIFIED CODE.**
The next slice, and it is small because the surface exists:

- `src/lib/store/shipments.api.ts` — `addShipmentLegs(shipmentId, input, idempotencyKey)` and
  `assignShipmentLeg(legId, input, idempotencyKey)`, both on the `sendJson` + `Idempotency-Key`
  shape `executeShipmentLegCommand` already uses.
- `src/hooks/store/shipments.ts` — two mutations invalidating `shipmentDetail` + `shipmentQueues`.
- `shipment-leg-panel.tsx` — replace the two honest dead-ends. "No legs were declared for this
  shipment" becomes an **Add a leg** form (sequence, mode, origin/destination country); "You are
  moving this leg" gains an **Assign a forwarder** control listing the order's freight and logistics
  engagements, with a detach beside it once one is attached.
- The engagement picker needs the order's engagements, which
  `GET /commerce/orders/:orderId/fulfillment` already returns and the panel does not yet read.

### D. Nothing calls a carrier, and nothing insures anything

Two seams that read as integrations and are not. Neither is a bug; both are worth knowing before
somebody writes copy that overclaims.

- `logistics-provider.adapter.ts` has **zero importers**, and says so: "A seam only. No carrier is
  contracted; the fake is the sole implementation and no shipment-leg transition calls it."
  `book` writes `carrierReference` and `trackingReference` as **free text a human typed in**.
- `insurance-provider.adapter.ts` likewise: "No insurer is contracted, nothing calls it, and **no
  client copy may claim a shipment is insured**." Insurance is reachable only as a provider kind
  through the ordinary RFQ → quote → engagement rail, and `/studio/logistics` links into
  `/store/providers?providerKind=insurance_provider` with that disclaimer beside it. The one place a
  policy is recorded is `insurance_deliverable_detail.policy_reference` (`store.ts:7757`) — attached
  to an engagement deliverable, **not to a shipment**. `declaredValue` exists nowhere in either repo.

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

**Confirmed 2026-08-31 and this is BLOCKED ON ASSETS, NOT CODE.** Of 204 files in `public/icons`,
the only non-Material-Symbols marks are `apple`, `google` and `github` — OAuth provider marks, not
share targets. The fallbacks are `share-sheet.tsx:44` (WhatsApp), `:53` (X) and `:62` (LinkedIn);
only Email at `:71` is correct.

⚠️ **ONE THING TO KNOW BEFORE DROPPING FILES IN.** The render at `share-sheet.tsx:270-277` builds
the path from a hardcoded Material Symbols filename template
(`/icons/${icon}_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg`) and `ShareTarget.icon` is a bare base
name (`:13-14`). A real brand SVG either has to be named to match that template — which is a lie
about what the file is — or `icon` becomes a full path and the template moves behind a branch. The
second is right; it is a small refactor rather than a drop-in.

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
- ~~**Three vocabulary gaps, all small.**~~ **TWO OF THE THREE SHIPPED; ONE IS LEFT, and it is the
  backend half.** ⚠️ **This entry was STALE and would have sent the next reader to fix working code.**
  Re-checked 2026-08-31: `QUOTE_INCOTERM_LABELS` is at `src/lib/store/quotes.schemas.ts:592-604`
  behind the guarded `formatIncotermLabel` (`:583-586`), and **both** `quote-detail.tsx:172` and
  `order-detail.tsx:119` already call it — commit `0443ae7` did it. `rg` finds no raw-code render
  site anywhere in `src`, and the label map now has three consumers rather than one.

    ~~**Still open:** `commerce-orders.service.ts:135` and `commerce-checkout.service.ts:239`
    declare `incotermSnapshot: string | null`.~~ **DONE — verified 2026-08-31.** All three now read
    `readonly incotermSnapshot: CommerceIncoterm | null` (`commerce-orders.service.ts:155`,
    `commerce-checkout.service.ts:257`, `commerce-quotes.service.ts:387`). The line above at §15 was
    right and this one had gone stale.

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

## Keyset pagination precision — FIXED 2026-08-31 (backend `0157`)

**14 keyset-paginated lists were sorting on microsecond `timestamp` columns under a millisecond
cursor.** `encodeStoreCursor` mints its sort key with `Date.toISOString()` (3 decimal places), but a
plain `timestamp` defaulted by Postgres `now()` stores 6. The predicate then compares `.538000`
against a stored `.538694`, so `eq` never matches and the boundary row is mishandled.

Fixed by adding `precision: 3` to all 14 columns — `commerce_order`, `commerce_refund`,
`commerce_service_engagement`, `commerce_shipment`, `commerce_rfq`, `commerce_message`,
`commerce_thread.updated_at`, `commerce_quote.updated_at`, `commerce_dispute`, `commerce_review`,
`commerce_encrypted_document`, `notification`, `user_report`, `user`. This finishes a convention the
repo already held: `precision: 3` appears 44× in `store.ts`, 17× in `home.ts`, 11× in `rnd.ts` and
**0× in `platform.ts` / `_core.ts`**, which is exactly where the bugs were. `home.ts:312` labels it
"LOAD-BEARING"; `instant-cursor.ts` states the `timestamp(3)` dependency outright.

⚠️ **THE DOMINANT SYMPTOM IS THE ASC CASE, AND IT DOES NOT TERMINATE.** Measured on unconverted
microsecond columns with the real cursor semantics:

```
research_project          ASC   reached 53/53  dup=402   <- cursor never advances
daily_log_extracted_claim ASC   reached 80/80  dup=401
research_project          DESC  reached 52/53            <- 1 row unreachable
commerce_order (after 0157) ASC/DESC  367/367  dup=0     <- fixed
```

An ASC keyset on a microsecond column re-reads the cursor row forever; a DESC one silently drops
rows in `[cursor_ms, cursor_actual)`. Those three tables sort by `id`/`name`/`sequenceNumber` in
production, so they are **demonstrations of the class, not live bugs** — checked, not assumed.

⚠️ **A CORRECTION TO AN EARLIER CLAIM IN THIS FILE'S HISTORY.** The first measurement of this bug
reported "5 orders silently dropped" in `commerce_order`. **That number was a probe artifact, not a
product defect.** node-pg parses `timestamp without time zone` into a _local-time_ JS Date, so a
probe that reads via pg and writes back an ISO string cast to `::timestamp` compares values one UTC
offset apart. The application is not affected: drizzle's own mapper reads `value + "+0000"` and
writes `toISOString()`, symmetric in both directions, and the server runs in UTC. Re-measured
app-level with the real codec and real drizzle predicates: `commerce_message` 36/36 and
`commerce_order` 43/43, zero duplicates. **The precision bug was real; that specific figure was
not.** Measure keyset behaviour through the app's own codec, never through raw `pg`.

Also folded in: **11 cursor call sites across 9 files** now use `decodeTimestampStoreCursor` instead
of `decodeStoreCursor` + `new Date(...)`. The loose decoder does no format validation, so
`"abc"`, `"2026-8-12"` (silently reinterpreted in local time), a microsecond cursor and an
out-of-range year all passed it — two of them reaching the driver as `Invalid Date` and answering
**500 instead of 422**. `commerce-pathways.service.ts:1318` was deliberately left on
`decodeStoreCursor`: it is a **title** cursor, not a timestamp.

### ~~New finding, NOT fixed — the cursor separator~~ — FIXED 2026-08-31

`encodeStoreCursor` joined as `` `${sortKey}_${id}` `` and split on the **last** `_`, but
`encodeURIComponent` does not escape `_`. **Both halves now escape it to `%5F`**, so exactly one
literal `_` survives in any cursor and the split cannot land anywhere else.

⚠️ **The direction of the bug was the opposite of the obvious one, and my first note here had it
half right.** Because the split is `lastIndexOf`, a `_` in the **sortKey** round-trips _correctly_ —
the title cursors were never the bug. Only a `_` in the **id** breaks. The split stays `lastIndexOf`
deliberately: the four sibling codecs split on the FIRST separator and are immune, but every one of
them has a regex-pinned numeric or date prefix, whereas this codec's sort keys include free text.

Verified against the real service on the exact rows that broke — `store_rail_placement` ids are
`store_demo_rail_placement_store_demo_product_chair`-shaped. Paging at `limit=1` now reaches all
three, none repeated, with `%5F` visible on the wire.

**Three more defects fixed in the same pass**, all found by the sweep rather than reported:

- `store-merchandising.service.ts` and `commerce-ranking.service.ts` fed `Number(cursor.sortKey)`
  into SQL with **no NaN guard at all** — a forged cursor was a 500. Both now carry the
  `Number.isInteger` guard `store-pathways.service.ts:301-304` already had. Confirmed: a forged
  `not-a-number_abc` now answers `INVALID_CURSOR`.
- `user-reports.service.ts` used `const [rawInstant, rawId] = cursor.split("_")`, which takes
  element `[1]` and **discards the rest** — an id with an underscore paged from a truncated id and
  returned the **wrong rows without erroring**. Now splits on the first separator with the id as the
  unbounded tail.

⚠️ **Cursors are ephemeral** — nothing persists one, so the encoding change is free. A cursor held
across a deploy decodes to `null` and answers the existing 422 rather than mispaging.

Production ids remain `randomUUID()`, so no live customer was affected; the seeded `devseed_`/
`store_demo_` ids are what made it reproducible. All 2044 backend tests pass, including the four
cursor codec test files.

## Self-moderation guard on `verifyRelation` — SHIPPED 2026-08-31

A moderator holding `moderate_commerce` who also belonged to the **selling** organization could
confirm their own company's compatibility claim. Now refused with `SELF_MODERATION_FORBIDDEN` → 403,
copying `isModeratorPartyToTarget` from the content-report queue (executor-polymorphic, so it runs
inside the existing `.for("update")` transaction).

⚠️ **The `fromProduct` select was HOISTED above the replay return.** It used to sit after the UPDATE
where it only fed the audit append. Left there, "verify it twice" would have been a way around the
guard — the second call takes the `already_verified` path and never reaches the check.

⚠️ **The capability check still runs FIRST.** It happens before any row is read, so a caller without
`moderate_commerce` still learns nothing about whether a relation id exists. Verified all four ways:
party → 403 with the row unchanged; party on a replay → still 403; non-party → 200 and promoted;
no capability → `PLATFORM_CAPABILITY_REQUIRED`, not the party error.

## Seed product images — SHIPPED 2026-08-31

All 17 seeded products were `status='active'` with zero `product_image` rows, so every one was
stranded: the publish rule requires `imageCount >= 1`, and the seeds write `status` directly,
bypassing it. Both seeds now write one image row per product.

**Proven both directions** on `devseed_prod_chest-freezer-500`: with the image, unpublish →
republish **succeeds**; with the image deleted, the same republish returns
`INCOMPLETE_FOR_PUBLISH {missing:["images"]}` and the listing sticks at `draft` — the exact trap that
stranded the demo lamp.

⚠️ ~~**The 14 industrial listings share `machinery.avif`, and that is a knowing compromise.**~~
**SUPERSEDED — see "Seed images — CORRECTED" below.** They now carry one labelled placeholder tile
per category. The paragraph below describes the state for a few hours only; it is kept because the
reasoning about honest filler still holds.
`public/dummy/` is a furniture and lifestyle library with no freezer, compressor, carton or probe in
it. `altText` carries the real product title so the accessible name stays truthful even though the
picture is filler. The 3 demo furniture products got real matches. Replacing the filler needs 14 real
assets, which is its own task.

Root-relative URLs confirmed end to end: `/dummy/machinery.avif` serves **200 image/avif**, and
`/_next/image?url=%2Fdummy%2Fmachinery.avif` serves **200 image/jpeg**. `remotePatterns` gates only
absolute URLs, and `product_image` has no `https://` CHECK (unlike
`commerce_product_highlight_image_ck`).

⚠️ Both seeds use a **bare `.onConflictDoNothing()`**, not one targeting the PK — `product_image` has
a second unique key, `product_image_position_uidx (product_id, coalesce(variant_id,''), position)`.

## `pnpm lint` was nondeterministic — FIXED 2026-08-31

`.oxlintrc.json` now sets `"typeCheck": false`, keeping `"typeAware": true`.

⚠️ **The failure could not be reproduced on demand, and that IS the finding.** `pnpm lint` failed
once with `TS2307: Cannot find module 'vitest'` on a clean tree, then passed 4/4, and still passed
after replaying the exact preceding sequence and deleting `tsconfig.tsbuildinfo`.

`options.typeCheck` is the only source of TS compiler diagnostics in oxlint, and it shells out to
`oxlint-tsgolint` — a Go reimplementation whose own CLI prints _"the `tsgolint` CLI entrypoint is
unsupported!"_. It can also fail to spawn silently, so `pnpm lint` could exit 0 having type-checked
**nothing**. Nondeterministic in both directions.

The diagnostic was a false positive — real `tsc --noEmit` resolves `vitest` fine, and within the same
file only the bare specifier failed while the relative import resolved. The duplicated pass is
redundant because the gate already runs `tsc --noEmit`.

**Verified the fix does not gut linting**: with `typeCheck: false`, a deliberate floating promise is
still caught by `typescript(no-floating-promises)` — a genuinely type-aware rule. So `typeAware`
alone retains type-informed rules; only the redundant compiler pass is gone.

## Relation DISMISSAL — SHIPPED 2026-08-31 (backend `0158`)

The moderator console could confirm a claim but never refuse one, so the queue never drained and a
claim judged false stayed live to buyers forever. `dismissed_at` + `dismissed_by_user_id` now carry
the refusal — **not** a new `sourceKind` member, so `sourceKind` still records only PROVENANCE and a
dismissed seller claim stays distinguishable from a dismissed derived edge.

**Dismissal suppresses the claim from buyers, not just from the queue.** Verified on all three
surfaces rather than inferred from one: companions rail `2 -> 0`, spare-parts reverse read `1 -> 0`,
pathway candidates `1 -> 0`.

### ⚠️ The finding that shaped the build: the `23505` would have told the seller a lie

Making dismissal survive the seller's save means adding `dismissed_at IS NULL` to
`replaceSellerDeclaredRelations`'s delete leg — without which the seller's next save wipes the
moderator's decision and the claim goes live again, cleared by the party it was aimed at.

But a surviving dismissed row still occupies its `(from, to, relationKind)` slot in
`commerce_product_relation_edge_uidx`, so re-sending that edge raises **the same unique violation a
moderator-CURATED edge raises**. The existing `.catch(isUniqueViolation)` would have answered
*"A moderator has already **confirmed** one of these related products"* about a claim a moderator
**rejected**. `isUniqueViolation` carries no way to tell the two apart.

Fixed with an explicit pre-read diff of the dismissed edges inside the transaction, returning a
distinct `RELATION_DISMISSED` (409) with its own wording. The `isUniqueViolation` catch stays as the
backstop for the genuine curated case. **Verified the message, not just the status** — a seller
re-sending a dismissed edge gets `RELATION_DISMISSED`.

### ⚠️ Second finding: the nightly job silently un-dismissed derived rows

`derive-product-relations.ts` deleted **every** `derived_cooccurrence` row and re-derived, so a
dismissed derived edge came back undismissed overnight. The delete is now scoped
`AND dismissed_at IS NULL`; the job's own `humanAuthoredPairs` read is unfiltered, so the surviving
row is still seen and its pair skipped — no collision. Verified by running the real job with a
dismissed derived row present: **still dismissed** afterwards.

### Decisions worth keeping

- **The edge unique index was deliberately NOT made partial.** Unconditional is what makes dismissal
  binding — a partial index would let a live row sit beside the dismissed one and reopen the bypass.
  Sellers cannot re-appeal in-product; that is the accepted cost.
- **`products.service.ts`'s seller-editor read PROJECTS `dismissedAt` and does not filter on it.**
  Filtering there would make the row vanish from the seller's own editor, they would re-declare it,
  and their save would 409 naming a row they can no longer see.
- **A repeat dismissal is a 200 replay**, matching `verifyRelation` rather than the content-report
  queue's 409 — the console paints a failed result red, and a correctly-dismissed claim is not an
  error.
- **`SELF_MODERATION_FORBIDDEN`'s message was reworded to "cannot moderate its own claim".** It was
  verify-specific ("cannot *confirm*"), and one arm now serves both actions.
- **The card carries TWO idempotency keys, one per action.** Keys rotate only on success, so a
  failed confirm followed by a dismiss would have sent the dismiss under the confirm's key and the
  user-scoped server idempotency would have replayed the verify response.

All eight verification points passed, including the party-moderator 403 and the audit entry. 2044/2044
backend tests green.

## ⚠️ The seed SCRIPT path has never executed — data is right, code is unverified

The 14 industrial `product_image` rows are in the database because they were **inserted with SQL**,
not because `seed-store-ranking-dev.ts` ran. So `placeholderImageForCategory()` and the
`productImage` insert beside the pricing-tier block are **unverified code** by this repo's own
doctrine, even though the resulting rows are correct (17/17 products, one image each, 5/4/3/2 by
category).

⚠️ **AND IT CANNOT BE CHECKED CHEAPLY.** The script refuses to start without `--reset`, and
`--reset` deletes every `devseed_%` row — including the 367 orders the ranking engine's whole
history depends on. It also ends in a top-level `await main()` and exports nothing, so it cannot be
imported and exercised in isolation. The only honest test is `--reset` on a database where losing
devseed data is acceptable. `seed-store-demo.ts` **did** run, so the 3 furniture products went
through their script path normally.

## Seed images — CORRECTED 2026-08-31

The previous pass gave all 14 industrial listings the same `machinery.avif`. They now get one
labelled placeholder tile per category — freezers, compressors, cartons, instruments — each carrying
the Material Symbol already committed in `public/icons/` and the words "placeholder image".

⚠️ **This is a placeholder, not photography, because there is none to be had.** A sweep of all 350
files under `public/` found exactly one industrial photograph. Dressing a chest freezer in stock
furniture would be a more convincing lie than an obvious grey tile. `altText` carries the real
product title, so the accessible name is exact either way. Cloudinary IS configured and the upload
path works (`seed-commerce-categories.ts` is the precedent) if real assets ever arrive.

### ~~⚠️ The tiles are AVIF, not SVG, and that is not cosmetic~~ — ⚠️ **THAT CLAIM WAS WRONG**

**Retracted 2026-08-31, same day it was written.** It said `next/image` "refuses to optimize SVG…
an SVG tile renders as a broken image", and that
`/images/store/category-placeholder.svg` "**400s today**" on every category with no art of its own.
**Neither is true.**

`next/image` detects a local `.svg` and serves it **unoptimized** rather than routing it through the
optimizer. Proof from the served HTML: `navbar.tsx` renders Material Symbols through
`<Image src="/icons/menu_24dp….svg">`, and the browser receives
`src="/icons/menu_24dp….svg"` — no `/_next/image` anywhere. There are **559** such
`<Image src="…​.svg">` call sites and they have always worked.

⚠️ **THE ERROR WAS THE MEASUREMENT, NOT THE CODE.** The `400` came from requesting
`/_next/image?url=…​.svg` **by hand with curl** — an endpoint no component ever hits for SVG. A
category-card "fix" was written on the strength of it and then reverted; nothing was broken.

The tiles stay AVIF, on the honest reason: an AVIF is resized per breakpoint by the optimizer where
an SVG is passed through whole. A preference, not a correctness fix.

⚠️ **The lesson generalises: do not infer a component's behaviour from curling an endpoint it does
not call.** Read the served HTML.

## Noted, not fixed

`commerce_product_relation.created_at` is plain `timestamp`, not `precision: 3` — migration `0157`
swept 14 columns and **skipped this table**, which is why `listRelationsForModeration` carries a
millisecond-window keyset instead of the plain `eq`/`gt` its siblings use. The hack is verified
correct; changing it now risks a regression for no user-visible gain.


---

## Cache Components opt-outs — 102 routes left

`export const instant = false` plus a boilerplate `// TODO: Cache Components adoption` was applied
**wholesale** during the migration and never revisited. All 18 in `(disclaimers)` and
`(information)` are now clean.

⚠️ **THE NUMBERS IN THIS SECTION WERE WRONG AND ARE NOW MEASURED.** It read "18 removed, 96 routes
left" over a breakdown that summed to **95**, against "114 carried the TODO, 159 carry the opt-out".
Counted 2026-08-29: **147 files carried the opt-out and 101 still carried the boilerplate TODO** —
`(home)` 61, `(studio)` 24, `(admin)` 11, `(auth)` 4, plus `src/app/layout.tsx`.
⚠️ **RE-MEASURED 2026-08-31: the opt-out count is now 155, not 147.** Both numbers drift with every
route added, which is the argument for the command below over any figure written here.

⚠️ **RE-COUNTED 2026-08-31 AND IT IS 102, NOT 101 — `(home)` is 62.** One `(home)` route has been
added since. The number moves whenever a route is added, which is the argument for re-running the
count rather than trusting this line:

```bash
rg -l "// TODO: Cache Components adoption" src/app | wc -l   # 102
rg -l "export const instant = false"       src/app | wc -l   # 155
```

The two totals differ because **53 files already had the boilerplate replaced with a real reason**
(155 − 102) in the `cart/page.tsx` style, which is the finished state rather than an outstanding
one. That figure read 46 while the opt-out count was stale.

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

**The remaining 102** are `(home)` 62, `(studio)` 24, `(admin)` 11, `(auth)` 4 and the root layout — and those genuinely
read cookies or a session, so each needs its dynamic read moved behind a Suspense boundary rather
than the opt-out simply deleted. `cart/page.tsx` is the model for the ones that must KEEP it: it
replaced the boilerplate with the real reason ("the cart is a client-query island behind a session —
its data never reaches the server render at all"), which is what a finished route looks like whether
the flag stays or goes.

**AND FOUR ROUTES ARE ALREADY IN THE FINISHED STATE, which is worth knowing before anyone counts
this as 102 units of work.** `(admin)`'s `site-audits`, `profile-reports`, `reports` and `anime-hero`
carry `export const instant = false` with NO boilerplate TODO above it — they never entered the
backlog, and they are what a done route looks like in the group that has the most left.

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

2. **The `planned` Studio routes that are left — TWO, not six.** ⚠️ **DO NOT INHERIT A COST FROM
   THIS LINE WITHOUT CHECKING IT** — it has now been wrong about four separate routes, and the
   word "six" was itself one of them. `copyright`, `pitches` and `team` graduated; `subtitles`,
   `support`, `learn` and `feedback` were ruled out. What is left is **`earn`** (blocked on a money
   rail) and **account-level delegation** (needs a product decision first), which is what the
   At-a-glance already says.

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

    ⚠️ ~~**AND ITS SCAN DECISION IS STILL UNMADE.**~~ **IT WAS MADE AND SHIPPED** — unscanned,
    **201** not 202, no `state` column, and no copy claiming the file is checked; the entry a few
    items up states the decision and proves it live. The trade-off below is kept as the reasoning,
    not as an open question. Only the scanner _adapter_ is reusable;
    `scanEncryptedDocument`, `sweepPendingDocumentScans` and the job all name
    `commerce_encrypted_document`, its `state` enum and its envelope columns, and the payload has
    no table discriminator. `video_document`, the precedent, is **not scanned at all**, and the
    only working scanner is an EICAR-only fake. Either add a second scan service, job and `state`
    column — or ship unscanned and answer **201**, with no copy claiming the file is checked.

    ⚠️ ~~**The cascade cleans rows, not bytes.** `deleteProduct` must delete the objects
    explicitly.~~ **DONE AND VERIFIED AGAINST OBJECT STORAGE ITSELF** — deleting the listing left
    **0 objects in the bucket and 0 rows**, checked in the bucket rather than through a delivery
    URL. The principle still holds for the next such cascade: SQL cannot reach object storage.

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

## ~~⚠️ The frontend is far behind the backend — ~90 routes have no caller~~ — **CLASS CLOSED**

⚠️ **THE OLD HEADING SAID "~90 ROUTES HAVE NO CALLER". THE NUMBER IS NOW ZERO**, by this file's own
measuring instrument: both audit loops in §Verification print nothing (re-run 2026-08-31). The
section is kept as the record of how the class was closed, and for the second lesson below, which
is the part worth carrying. **Two real remainders survive but belong to a different class** — a
write waiting for a *read*, not for a caller: service-offering coverage and `viewer.canDelete` on
Q&A.

Six instances of one defect class were closed one at a time (`productId` on an RFQ goods line,
`serviceOfferingId`, `pitchVideoId`, `commerce_product_highlight`, `commerce_product_variant`,
`variantNameSnapshot`). A systematic sweep on 2026-08-29 found the class is not a punch-list — it is
the shape of the whole gap. **Do not treat these as oversights to fix opportunistically; each is a
feature-sized build, and several are user-visible today.** Ranked:

⚠️ **AND ONE OF THEM TURNS OUT NOT TO BELONG TO THE CLASS AT ALL.** Every entry here reads as "the
route exists, write the wrapper" — ⚠️ **and the paragraph that follows had one of its own reasons
WRONG; it is kept because the correction is the lesson.** It claimed **product relations cannot be
wired that way**, because its
replace-set has no faithful owner-side read to seed it. Wiring it would delete moderator-curated
rows. The class is really TWO classes: writes waiting for a caller, and writes waiting for a READ.
Service coverage is the other member of the second, and both are backend asks. Check which one an
entry is in before costing it — the audit loop cannot tell them apart, because neither has a
wrapper to report as uncalled.

⚠️ **THE WHOLE CLASS IS NOW CLOSED, AND THE SECOND KIND IS THE LESSON WORTH KEEPING.** Every entry
below has shipped. Three of them — pathway candidates, RFQ invitation names, product relations —
were not "write the wrapper" tasks at all: each needed a small backend READ before its write could
be driven honestly, and in each case the read was a join onto data the query already had. **Before
costing one of these, ask which kind it is: a write waiting for a caller, or a write waiting for a
read.** The uncalled-wrapper audit cannot tell them apart, because neither has a wrapper to report.

The superseded note, kept because its framing was half wrong and the correction matters: Seven of the ranked entries have shipped;
what remains is **RFQ invitations** (a genuine gap, small) and **product relations**, which is in
the read-first class and must not be wired until the backend has an owner-side read. Pathway
authoring turned out to be in BOTH classes at once — it needed a caller AND a read, and the read
was added as part of shipping it.

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

    ⚠️ ~~**A REAL BACKEND BUG FOUND WHILE VERIFYING.**~~ **FIXED, in `qatoto-backend`.** It was
    deterministic: retire a slot, then save again, and the write answered **500 forever** on that
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

    **That is the whole mechanism, proven by falsification rather than inferred**, and it is reachable
    by the most ordinary sequence there is — remove a slot, save, edit something else, save.

    **The fix is one clause**, in `replaceProductCustomizationOptions`: a retired row now gets
    `position: options.length + retiredIndex` instead of keeping its parked value.
    ⚠️ **`replaceProductVariants` NEVER HAD THIS** — I assumed it shared the bug because it shares the
    parking trick, and it does not: it already sets `position: variants.length + index` when it
    retires. It was the template, not a second patient. Checking before fixing is what kept that from
    becoming a needless second edit.

    **Verified against the running server, same sequence that failed:** the retired row now lands at
    `pos=1` rather than `1004`, and the previously-fatal 2-option save answers **200 three times in a
    row**, with the row reviving to `active`. Then seven consecutive retire/revive cycles across
    changing slot counts — every one 200, positions unique and contiguous throughout. Probe listing
    deleted; the seeded chair's two slots confirmed byte-identical afterwards.

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

3. ~~**Seller profile writes** — all 11 `commerce-seller-profile` routes.~~ **SHIPPED — nine seller
   writes plus the one seller read, as six new sections on `/studio/factory-profile`, now "Your
   company profile". Frontend only, no migration.**

    ⚠️ **IT EXTENDED THE EXISTING PAGE RATHER THAN ADDING ONE, because that page writes the SAME
    `commerce_seller_profile` row.** `PUT …/factory-terms` already answered the whole
    `SellerDeclaredProfile` and the editor fed it to `MutationNotice` and threw the four arrays away
    — they were arriving on the seller's wire already. Two studio pages over one row would be the
    "second place for them to disagree" that file argues against three separate times.

    **Two defects it closed on the way in.** The page had **no sidebar entry at all** — it needed a
    `?factorySlug=` only the buyer-facing directory could supply, so the one page a seller describes
    their company on was reachable only by going through the storefront first; the route now resolves
    the viewer's own active membership when the parameter is absent, and the parameter still wins when
    present. And `site-roadmap.ts` already promised "lines, **certifications** and minimums" — a
    sentence that was false until this shipped.

    ⚠️ **"ALL 11 ROUTES" WAS IMPRECISE AND THE SHAPE MATTERS.** It is **9 seller writes + 1 seller
    read + 1 ADMIN write**. `GET …/certifications` is a read — and it exists for four FIELDS rather
    than more rows (`state`, `decisionReason`, `submittedAt`, `decidedAt`); measured live it returns
    the same 7 rows as the public read. `POST /commerce/admin/certifications/:id/decision` is a
    moderator route with no caller and ~~**no home in the admin console**, so a seller can now submit
    and nobody can decide~~ — **that was true when written and was closed by `8fc70f1`; see the
    struck heading immediately below.** Its own slice.

    ~~**SIZED 2026-08-31, NOT BUILT — and it is the largest LIVE gap on the site.**~~ **BUILT, in
    commit `8fc70f1`, and this entry was left standing for four days after it stopped being true.**
    All five sized pieces exist: `src/app/(admin)/admin/certifications/page.tsx`,
    `src/components/admin/certifications/certification-review-page.tsx`,
    `src/hooks/store/admin-certifications.ts`, `src/lib/store/admin-certifications.api.ts`, and the
    nav entry at `admin-sidebar.tsx`. `8003a7c` then added audited evidence downloads and moved the
    queue onto a paginated keyset list. ⚠️ **A "NOT BUILT" ENTRY THAT SURVIVES ITS OWN BUILD IS THE
    MOST EXPENSIVE KIND OF STALE**, because the next reader costs it, plans it, and only discovers
    the console on the way to writing a second one.

    ⚠️ **AN ADMIN ROUTE NEEDS NO ROADMAP EDIT — unlike a studio route, which needs six across four
    files.** `site-roadmap.ts:18` says in as many words that the `/admin` console is out of scope
    for the roadmap because it is staff-gated. Do not go looking for the drift loop here.

    ⚠️ **THE MOBILE BAR IS CAPPED AT SIX TABS**, so a new console page is desktop-sidebar only —
    `admin-mobile-bottom-nav.tsx` omits `site-audits` deliberately and each omitted entry carries a
    comment saying so. Follow that, do not grow the bar.

    ⚠️ **THE ROUTE CARRYING NO CAPABILITY MIDDLEWARE IS NOT A HOLE — DO NOT "FIX" IT.** Checked
    against the code: `commerce-seller-profile.routes.ts:141-148` mounts only `requireAuth`, and
    `moderate_commerce` is demanded by the SERVICE inside the write transaction
    (`commerce-seller-profile.service.ts:1842`, `requirePlatformCapability`). The routes file's
    header at line 26 states this is the posture `commerce-content-reports.routes.ts` established,
    so the check and the write cannot drift apart. Adding middleware would duplicate the gate, not
    close one.

    ~~⚠️ **AND THERE IS STILL NO WITHDRAW OR DELETE ROUTE** for a certification.~~ **THERE IS NOW**
    — `withdrawOrganizationCertification` at `src/lib/store/factory-profile.api.ts:366`, against a
    real backend route, shipped as the seller half of `8fc70f1`. `withdrawn` is reachable, so a
    probe against this surface is no longer permanent.

    ⚠️ **THE NINE WRITES DO NOT SHARE A RESPONSE SHAPE, AND ASSUMING THEY DID WAS A REAL BUG I
    SHIPPED INTO THE WRAPPERS AND THEN CAUGHT BY PROBING.** `factory-terms` answers the whole profile,
    so the rest look like they should. They do not:

    ```
    PATCH …/seller-profile        -> the whole SellerDeclaredProfile
    PUT   …/site-access           -> { rows }
    PUT   …/stakeholders          -> { rows }
    PUT   …/capabilities          -> { rows }
    PATCH …/media/reorder         -> { media }      (not { rows } — the one that differs)
    POST  …/media                 -> ONE media row
    POST  …/stakeholders/:id/photo-> ONE stakeholder row
    DELETE …/media/:mediaId       -> { deleted: true }
    POST  …/certifications        -> ONE certification
    ```

    Seven of nine were wrong. **A mismatch is not a soft failure**: the schema is `.strip()` over
    required keys, so it surfaces as a refused write that actually succeeded on the server. Reading
    the controller would have caught it; assuming from a sibling did not.

    ⚠️ **THREE COLLECTOR SEMANTICS, ONE PAGE, AND THEY MUST NOT BE COPIED BETWEEN SECTIONS.** The
    scalar PATCH is SPARSE — an omitted key is untouched, so the form sends explicit `null`s or
    clearing a value becomes impossible. Site access and capabilities are **delete-then-insert with no
    stable identity**: omitting a row destroys it and every surviving row gets a NEW id, so nothing
    may cache one. Stakeholders preserve identity through an echoed `id`, which is what keeps an
    uploaded portrait attached — ⚠️ **and a duplicate id silently collapses two rows into one**, so the
    form dedupes because the server will not.

    **Proved live, with the profile captured first and restored after:** an empty site-access `PUT`
    left **no retired row** (hard delete, unlike a variant); re-saving minted a **new id**, proving
    delete-then-insert; a stakeholder re-saved WITH its `id` kept it and re-saved WITHOUT one got a
    new row, which is exactly the orphaning case; duplicate `capabilityKind` → **409**; an incomplete
    media reorder → **409 "must list every current image exactly once"**; a missing `Idempotency-Key`
    → **400**. ⚠️ Note 13 site-access rows is a **422** from Zod's `.max(12)`, not the service's 409 —
    the cap is enforced twice and the client only ever sees the outer one.

    ⚠️ **RESTORATION WAS CONTENT-FOR-CONTENT, NOT BYTE-FOR-BYTE, and the difference is worth stating.**
    Every scalar and every row's content came back identical, but the `siteAccess` and `stakeholders`
    ids differ — the first unavoidably (delete-then-insert always mints new ones), the second because
    the no-echo case was deliberately tested. Nothing references either: the stakeholder's `photoUrl`
    was null, so no stored asset was orphaned.

    ⚠️ **ONE PROBE WAS DELIBERATELY NOT RUN.** A certification submit could not be reverted:
    ~~**there is no withdraw or delete route**~~ — **there is now**, `withdrawOrganizationCertification`
    (`factory-profile.api.ts:366`), so this constraint no longer applies and the probe is runnable.
    `withdrawn` was unreachable in the enum at the time. The submit wrapper's shape was confirmed from the controller instead.

    **Three things recorded, not fixed:**

    - ⚠️ ~~**`DELETE /products/:id` answers a raw 500 on a listing bought with customization.**~~
      **FIXED 2026-08-31, and it was much worse than a 500.** Twelve foreign keys point at `product`
      with `ON DELETE restrict` — orders, completions, reservations, reviews, questions, inquiries,
      RFQ lines, sample credits, relations (both ends), pathway anchors and slot candidates — so the
      refusal was reachable from any listing anyone had ever ordered or reviewed, not just a
      customized one.
      ⚠️ **AND THE THREE ASSET SWEEPS RAN BEFORE THE ROW DELETE.** A refused delete had already
      destroyed every Cloudinary image, every highlight image and every document object, then rolled
      back — leaving the listing alive with no bytes and, at `imageCount` 0, permanently
      unpublishable. Measured on the demo data: **16 of 17 products** carried an order line and
      would have hit it. Now a preflight refuses **above** the sweeps with `PRODUCT_IN_USE` → **409
      naming what holds it** ("orders", "reviews", "pathways" are different problems with different
      remedies). Verified live: images before 1, after 1, row intact, `blocked by: orders`.

    - ⚠️ **`standardCode` is unreachable from any client.** The service writes the column, but the
      route's schema has no such key and is `.strict()`, and the controller never passes one — so it
      is **always null**. The manufacturer directory's `certification` filter therefore can never
      match and every certification lands in `otherCertifications`. **This is what §9 above was
      describing when it said `standardCode` is "the part no live payload has set" — it is a backend
      gap, not a missing frontend call.**
    - **There is no seller-side read of `declaredProfile`.** All three callers of
      `loadSellerDeclaredProfiles` are public browse reads gated on `tradeState = 'active' AND
visibility = 'public'`, so an organization that is private or not yet active cannot open the
      editor at all. The page says so rather than rendering empty forms over an unknown.
    - **`STORE_BACKEND_STRUCTURE.md` A13 says "ten routes"; there are 11** — third documentation
      strike this session, after §21.1's "no migration" and A23's hypothetical-written-as-history.

4. ~~**What is left of the class.**~~ **THE CLASS IS CLOSED — all nine shipped.** Every entry that
   was "a backend write with no frontend caller" now has one. Three of the nine needed a small
   backend READ added first (pathway candidates, RFQ invitation names, product relations), which is
   the pattern worth carrying: **a write with no faithful owner-side read is not a frontend task
   until the read exists.**

    ~~**The moderator half of product relations.**~~ **SHIPPED — `/admin/product-relations`, plus
    the list read it never had.** `POST …/product-relations/:id/verify` had shipped with nothing
    that hands out a `relationId`, so no moderator could ever confirm a claim — which meant the
    `sourceKind` the buyer's companions sheet renders could only ever say "the seller says so".
    Third instance of that pattern in this module, by the backend doc's own count.

    ⚠️ ~~**THIS LIST CANNOT BE DISMISSED FROM.**~~ **IT CAN — dismissal SHIPPED 2026-08-31 as
    migration `0158`.** The reasoning below was correct about the schema as it stood: there was no
    review state beside `sourceKind`, and `commerce_product_relation_verified_ck` tied attribution
    to `moderator_curated`. The answer was `dismissed_at` + `dismissed_by_user_id` — orthogonal to
    `sourceKind`, so provenance survives the verdict. The queue now drains in both directions and
    a dismissal suppresses the claim on all three buyer surfaces.

    ⚠️ **CONFIRMING IS IRREVERSIBLE FOR BOTH PARTIES**, so the console confirms first. Nothing sets
    the source kind back, and the seller cannot delete a curated row either — their replace-set is
    scoped to their own declarations. Probe cleanup needed direct SQL for exactly this reason.

    ⚠️ **A KEYSET BUG FOUND BY THE "no duplicate, no skip" TEST, AND IT IS A CLASS WORTH KNOWING.**
    The sibling queues use `gt(sortColumn, cursor) OR (eq(sortColumn, cursor) AND gt(id, …))`, which
    is correct FOR THEM because their sort columns are written from JavaScript and are therefore
    millisecond-precise, so `toISOString()` round-trips exactly. `commerce_product_relation.created_at`
    defaults to Postgres `now()` — **microsecond** precision, `…538694` — so the cursor's `…538Z`
    never satisfies `eq` and always satisfies `gt`, and **page 2 returned page 1's row**. Measured,
    then fixed with a millisecond window (`>= next ms`, or same ms with a larger id). Proved: the
    two demo timestamps ended `538694` while the certification queue's end `714000`, `750000`,
    `555000` — all JS-written, which is why that queue never hit this.

    ⚠️ **THE LIST DELIBERATELY DOES NOT USE `resolveEligibleProductCardsByIds`.** That helper
    applies `publicProductEligibility` and silently DROPS a target that is not publicly visible —
    so a seller could hide a claim from review by unpublishing what it points at, and the page would
    under-fill and corrupt `hasMore` on the way. Two aliased inner joins instead, with the target's
    `status`/`moderationState` surfaced. **Proved live**: unpublishing the lamp left the claim
    listed and flagged `draft`, while the buyer-facing companions read correctly dropped it.

    ⚠️ **A SECOND CONFIRM IS A 200, NOT A 409.** The service returns the existing row for an
    already-curated relation, so `ALREADY_VERIFIED` and its 409 mapping are a dead branch no client
    will see — no "already confirmed" error path was built. Verified.

    Also verified: a non-moderator gets **403 naming `moderate_commerce`** rendered as `restricted`;
    a fabricated cursor gets a new `INVALID_CURSOR` **422** rather than a 500; the confirmed claim
    left the `seller_declared` list and appeared under `?sourceKind=moderator_curated`; the buyer's
    companions read flipped that row to `moderator_curated`; and the org audit trail gained a
    `product_relation_verified` entry.

    ~~**Recorded, not built:** `verifyRelation` has **no self-moderation guard**.~~ **BOTH SHIPPED
    2026-08-31** — `SELF_MODERATION_FORBIDDEN` → 403 (verified four ways, including on the replay
    path), and the `(source_kind, created_at, id)` index landed with migration `0158`, partial on
    `WHERE dismissed_at IS NULL`. See the SHIPPED sections near the top of this file.

    ~~**RFQ invitations.**~~ **SHIPPED — a provider picker on the RFQ detail page, plus a
    one-join backend read.** And it surfaced a live break in shipped code before anything new was
    written.

    ⚠️ **"OPEN FOR QUOTES" AND "CLOSE TO NEW QUOTES" WERE BOTH DEAD BUTTONS.** `useOpenRfq` and
    `useCloseRfq` called their wrappers with no options, and `sendJson` mints no header — but both
    routes carry `idempotency({ required: true })`. **Reproduced before fixing**:
    `POST /commerce/rfqs/:id/open` with no header is
    `400 This request requires an Idempotency-Key header.` `rfqs.api.ts`'s own header had recorded
    that these two need a key; only the hooks never caught up. Both now mint one per attempt, and
    the same call reaches business validation instead.

    ⚠️ **THE INVITATION LIST RENDERED RAW UUIDs**, with a comment calling a display name "a
    one-field backend ask". It was: the row's `providerOrganizationId` is already an FK to
    `commerce_organization`, so one `innerJoin` adds `providerDisplayName` and `providerSlug` — no
    new table, no N+1. The list now names providers and links to them.

    ⚠️ **A PRODUCT-ONLY RFQ CAN INVITE NOBODY, SO THE CONTROL IS ABSENT RATHER THAN DISABLED.**
    Eligibility needs a VERIFIED provider-kind link among the kinds the RFQ's **service lines**
    name; with no service lines that set is empty and `inArray(…, [])` matches nothing, so every id
    is refused. The picker also narrows the directory to the required kind and filters out providers
    not `acceptingRequests` — because **the whole batch is one transaction and the 409 names no
    id**, so one ineligible pick would roll back the lot without saying which.

    ⚠️ **`pending` IS AN UNREACHABLE STATE.** The only INSERT writes `state: "sent"` with `sentAt`
    set; `read`, `withdrawn` and `expired` are written by nothing at all. The label map calls
    `pending` "Not sent yet" — a label for something that cannot occur. No "send" control was built
    for it.

    ⚠️ **AN INVITATION CANNOT BE UNDONE** — no withdraw, cancel or DELETE route anywhere in the
    module, so the copy says so before the press. **Proved live**: invite → 201 with the provider's
    NAME; the same provider again → `409 Provider is already invited to this RFQ.`; on a draft →
    `409 Providers can only be invited to open RFQs.`; and the invited provider's own queue then
    contained the request.

    ~~**Pathway authoring.**~~ **SHIPPED — `/studio/pathways`, its composer and
    `/admin/pathways`.** Nine routes that had no caller at all: `grep "commerce/pathways" src/`
    used to return nothing. Two backend changes went with it, and both were enabling rather than
    optional.

    ⚠️ **A DRAFT'S CANDIDATES COULD NOT BE RESOLVED TO PRODUCT NAMES, SO THE EDITOR WOULD HAVE
    SHOWN UUIDs.** The projection was `{ id, productId, variantId, rank }` and NO read anywhere
    turns a product id into a title for an arbitrary caller: the public read is slug-only,
    `GET /products/:id` is owner-scoped and 404s on somebody else's listing — which is exactly the
    case that matters, because `ownCandidateShare` exists precisely so a set can mix other
    people's products with your own — and the public pathway read serves `active` sets only.
    `projectPathway` now left-joins `product` and `commerce_product_variant`. **Same answer this
    file already gave for service coverage and product relations: when a write has no faithful
    owner-side read, add the read.**

    ⚠️ **AND A REJECTED SET COULD NEVER BE RESUBMITTED — a 500, every time, and it killed the one
    recoverable path moderation has.** `store_pathway_review_ck` asserts
    `reviewed_at IS NULL OR state IN ('active','rejected')`. A rejection stamps `reviewed_at`;
    `submitPathway` then moved the row to `pending_review` **without clearing it**, violating the
    constraint and escaping as an unmapped 500. So reject → fix → resubmit was dead on arrival,
    and nothing had noticed because nothing had ever called the route. `submitPathway` now clears
    `reviewedByUserId`, `reviewedAt` and `reviewNote` — last round's verdict has no business
    sitting on a set awaiting a new one. **Found by doing it, not by reading it.**

    ⚠️ **SAVING SLOTS CASCADE-DELETES EVERY CANDIDATE UNDER THE PATHWAY, AND THIS IS THE WHOLE
    SHAPE OF THE EDITOR.** Slots are hard delete-then-insert with positional identity and no `id`
    in the body (a unique index on `(pathwayId, siblingOrder)` makes an in-place reorder collide
    with itself), and the candidate FK is `onDelete: "cascade"`. **Measured, not reasoned about**:
    three slots each holding one product, rename ONE slot's label, re-save slots alone → **all
    three slots came back empty**. So there is exactly one "Save the set" action, which re-sends
    every slot's candidates against the freshly-minted ids, and **no per-slot save button exists
    or may be added**. Local rows are keyed positionally; a slot id is dead the moment a save
    lands.

    ⚠️ **THE WRITE LIMITER IS 30/MINUTE AND A SAVE COSTS `1 + slotCount` REQUESTS**, with no
    transaction spanning them. `savePathwayPlan` runs sequentially and reports how far it got, so a
    half-written plan is stated rather than silent. A partial save cannot be published by accident:
    submit refuses a required slot with no candidates.

    ⚠️ **PUBLICATION IS TERMINAL AND THE UI SAYS SO BEFORE THE PRESS.** No delete, no withdraw, no
    unpublish; `retired` is in the enum and nothing sets it. Verified live: a published set answers
    **409 "A pathway in state active cannot be edited."** for ever. `endsAt` is the only lever that
    can ever retire one, and it can only be written while the set is still editable — so the
    composer surfaces it during authoring rather than offering it too late to matter.

    **Two refusals found by probing that no doc mentions.** A slot's `quantity` must reach its
    candidate's **minimum order quantity** (a chair with an MOQ of 10 in a slot asking for 1 is a
    422) — the picker now carries the MOQ and the editor warns before the save; and a product with
    variants must name one (**"Choose a variant for products that have them."**), which is why
    picking a product is a two-step act rather than one.

    Other things worth keeping: `ownCandidateShare` is **surfaced, never acted on** ("a bicycle
    maker legitimately supplies most of a bicycle kit"), and `null` is not zero — it means nothing
    was measurable, including a fully-derived set. It appears on the queue listing only, never on
    the moderate response. This is also **the first live catalog search in the frontend**:
    `searchStore` existed with no hook and two server-side callers, and needs
    `documentKind: "product"` or it returns organizations too.

    ~~**Image reorder** and the **product view-beacon**.~~ **SHIPPED.** Reorder gave sellers a way
    to change a listing's cover photo for the first time — proved that sending only the
    pre-existing ids after an upload is a 422, which is why the upload loop now captures the ids it
    was discarding. The beacon shipped with a privacy-policy disclosure, a panel card and a
    `productPagesYouLookedAt` export section, because a signed-in product view is personal data and
    the Art. 15 export had eight sections and none of them was this one.

    ~~**Commerce moderation.**~~ **SHIPPED — all five routes, frontend only, no migration.** The
    reporter half (`POST /commerce/reports`) mounts on the product page, a review, a question, an
    answer and a company storefront; the staff half is `/admin/commerce-reports`, one page with a
    report queue and a moderation-action log.

    ⚠️ **IT REPLACED A DEAD CONTROL RATHER THAN ADDING A NEW ONE.** `product-detail.tsx` had linked
    `/store/report` since it shipped and **there is no such route** — it fell through the legacy
    `store/[...slug]` catch-all to a 404. The busiest page in the store had been offering a report
    button that went nowhere, which is the same defect the inert "Send inquiry" was deleted for.

    ⚠️ **THE CONFIRMATION COPY BRANCHES ON TARGET KIND, AND FLATTENING IT WOULD MAKE IT FALSE.**
    A review, question or answer auto-hides once **three distinct reporters** have open reports
    against it, in the same transaction as the third insert; a product and an organization never do
    ("delisting a seller's listing is a commercial action against their livelihood"). **Proved
    live**: three distinct users on one seeded question flipped it to `hidden_pending_review` with a
    `content_hidden` action whose `actionSource` is **`automatic`** and whose note reads
    "Automatically hidden after 3 distinct open reports". The video sheet's line — "nothing here
    happens automatically" — is true for video and would be a plain lie on a review.
    ⚠️ **The threshold NUMBER is deliberately never printed**: "three reports hides this" is a
    griefing recipe, and the copy says "several different people", which is true at any value.

    ⚠️ **A SELF-REPORT IS `422`, NOT `403` — AND 422 IS ALSO THE SCHEMA-FAILURE STATUS.** Measured
    side by side in one run: an empty `detailText` answered `422 "Please check the highlighted
    fields."` while reporting your own organization answered `422 "You cannot report your own
    organization's content."` So a sheet that renders 422 as a field error tells a seller their form
    is broken when the answer is a rule. The sheet prints the backend's sentence.
    ⚠️ And the guard only fires with an **active organization** — the first attempt returned **201**
    because `activate` had been called without its required `Idempotency-Key` and the session
    therefore had no active org. The report route itself needs none, which is why it still worked.

    ⚠️ **ONE DECISION CLOSES EVERY OPEN REPORT ON THE TARGET, WHICH IS WHY THE HOOK INVALIDATES THE
    ROOT AND NEVER ONE FILTER.** Proved twice, in both directions: actioning one of two open reports
    on the seeded chair closed the other one too, and dismissing one of three on a question closed
    the remaining two (they answered `409 "already resolved"`). A console that invalidated
    `status=open` alone would leave the `actioned` list on screen as a lie.

    ⚠️ **RESTORE IS OFFERED ON `actioned` AND ON A `content_hidden` LOG ROW, NEVER ON `dismissed`.**
    Nothing in the projection says whether a target is currently hidden — there is no visibility
    field — so `actioned` is the closest honest proxy. A dismissal already un-hides, so restoring
    there would write a permanent record of an un-hide that never happened. `reasonNote` is
    **required** (empty is a 422) because an un-hide nobody justified is one nobody can review.
    The log row matters on its own: it is the ONLY surface where an `automatic` hide is visible or
    reversible, since nobody is notified and no audit entry names a person.

    ⚠️ **`GET /commerce/admin/moderation-actions` ACCEPTS `status` AND SILENTLY IGNORES IT** — it
    shares a query schema with the queue and then reads only `targetKind` and `cursor`. The log tab
    offers no status control, because one would change the key, refetch and return identical rows.

    ⚠️ **BOTH QUEUES ARE `asc(createdAt)`, SO THE BUTTON SAYS "Load newer".** Confirmed in the live
    payload (Aug 07 row first). `certification-review-page.tsx` says "Load older" and is right for
    ITS newest-first default; copying that label here points the reader backwards.

    ⚠️ **`/community/admin/content-reports` IS A DIFFERENT MODULE WITH A NEARLY IDENTICAL NAME** and
    was already wired. It is `moderate_content` over forum threads and cofounder profiles; this is
    `moderate_commerce` over listings, reviews, questions, answers and companies. Do not fold either
    into the other — §17.4 refuses to merge those shifts.

    **Everything reverted after the run**: the chair is back to `approved/active/selling`, the
    probed question to `visible`, and the open-report queue to **0**. ⚠️ **The probe rows were
    DISMISSED rather than deleted, deliberately** — `commerce_moderation_action` is a hash-chained
    audit trail with an FK to the report it records, so deleting a labelled probe row would falsify
    a record of something that really happened. Reverting the STATE is the revert; erasing the
    history is not.

    ⚠️ ~~**SIZED 2026-08-31 AND NOT BUILT — the next two passes, in this order.**~~ **ALL OF IT
    SHIPPED, and this block stood for hours after it stopped being true** — image reorder and the
    view beacon (`6367d04`), pathway authoring (`ea8c4e5`), RFQ invitations and relations
    (`341461f`). Each is struck as SHIPPED earlier in this very section, so the two halves
    contradicted each other. Kept only for the backend contracts quoted below, which are still
    accurate and still worth reading before touching these routes. **This is the exact failure this
    file warns about a few hundred lines up: a "NOT BUILT" entry that survives its own build is the
    most expensive kind of stale.**

    - **Image reorder + the product view-beacon — one small pass, both safe.**
      `PATCH /products/:id/images/reorder` takes `{ imageIds: string[] }` (`.min(1)`, `.strict()`),
      answers the whole `PublicProduct`, and **needs no `Idempotency-Key`** (optional there).
      ⚠️ **IT MUST BE THE COMPLETE ID SET — a partial list is `IMAGE_ORDER_MISMATCH` (422)** — and
      **index 0 is the main image**, so a reorder control is also the "make this the cover" control.
      Unlike relations, the owner-side read EXISTS: `GET /products/:id` returns `images[].position`,
      so the form can show what it is about to replace. It belongs in the wizard's media step.
      `POST /store/products/:productSlug/view-beacon` is the twin of the video beacon: **no auth**
      (`attachOptionalUser`), no idempotency, `{ dwellSeconds: int 0..3600, viewSource }` where
      `viewSource` is one of `product_detail | search | rail | pathway | companion | unknown`.
      ⚠️ **It answers `200`, NOT `202`**, with the SERVER-CLAMPED `{ dwellSeconds, isCountedView }`
      — so the client renders the server's number or nothing, never its own. It takes the **public
      slug**, unlike the relations route's internal id.

    - **Pathway authoring — the big one, and the only remaining surface with a COMPLETE owner-side
      read.** Nine routes on `commerce-merchandising.routes.ts`, all
      `idempotency({ required: true, scope: "user" })` — user scope deliberately, so a merchandiser
      with no organization is not 403'd. `GET /commerce/pathways/mine` returns full projections
      **including slots and their candidates**, so both replace-sets can be hydrated and neither has
      the relations trap. Create is a **201**; the rest are 200.
      ⚠️ **`slug` IS IMMUTABLE — `UpdatePathwaySchema` has no `slug` key**, and the update refines to
      "provide at least one field", so an empty patch is a 422.
      ⚠️ **ART DOES NOT TRAVEL IN THE BODY.** `heroImageUrl`/`cardImageUrl` were removed by migration
      `0091`; images go through `POST …/images/:imageSlot` (`hero` | `card`) as multipart under the
      field name **`image`**, 8 MB, re-encoded to AVIF server-side.
      ⚠️ **`state`, `submittedAt`, `reviewedAt` AND `sourceKind` ARE SERVER-OWNED** and every body is
      `.strict()`, so sending one is a 422 rather than an ignored field. A slot carries at most 12
      candidates and a pathway at most 100 slots.
      It needs a studio surface plus an `/admin/pathways` moderation queue
      (`ModeratePathwaySchema` is `{ decision: "publish" | "reject", reviewNote? }` and **a rejection
      must say why**).

    ⚠️ **RFQ invitations are the fifth and are NOT blocked, but read this first.**
    `POST /commerce/rfqs/:rfqId/invitations` is append-only (no replace-set trap) and the RFQ detail
    read already returns `invitations[]`. Two catches: the path param is a **strict `z.uuid()`**, and
    the guard is `requireActiveBuyerCommerceOrganization` — the STRICTER one, so an org whose trade
    state is still pending gets a 403 here even though it can draft an RFQ. And the projection
    carries **no provider display name** (`rfqs.schemas.ts:142` already says so), so an invitation
    list cannot be labelled from that read alone — the picker has to source names from the public
    provider directory.

    ~~⚠️ **PRODUCT RELATIONS IS THE ONE THAT MUST NOT SIMPLY BE WIRED.**~~ **SHIPPED — a
    "Related products" wizard step, and it lit up a surface that had been dark since it was built.**
    `similar-and-compare.tsx:31-35` returns `null` when every group is empty ("two buttons that open
    empty sheets is worse than no buttons"), so the compare tray and both sheets rendered nothing on
    every listing on the site, because nothing had ever written a `seller_declared` relation.

    ⚠️ **AND I HAD ONE OF MY OWN REASONS WRONG, WHICH IS WHY THIS ENTRY IS REWRITTEN RATHER THAN
    TICKED.** I wrote that wiring it "downgrades a curated relation to a seller claim" and would
    "delete rows". **The delete half was false.** The service is `replaceSellerDeclaredRelations`
    and its predicate is `and(eq(fromProductId, …), eq(sourceKind, "seller_declared"))`, with a
    comment saying a seller "must not be able to erase a reviewer's decision or the co-occurrence
    graph by sending a shorter list". **Proved live**: a curated edge was promoted via the verify
    route, the seller then saved a list omitting it, and it survived. The write was always safe.
    What was true is that the PUBLIC companions read cannot rebuild the payload — 12 per kind, mixed
    source kinds, ineligible targets dropped — so the conclusion held on one leg, not two.

    **The read that unblocked it**: `loadOrganizationProduct` now returns a `relations` array
    carrying `sourceKind` and the target's title and slug, following the `highlights` pattern.

    ⚠️ **RE-SENDING A CURATED EDGE WAS AN UNMAPPED 500, AND IS NOW A 409.**
    `commerce_product_relation_edge_uidx` is `(from, to, relationKind)` and **omits `sourceKind`**,
    while the delete is scoped to `seller_declared` — so a curated row survives the wipe and then
    collides with the seller's re-insert. The `23505` escaped uncaught. Reproduced, then mapped to
    `RELATION_ALREADY_CURATED` → **409** with a sentence a seller can act on. The editor also shows
    curated and derived rows **read-only** and excludes them from the payload, so the refusal is
    unreachable from our own UI — but the client is untrusted and a foreseeable input must not be a
    500.

    Also verified: a self-relation is a 422, an invisible target is a 422 **naming the id**, and an
    empty save really does clear the seller's own declarations while leaving the curated one alone.

    ~~**provider offering edit/submit/coverage**~~, ~~**logistics writes**~~ and
    ~~**dispute-opening**~~ **SHIPPED — the three dead ends, frontend only, no migration.** Each was
    a wall a real user hit: a provider could create a listing and never publish it, nothing on the
    platform could create or advance a shipment, and a buyer could read disputes they had no door to
    open.

    - **Offerings**: `PATCH /service-offerings/:id` and `POST …/submit`, on the row in
      `/studio/services`. Send-for-review is offered on `draft` and nowhere else — `pending_review`
      is already queued and the two moderator states are refused by the route. **Submitting is not
      publishing**: the row comes back `pending_review` and keeps its no-public-link rule.
    - ⚠️ **COVERAGE WAS DELIBERATELY NOT BUILT, AND IT IS A BACKEND GAP.**
      `PUT /service-offerings/:id/coverage` replaces the WHOLE lane list, and **no read returns a
      provider's current lanes** — `offerings/mine` answers the raw offering row and the public
      detail read exists only for `active` listings. A form that cannot show what it is about to
      replace deletes a provider's lanes the first time they add one. **No wrapper was written
      either** — an uncalled one is unverified code, which the hook audit catches by design. **That
      is the same gap the seller profile had** (writes with no owner-side read), fixed there by
      adding the GET; the fix here is the same, and it is a backend task.
    - **Shipments**: `POST /orders/:orderId/shipments` and `POST /shipments/:id/events`, on the
      order detail page's fulfilment panel, counterparty side only. ~~`legs` is **not** sent — a leg
      is its own state machine with `expectedVersion` commands, and creating one with no way to
      advance it leaves a booking nobody can move.~~ **STALE — the command surface shipped.**
      `POST /commerce/shipment-legs/:legId/commands` (`book`/`depart`/`arrive`/`complete`/
      `report_exception`, each with `expectedVersion` and an `Idempotency-Key` header),
      `GET /commerce/shipment-legs/:legId/events` and `GET /commerce/shipments/:shipmentId` all
      existed in the backend with **no frontend caller at all**; they are wired now, from
      `/studio/logistics`, and `CreateShipmentInput` accepts `legs` because its own stated
      condition — "until their command surface has a caller" — is met.
    - **Disputes**: `POST /orders/:orderId/disputes`, on the order detail page, **buyer side only**
      — `evaluateDisputeOpeningRelationship` refuses any actor that is not the order's buyer, so a
      seller answers with a note on the existing dispute. `reasonCode` is free text under a regex
      rather than a pgEnum, so the client ships a closed picker over it: a textarea would fragment
      one reason into six spellings no moderator could group.

    ⚠️ **SETTLEMENT AGREEMENTS: DECIDED AGAINST FOR NOW, not forgotten.** `POST
    /threads/:threadId/settlement-agreements` and `…/responses` exist and have no caller, and they
    stay that way: a propose/respond UI reads as Qatoto holding the money even when a licensed third
    party does, which is the exact liability the no-custody posture exists to avoid. Escrow left this
    codebase (§7) and nothing here reopens it. Revisit if a licensed provider is actually
    contracted — the routes are the smaller half of that decision.
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

## Decisions taken 2026-08-31, with Alibaba as the reference

Researched against Alibaba.com (the B2B supplier marketplace) plus eBay/Amazon for fitment. ⚠️ **A
lot of what search returns for "how Alibaba does X" is Alibaba's own SEO content on
`seller.alibaba.com/blogs` and `alibaba.com/product-insights`, not documentation** — programmatically
generated marketing that reads authoritative. Live supplier pages are bot-blocked, so the current
filter sidebar could not be seen. Everything below marks what is documented versus inferred.

### 1. `standardCode` — BUILD IT, over a controlled vocabulary

Alibaba's seller-side Certificate Center is a **structured record**, not a bare upload: Certificate
Holder, Certificate Type, Product Category, **Certificate Number**, Certificate Name, **Issued by**,
and **issue/expiry dates**, plus the scan
([UI capture](https://www.iorad.com/player/2141314/Alibaba---How-to-upload-Product-Certificates)).

⚠️ **What could NOT be confirmed: whether their standard name is a controlled vocabulary or free
text.** No evidence of an enum containing the literal strings `ISO 9001` / `CE` / `RoHS`. So this is
our decision, not a copy. **Decided: controlled vocabulary**, because the filter is the entire point
— a free-text standard makes `certification=ISO9001` unmatchable, which is exactly the bug the
manufacturer directory has today.

⚠️ **AND THE BADGE IS NOT COPYABLE.** Alibaba's "Verified Supplier" rests on an on-site audit by SGS
/ TÜV / Intertek with a downloadable report. We have no inspection capacity, and their own terms
concede they *"cannot verify every single statement on the suppliers' pages or the documents they
upload"*. The structured fields are free to copy; **the word "verified" is not**. Label
supplier-supplied certificates as declared, and let buyers check IAF CertSearch themselves.

### 2. Public seller revenue — a COARSE SELF-DECLARED BAND, explicitly labelled

Alibaba splits cleanly, and the split is worth copying:

- **Self-declared:** Total Annual Revenue as a *range bucket* (Below US$1M / 1–2.5M / … / Above
  US$100M), year established, employee count, factory size, output. The supplier types these.
- **Platform-measured:** transaction count and amount over the **last 6 months**, response rate,
  on-time delivery, reorder rate — all derived from on-platform orders.

⚠️ **THE ONE PLACE TO DIVERGE FROM ALIBABA.** They appear to put **no provenance label** on the
self-declared revenue; the distinction is carried by page region alone, which only works after a
decade of training buyers. **Decided: every number carries its provenance** — `declared by the
seller` or `measured by Qatoto · last 6 months · N orders`. The platform-measured half needs no new
capability; it is our own order table aggregated. A band rather than an exact figure also sidesteps
the consent problem an exact revenue disclosure raises.

### 3. Naming the reporter — SPLIT BY REPORT KIND

- **IP / counterfeit: the complainant IS named, and this is documented.** Alibaba's IPP takes two
  contacts, one explicitly *"disclosed to the party being complained of"*. The sibling
  [Alibaba Cloud IPR policy](https://www.alibabacloud.com/help/en/legal/latest/411745) is published
  documentation: full name, country, address, email; forwarded to the reported user, typically
  within five business days; counter-notice forwarded back. Anonymous IP complaint is structurally
  impossible, and matches DMCA-style regimes generally.
- **General marketplace reports: UNDOCUMENTED at Alibaba.** Nothing published says whether a
  non-IP report names the reporter. (⚠️ Alibaba's "handled discreetly" language is about their
  **corporate whistleblower channel**, not marketplace reports — do not cite it as one.)

**Decided: the reporter is NOT named to the reported party for general reports** (quality, listing
accuracy, conduct), because the reporter is usually a buyer in an ongoing commercial relationship
with the seller and naming them converts a report into a retaliation risk. The moderator sees the
identity; the seller sees the substance. **If an IP/counterfeit path is ever built it must be a
separate, named flow** — that is a legal requirement, not a preference. Write this into the policy
pages before the first report arrives, which is the thing Alibaba never did.

Worth knowing: Alibaba publicly **boycotted an IP enforcement agency for abusing its notice-takedown
system** ([Retail Dive](https://retaildive.com/news/alibaba-fighting-false-intellectual-property-claims/435939)).
Full identification does not stop abuse; it only makes it attributable.

### 4. Compatibility claims — the relations design is right, and NOBODY verifies fitment

⚠️ **No marketplace verifies a compatibility claim. Not one.** Amazon takes seller-submitted
ACES/PIES fitment files and puts accuracy on the seller; eBay says outright *"Sellers are always
responsible for the fitment associated with their listings."* Alibaba has no fitment system at all —
just per-category attributes (Compatible Brand, Applicable Models, OE NO.) with most fitment living
in free-text titles. Grainger/RS/McMaster are first-party catalogues, so they are not a comparison.

This **validates the `seller_declared` → `moderator_curated` design already shipped**: a moderator
confirming a claim is a stronger signal than any major marketplace offers, and the dismissal path
gives a way to remove a false one — which none of them have either.

**The idea worth stealing later is eBay's, and it is not verification.** eBay Guaranteed Fit never
checks a claim; it makes a wrong one **expensive to the seller** — if the buyer supplied accurate
details and it does not fit, eBay covers return shipping and refund. Crucially the guarantee applies
**only to structured fitment data**, never to free text: structure earns the remedy. ⚠️ **Not
actionable here yet** — it needs a returns/remedy rail, and escrow left this codebase (§7). Recorded
as the direction for when a money rail exists.


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
  `/studio/earn` earnings panel** (it was `/sales`, then briefly `/studio/sales`), which is
  self-scoped and authenticated; a seller reading their own books needs no consent.
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
- ~~**The Postgres ceiling.**~~ **DECIDED AND BUILT 2026-08-31: the per-process pools came down,
  the plan stays. Stay on Aiven free for now; migrate to AWS RDS later.** The entry was right that
  20 is tight and wrong about where the slack was — **the ceilings already existed as env vars and
  were set in NO config file**, so the defaults ran in production:

    ```
    API      shared pool                   ->  8   (DATABASE_POOL_MAX)
    Worker   shared pool + dedicated pool  -> 12   (8 + WORKER_DATABASE_POOL_MAX 4)
    db:*     shared pool                   ->  8
                                             ══
                                             28   against a server-wide 20
    ```

    ⚠️ **THE WORKER HOLDS BOTH POOLS AND THAT IS THE NUMBER EVERYONE GETS WRONG.** Its pg-boss
    pollers use the dedicated pool; its handlers reach the shared one through `db`. Budgeting with
    `WORKER_DATABASE_POOL_MAX` alone understates the worker by two thirds. `src/worker.ts` ends both
    at shutdown, which was the only place that said so. `.env.example` and `BACKEND_STRUCTURE.md`
    §5b now carry a worked budget summing to 20.

    ⚠️ **28 IS A CEILING, NOT A STEADY STATE** — `pg.Pool` connects on demand, so a sequential seed
    script holds exactly one. The exposure is concurrency spikes, which is why lowering the ceilings
    costs no throughput. It has fired before: `src/worker.ts:731-737` records one poller per
    dead-letter queue reaching fourteen and hitting `FATAL: sorry, too many clients already`.

    **`logConnectionBudget()` replaces an assertion with a measurement.** `max_connections = 20` was
    stated in prose in five files and read from the server by none of them; both runtime processes
    now run one `SHOW max_connections` at boot and log this process's ceiling against the server's
    total. ⚠️ **Do not "finish" this by rewriting those five comments to a new hardcoded number** —
    that relocates the defect rather than closing it.

    ⚠️ **WHEN THE RDS MIGRATION HAPPENS: three env vars, zero code, and NOTHING AUTO-SCALES.**
    `DATABASE_URL` and `DATABASE_CA_CERT_PATH` (point it at the RDS bundle —
    `postgresPoolSslOption()` reads whatever file it is given, and `stripSslModeQueryParameter`
    already handles `?sslmode=` either way), then **raise the two pool vars by hand**. No code
    anywhere sizes a pool from the server, so a 110-connection instance would keep running 8 and 4 —
    a permanent under-use with no error attached, which is exactly what the boot log makes visible on
    the first deploy. Second trap: both vars are Zod-capped `.max(100)`, so a larger value is a
    startup failure rather than a larger pool.

    **Two things checked and worth not re-deriving.** `db.t4g.micro` is the SAME 1 GiB RAM class as
    the Aiven free node — ~110 connections on paper, but treat ~40 as the practical number. And AWS
    retired the 12-month free tier for accounts opened after mid-2025 in favour of ~$200 of credits
    over six months, after which the free-plan account closes; RDS's 750 hours was never one of the
    always-free services. Confirm which terms the account is on before planning around it.

- **⚠️ THE TOPOLOGY IS WORSE THAN THE BUDGET ABOVE ASSUMED, and the correction is recorded here
  rather than re-derived.** Confirmed with Vidyesh 2026-08-31: **the cloud box and the laptop share
  ONE Aiven instance** (`pg-free-vinitchuri0312-0118`), and the cloud runs the API and the worker
  **on one box off one `.env`**. So it is not two processes on 20 connections, it is **four plus a
  script** — worst case `5X + 2Y`, which on the shipped defaults is **48 against 20**.

    ⚠️ **A SINGLE `.env` CANNOT GIVE THE API AND THE WORKER DIFFERENT VALUES.** `src/index.ts:1` and
    `src/worker.ts:1` both `import "dotenv/config"` off the same file, so a per-service split is only
    expressible where the services have separate environments — which neither environment here has.
    The first version of `.env.example` prescribed `API=6 / worker=3` and was therefore unfollowable;
    it now carries four labelled profiles (Aiven shared, Aiven split, RDS cloud, RDS from a laptop)
    keyed on MACHINE rather than on service.

    ⚠️ **THE BUDGET SPANS MACHINES.** Setting the cloud correctly and ignoring the laptop still
    exhausts the server. That is the sentence the first version was missing entirely.

    **The escape hatch, checked in the dependency rather than assumed:** a real environment variable
    beats `.env`, because `node_modules/dotenv/lib/main.js:382-392` skips any key already in
    `processEnv` unless `{ override: true }`, which nothing passes. So
    `DATABASE_POOL_MAX=2 pnpm db:seed-store-demo` caps one command with no file edit.

- **⚠️ THE ACTUAL FIX IS PROBABLY FREE AND IS NOT DONE: there is a SECOND Aiven instance.**
  `.claude/settings.local.json` names `pg-qatoto-vinitchuri0312-0118` beside the `pg-free-` host both
  environments currently share. If that service is live, pointing the cloud box at it separates
  production from local development, gives each side its own 20, and makes every number above
  comfortable instead of tight — **one `DATABASE_URL` change, beating the whole budget**.

    ⚠️ **NOT DONE, AND DELIBERATELY NOT ASSUMED.** Whether it is live, what plan it is on and whether
    it holds the real data are things only Vidyesh can confirm; pointing production at the wrong
    database on an inference from a settings file is not a risk worth taking to save a question.

- **⚠️ THE REAL REMAINING DATABASE RISK IS BACKUPS, NOT CONNECTIONS. Aiven free has none**, and
  nothing above adds any. That is the thing worth migrating FOR — automated backups — rather than
  connection headroom, which is now a solved config problem. Also note Aiven withholds PgBouncer
  below the Startup plan (Free 20 / Hobbyist 25 / Startup 100 + pooling), so "add a pooler" is not
  available on the current plan at any effort.

---

## Never verified in a browser

⚠️ **THE BLANKET CLAIM THAT USED TO OPEN THIS SECTION WAS STALE.** It said every contract was
asserted over HTTP or in served HTML and nothing had been watched — but two screens have since been
watched rendering (the category-attributes admin console with both toggles and its 409/422/422
refusals, and the store search results page), and a dimensions bug was caught *in the browser*
(`46.5` reaching the wire as `465`).

What remains true is narrower, and it is the part worth keeping. Two surfaces have never been
watched rendering: the authenticated channel-profile paths (saving a bio, filing a
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

### ~~A separate defect found on the way, NOT fixed~~ — FIXED 2026-08-31

`pitch-detail-page.tsx` and `src/app/(home)/store/factories/[factorySlug]/inquire/page.tsx` called
`notFound()` on **any** failed read — `if (!result.success) notFound()` — where every other detail
page in the app tests `error.code === "404"` first. So a backend outage rendered "this pitch does not
exist". That is precisely the lie `series-detail-page.tsx:14-22` documents its `unavailable` state to
avoid: _"rendering 'this show does not exist' for a backend outage would be a lie that a crawler would
then cache."_

**Both now gate on the code** and fall through to a status panel — `RndErrorPanel` on the pitch page
(the shape `market-insight-detail-page.tsx:56-63` already used), `StoreErrorPanel` on the inquire page
(the shape its own sibling `factory-detail-page.tsx:56` already used). The 404 arm is unchanged and
still deliberate: one code covers "no such thing" and "not visible to you" so a stranger cannot probe
which slugs exist.

⚠️ **NO `422` ARM ON EITHER.** That arm exists on the insight and cluster pages because their path
segments are `z.uuid()`; a `pitchSlug` and a `factorySlug` are slugs the lookup actually runs. Adding
one here would be cargo-culted from a page whose constraint these do not share — see the sweep above
that established exactly two page segments in the app validate as uuid.

⚠️ **THE INQUIRE PAGE'S OLD COMMENT CITED A PRECEDENT THAT REFUTED IT** — it claimed parity with
"the detail page", and `factory-detail-page.tsx`, reading the same `getStoreFactory`, has always
tested the code first. Worth remembering as a class: a comment naming its own precedent is checkable,
and this one had never been checked.

**Proved in BOTH directions against `pnpm start`**, with the outage simulated by pointing
`NEXT_PUBLIC_API_URL` at a dead port rather than by stopping anything:

|                      | pitch page                  | factory inquire                    |
| -------------------- | --------------------------- | ---------------------------------- |
| backend unreachable  | "Couldn't load this pitch." | "Network error. Please try again." |
| bad slug, backend up | not-found page, no panel    | not-found page, no panel           |

⚠️ **AND A VERIFICATION TRAP THAT COST A ROUND, worth more than the fix.** The first assertion used
`"Back to Store"` as the marker for "the error panel rendered" — **it is not one.** That link is on
the store not-found page too, so it matched on the very case it was meant to exclude. The markers
that actually discriminate are the panel's own MESSAGE (`Couldn't load this pitch.`, or the backend's
own sentence, which `StoreErrorPanel` renders verbatim). This is the same shape as the warning above
about `"This page could not be found"` appearing in every streamed document — **pick a marker only
the failing branch can produce, and confirm it is absent from the passing branch before trusting it.**

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
