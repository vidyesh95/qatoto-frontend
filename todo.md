# TODO

**Open work only.** Everything that shipped is deleted from this file — the code, the backend docs
and `git log` are the record of what was built and why.

> **Pruned 2026-09-16, from 4,676 lines.** Over 4,100 lines of retrospectives and build logs on work
> that had already shipped and verified (the ~90 route backlog, Blueprints 3-surface redesign and authoring
> pipelines, Store Phase 27 fixes, Keyset pagination precision, Import intelligence, and Site feedback)
> were removed. Nothing was deleted until its reasoning was confirmed to survive in code comments,
> backend structure docs, or git history.
>
> **Section anchors are preserved** so cross-document citations remain intact.

---

## At a glance

**Blocked on a purchase / external vendor:**

- **§11 (SMS provider)** — Phone number verification in Account Settings requires contracting an SMS gateway (e.g. Twilio/Msg91).
- **Brand SVG Assets** — WhatsApp, X, and LinkedIn brand marks in `public/icons` for the share sheet.

**Commercial & Payment Rail (Top priority open build):**

- **Payment Gateway Integration** — **Razorpay is SHIPPED** (adapter, both signature checks, webhook inbox, Standard Checkout modal). Stripe is an enum label with no implementation, and **neither provider may run in production until a marketplace split exists** — without one a captured payment lands in Qatoto's own account, which is the custody §14 refused. See §1.
- **"Buy Now" Checkout** — Direct single-product checkout bypassing the multi-seller cart.
- **Four Minor Store Items** — Service-offering coverage read, `standardCode` filter, `viewer.canDelete` on Q&A, and `DELETE /products/:id` 500 on customized listings.
- **§18 (Provider freight rate cards)** — The freight tables are empty because only `moderate_commerce` may write them. Give approved forwarders provider-scoped write routes and a Studio composer so they publish the lanes they already sell.

**Content & Launch Blockers:**

- **Blueprints Public Launch Step** — Currently de-indexed (`noindex` on 7 routes, excluded from `sitemap.ts`) because the 32 builds are seeded test fixtures. Real hardware teardowns must be published before removing `noindex` and restoring the sitemap.
- **In-Platform Rights Claims** — Currently uses a pre-formatted `mailto:` link. Needs an in-platform `blueprint_rights_claim` table and submission route.

**Platform & Media Capabilities:**

- **Video Transcripts & Paywalls** — Transcripts are mock placeholders (no Speech-to-Text ASR pipeline or table); `isPremium` has no entitlement or paywall model in the backend.
- **Third-Party Escrow & FX Adapters** — Escrow and FX adapters are deterministic fakes. The **logistics** adapter is a fake on purpose and stays one — see §4.

**Legal & Compliance:**

- **Legal Entity & Terms of Service** — Legal entity details in `src/lib/site.ts` are marked `[TO BE CONFIRMED]`; Terms of Service rewrite needed to cover marketplace commerce, orders, R&D ventures, and teardowns.

---

## Blocked on External Vendors / Purchases

### 11. `phone_number` column — BLOCKED ON A VENDOR, not on code

`session.user.phoneNumber` and `phoneNumberVerified` are declared client-side in
`src/lib/auth-client.ts` via `inferAdditionalFields`, but the backend has no `phoneNumber()` plugin
and no column — `rg phoneNumber qatoto-backend/src` returns nothing.

The settings panel renders read-only and explains that phone verification is not available yet.

**It is a purchase before it is a migration.** Better Auth's `phoneNumber()` plugin requires a
`sendOTP` implementation and there is no SMS provider in `src/config/index.ts` or `.env.example` —
the only OTP delivery configured is Brevo, which is email. Configure an SMS provider (Twilio,
AWS SNS, Msg91, etc.), configure the Better Auth plugin, and add the migration.

**One live snag, independent of the vendor decision.** `src/lib/auth-client.ts:28` still registers
`phoneNumberClient()`, so `authClient.phoneNumber.sendOtp()` is callable against a route that does
not exist. No UI reaches it today — `phone-number-panel.tsx` documents the removal — but the
registration is a dead client surface that will 404 the first caller. Drop it, or keep it and say
why in the file.

**⚠️ WhatsApp Cloud API is a DIFFERENT vendor, not the absence of one.** It was raised as the cheap
answer; it needs a verified Meta Business account, a WhatsApp Business number and per-template
approval, and on authentication templates the per-message price is comparable to SMS rather than a
third of it. It may still be the right rail for the manufacturing hubs — it is not a way to skip
§11's blocker.

**⚠️ PASSKEYS ARE ALREADY SHIPPED AND ARE NOT A SUBSTITUTE FOR THIS.** `@better-auth/passkey` is a
dependency in both repos, the plugin is registered (`qatoto-backend/src/lib/auth.ts:501`), the
`passkey` table exists (`_core.ts:469-486`), and the UI is wired end to end —
`passkeys-panel.tsx`, `sign-in.tsx:41-46`, `auth-client.ts:23`, `use-is-web-authn-supported.ts`.
Anyone proposing to "add passkeys" here is proposing work that is done. And they answer a different
question: a passkey proves **who is signing in**; it cannot prove **that a phone number belongs to
them**.

**⚠️ OPEN QUESTION — IS §11 NEEDED AT ALL?** Authentication is already covered by email OTP plus
passkeys. A verified phone would be a trust signal, and Qatoto runs no KYC and holds no funds
(the platform is a directory, not an intermediary), so nothing downstream currently requires
one. Decide whether this is a "not building it" before contracting any vendor — the cheapest SMS
provider is the one never signed up for.

### Share targets have no brand marks

`public/icons` has `mail` but no X, WhatsApp, or LinkedIn marks. The fallbacks in
`src/components/home/watch/share-sheet.tsx` (lines 44, 53, 62) render generic `share` glyphs.
Adding real SVG assets into `public/icons` and updating `share-sheet.tsx` will complete the polish.

---

## Decided: Not Building It (Deliberate Non-Goals)

### Seller cost-of-goods and margin — DECIDED: NOT BUILDING IT

`seller-earnings-panel.tsx` explains profit and margin are not shown because Qatoto never records what a
seller paid. That copy is correct and stays:

1. **Forbidden by ledger architecture**: Platform revenue is platform-measured; supplier purchase costs
   are self-reported. Netting them violates double-entry isolation (`commerce_journal_account_memorandum_ck`).
2. **Industry precedent**: Alibaba and AliExpress both omit it; only Amazon sellers use it due to complex FBA fee structures.
3. **Manual friction**: Sellers would have to manually type per-order-line costs, which is rarely maintained.

### Category attribute seller request queue — DECIDED: NOT BUILDING IT

Sellers cannot submit custom category attribute templates; attribute definitions are controlled by
platform administrators via the category attributes console (`0151`/`0152`).

### On-platform video subtitle authoring — DECIDED: NOT BUILDING IT

`/studio/subtitles` is marked as a planned stub. Because videos are embedded from YouTube, subtitle tracks
and closed captions are natively managed by YouTube's player. On-platform subtitle editing is architecturally
inapplicable unless native video file hosting is built.

---

## Open Work: Yet to Be Written in Code

### 1. Payment Gateway Integration — Razorpay SHIPPED, Stripe unbuilt, both blocked on a split

⚠️ **THIS SECTION WAS STALE IN FOUR PLACES AND THE CORRECTIONS ARE THE POINT.** It said Razorpay
"is not yet in the schema", listed "widen `CommercePaymentProviderName` to include `razorpay`" and
"webhook signature verification" as work to do, and the at-a-glance line said the checkout modals
were unbuilt. All four shipped. Read a stale blocker as a claim to CHECK.

**What is actually shipped.** `commercePaymentProviderEnum` is `["fake", "stripe", "razorpay"]`
(`store.ts:1308-1312`) and the TS union matches (`commerce-payment-provider.adapter.ts:17`).
`RazorpayCommercePaymentProviderAdapter` is 536 lines of `fetch` — **no npm SDK on purpose**, its
header says the SDK's loose typing is refused by CLAUDE.md §4. It carries **two** signature checks:
the webhook HMAC over the raw body (`:515-525`) and the Checkout-handler HMAC over
`order_id|payment_id` (`:485-498`), both through a constant-time compare (`:459-475`). The raw-body
mount is `src/app.ts:182`, the route `POST /webhooks/payments/razorpay`. Frontend:
`src/lib/razorpay-checkout.ts` and `order-payment-panel.tsx` (commit `79b8faa`).

**And the webhook inbox already exists** — the one a review would propose adding.
`commerce_payment_webhook_event` (`store.ts:8443-8479`) carries the unique index
`(provider, provider_event_id)` and its header states the rule: _"Persist BEFORE applying state
transitions; unique (provider, provider_event_id) makes replay harmless."_ Siblings:
`commerce_connector_webhook_event`, and `provider_webhook_event` in R&D.

#### What is actually left

1. **Stripe has no implementation.** The enum label exists and the resolver falls through to
   `PROVIDER_UNAVAILABLE` (`commerce-payment-provider.adapter.ts:199-206`). `stripe` is in neither
   repo's `package.json`. There is no `POST /webhooks/payments/stripe`, no raw-body mount and no
   signature verification for it.
2. **⛔ NEITHER PROVIDER MAY RUN IN PRODUCTION UNTIL A MARKETPLACE SPLIT EXISTS, AND THAT IS THE
   REAL BLOCKER.** `resolveCommercePaymentProvider` is refuse-closed in production and refuses any
   `rzp_live_` key everywhere (`adapter.ts:220-230`): _"without Razorpay Route … a captured payment
   settles into Qatoto's own merchant account, which is the custody §14 decided against."_ A
   multi-seller cart becomes one order per seller and currency
   (`commerce-checkout.service.ts:1415-1419`), and on the `direct_processor` rail the money settles
   to **the seller's** account — `settlement_account_ref` is _"the SELLER's account at the
   processor… Qatoto is not the merchant of record and does not take custody"_ (`store.ts:8085-8092`).
   ⚠️ **`settlement_account_ref` AND `application_fee_in_cents` ARE COLUMNS WITH NO WRITER** on the
   Razorpay path. Filling them is what Route or Connect is for.

#### ⚠️ Stripe, if ever wired, is DIRECT CHARGES — never Destination Charges

A **Destination Charge** creates the charge on the **platform's** account and transfers onward,
which makes Qatoto the merchant of record and puts the funds through Qatoto — the exact custody
§14 refused and `store.ts:1470-1479` states as a standing position (_"Qatoto provides no escrow and
never holds funds… the venue and the record-keeper, never the holder"_). Separate Charges and
Transfers has the same defect for the same reason.

**Direct Charges** create the charge on the connected account with an `application_fee_amount`, so
the seller is the merchant of record and Qatoto never touches the money. That is precisely what
`direct_processor` and `settlement_account_ref` already describe, which is why it is the only shape
that fits. The India twin is Razorpay Route linked accounts. `PLATFORM_FEE_BASIS_POINTS` defaults
to `0` (`config/index.ts:455`), so the fee MECHANISM is what gets wired, not a fee.

#### Open question — the Razorpay inbox key is synthesised, not Razorpay's

`commerce_payment_webhook_event`'s header promises `(provider, provider_event_id)`. The Razorpay
path supplies a **backend-minted** id instead:

```ts
// commerce-payments.service.ts:1906
providerEventId: `evt_payment_${observedState}_${transfer.id}`,
eventType: `payment_intent.${observedState}`,
```

`RazorpayWebhookBodySchema` (`commerce-webhooks.schemas.ts:29-37`) parses only `event` and the order
id, and `x-razorpay-event-id` is read nowhere. So the inbox deduplicates on **settlement outcome**,
not on **provider event**.

**This is not obviously a defect** — the controller states a different and sound replay defence
(`commerce-webhooks.controller.ts:152-163`): the body is a hint, the order is re-fetched from
Razorpay, and _"replaying `order.paid` cannot settle an order Razorpay does not call paid."_

So the question is which of the two is stale: either the table header should stop promising a
provider event id on this path, or the path should read `x-razorpay-event-id` and become a true
provider-event inbox. **Decide with the backend open, and do not "fix" one without reading the
other.**

---

### 2. "Buy Now" Single-Line Checkout

Currently, checkout requires adding an item to the cart and going through `/checkout`.
A single-click "Buy now" button directly on the product detail page (`src/components/home/store/product-detail.tsx`)
that prepares stock reservation for that single item and jumps directly to confirmation/payment is still open.

---

### 3. Four Minor Store Gaps

1. **Service-offering coverage read**: Link service offering locations to buyer delivery destinations.
2. **`standardCode` filter**: The manufacturer directory standard certification names should filter over a controlled vocabulary (`ISO 9001`, `CE`, `RoHS`, etc.) rather than free text.
3. **`viewer.canDelete` on Product Q&A**: Ensure the question/answer author or seller has explicit permission flags in the read projection to render the delete control.
4. **`DELETE /products/:id` 500 on customized listing**: Resolves an internal server error when a seller deletes a draft/inactive product that contains customized attributes.

---

### 4. Third-Party Escrow & FX Adapters — and the carrier refusal

⛔ **CARRIER INTEGRATION — DECIDED: NOT BUILDING IT.** This bullet used to say "connect an
aggregator or carrier API (e.g. Shiprocket, EasyPost, or FedEx)". Three reasons it is refused, and
the first two are structural rather than commercial:

1. **A carrier-account rate has nowhere to live on the wire.** `FreightOptionSchema` carries no
   price — money lives inside `providerQuote`, beside `providerOrganizationId` and
   `sourceForwarderName` (§19.9b, and `src/lib/store/freight.schemas.ts`). FedEx is not a provider
   organization on Qatoto. Quoting a carrier on **Qatoto's own account** makes Qatoto the principal
   in the price, which §0 forbids and which the nesting was built to make unrenderable.
2. **An estimate nobody books buys no accuracy.** Qatoto generates no labels, takes no booking and
   charges no freight — `shippingInCents` is literal `0` by design. A live rate would be reconciled
   against nothing, so its only effect is to look more authoritative than the card-derived number
   beside it.
3. **A parcel API answers one of four modes.** FedEx and the express aggregators price parcel air
   and ground. There is no sea, no rail and no LCL, so a four-mode surface would be three-quarters
   empty behind a tab bar that promises otherwise.

⚠️ **AND NO SIMULATOR.** A "benchmark estimate" for the modes a carrier API cannot reach is exactly
what A36 rules out — _a missing component is named, never defaulted, averaged, or extrapolated._ A
`[Simulated Estimate]` badge does not cure an invented figure; it makes it worse, because a badged
number still moves a buyer's decision while reading as reconciled. The honest render already exists:
an uncovered lane returns empty `options[]` plus `quotableProviders`, which is a route into an RFQ.

`src/modules/store/fulfillment/logistics-provider.adapter.ts` **stays** as the documented seam its
own header describes ("A seam only. No carrier is contracted"). Do not delete it and do not wire it.
Revisit only if Qatoto ever books a shipment — which is a stated non-goal. The lane numbers come
from §18 instead.

- **Escrow Provider**: `external-escrow-provider.adapter.ts` has registered enum values for `"escrow_com"` and `"shieldpay"`, but only `FakeExternalEscrowProviderAdapter` is implemented. Complete the integration when high-value milestone escrow is launched.
- **Foreign Exchange (FX)**: `foreign-exchange-provider.adapter.ts` returns a synthetic 1:1 rate and is refuse-closed in production. Connect a live FX rate feed (e.g. Open Exchange Rates or Wise) for multi-currency settlement.

---

### 5. Video Domain: Transcripts & Subscriptions

Two `TRANSPORT: mock` banners remain in `src/components/home/watch/watch-content.tsx` and `comments.tsx`:

- **Transcripts**: The watch page has a transcript accordion rendering empty data. Requires an automated Speech-to-Text (ASR) pipeline (e.g. OpenAI Whisper or Deepgram) upon video ingestion, stored in a `video_transcript` table.
- **`isPremium`**: Currently hardcoded to `false`. Requires a subscription entitlement model and recurring payment processing if paywalled creator content is offered.
- **Trending**: Currently empty array. Requires a nightly or hourly background worker calculating popular search and discussion tags.

---

### 6. Blueprints Public Launch Step & Direct Rights Claims

The Blueprints backend (Hero, Showcases, Case Studies, and Teardowns) is wired end-to-end with migrations up to `0198`. What remains for public launch:

1. **Real Content Submissions**: Seeded fixtures (`blueprint-seed-corpus.ts`) must be accompanied or replaced by genuine hardware teardowns and manufacturing case studies.
2. **SEO Launch Step**:
    - Remove `robots: { index: false, follow: false }` across all 7 blueprint pages.
    - Restore `/blueprints` entries in `src/app/sitemap.ts`.
3. **In-Platform Rights Claims Table**:
    - Currently, `/blueprints/teardowns/[slug]/report` formats a `mailto:` email notice to `support@qatoto.com`.
    - Add a `blueprint_rights_claim` table in backend with `POST /blueprints/teardowns/:slug/claims` to route IP notices directly into the staff moderation console.

---

### 7. Legal Entity, Terms of Service & Compliance

1. **Legal Entity Placeholders**:
   In `src/lib/site.ts`, fill in the four placeholders once company incorporation details are finalized:
    - `LEGAL_ENTITY_NAME`
    - `LEGAL_ENTITY_REGISTERED_ADDRESS`
    - `GOVERNING_LAW_JURISDICTION`
    - `GOVERNING_LAW_COURTS`
2. **Terms of Service & Privacy Policy Rewrite**:
   Both documents still describe Qatoto as a "Video Sharing Site". They must be updated to cover:
    - Marketplace commerce, purchase orders, refunds, and cancellations.
    - R&D projects, team formation, and equity compensation claims.
    - Engineering teardowns, reverse engineering disclaimers, and clean-room provenance rules.
3. **Cookie / Privacy Consent Banner**:
   Cookies are essential-only today. A consent banner becomes mandatory the moment analytics, advertising, or third-party tracking scripts are deployed.
4. **Contact Mailbox Verification**:
   Verify monitoring for `support@qatoto.com`, `security@qatoto.com`, `careers@qatoto.com`, and `press@qatoto.com`.

---

### 8. React Doctor backlog

Left after the 2026-09-17 cleanup pass (all errors fixed or confirmed false positives, Zod 4
`.strip()` removed). Re-list with `pnpm exec react-doctor --verbose`. Deferred because each needs a
per-site read or a decision, not a mechanical fix.

1. **Refactor-scale**: `no-high-complexity-react-function` ×48, `no-giant-component` ×35,
   `duplicate-jsx-subtree` ×17, `only-export-components` ×39 (e.g. `create-listing-page.tsx`).
2. **Accessibility — needs a per-form pass**: `no-placeholder-only-field` ×56,
   `control-has-associated-label` ×27, `html-label-has-single-control` ×6.
3. **`query-mutation-missing-invalidation` ×33**: read each hook. Some R&D writes answer 202 and
   poll on purpose, so "add an invalidation" is not always right.
4. **Per-site state/perf reads**: `no-derived-useState` ×22, `rerender-state-only-in-handlers` ×25,
   `js-set-map-lookups` ×24, `async-await-in-loop` ×9 (`src/hooks/products.ts`, some sequential on
   purpose), `server-sequential-independent-await` ×7, `no-async-event-handler-without-reentry-guard` ×4,
   `no-locale-format-in-render` ×5, plus single hits.
5. **`dangerous-html-sink` ×2** (`blog-detail.tsx:75`, `press-detail.tsx:68`): CMS HTML rendered
   without sanitizing. **Latent, not live** — `QATOTO_CMS_URL` is unset, so both sinks are fed by
   the eight in-repo `MOCK_BLOGS` / `MOCK_PRESS` bodies. It becomes real the day the env var is set.

    ⚠️ **DECIDED 2026-09-18: THE CMS BODY BECOMES MARKDOWN. The sink is DELETED, not filtered.**
    Render it through the hardened `react-markdown` configuration already shipped in
    `src/components/home/blueprints/showcase/sections/showcase-write-up.tsx` — `skipHtml`, an
    `allowedElements` allowlist and a `urlTransform` that keeps only http(s), site-relative and
    anchor addresses. `react-markdown` and `remark-gfm` are already dependencies, so this costs
    nothing to install, and the `prose [&_h2] [&_p] [&_ul]` Tailwind styling on both components
    survives untouched because Markdown emits the same elements.

    **A sanitizer was considered and lost.** DOMPurify needs `isomorphic-dompurify` to run during
    SSR, which adds a dependency plus jsdom weight on the server, and leaves a sink that has to stay
    correctly configured forever. The swap removes the sink instead.

    **Do it BEFORE the CMS is chosen, not after.** The contract change is free today — eight mock
    strings and two components — and is a content migration the moment anything real is authored.

    ⚠️ **THE SANITIZER IS NOT THE ONLY HOLE ON THAT PATH.** `cms.ts:41` is
    `const data: T = await res.json();` — a bare cast with **no Zod**, so an upstream CMS response
    reaches the component unvalidated as well as unsanitized. That is a Pattern 2 violation sitting
    beside the sink and it is fixed in the same pass, not separately.

    ⚠️ **DO NOT "FIX" THE THIRD `dangerouslySetInnerHTML`.** `src/lib/structured-data.tsx:66` is
    JSON-LD and is already correct — it escapes `<` to `<`, with the `</script>` breakout it
    defends against documented at `:58-64`. React Doctor does not flag it and neither should anyone
    else.

    `src/lib/cms.test.ts` asserts against the current fetch/fallback shape. Read it when the swap
    happens; it is not being changed now.

6. **`require-pnpm-hardening`**: `minimumReleaseAge` in `pnpm-workspace.yaml`, a supply-chain
   policy call for the owner.
7. **Deprecated `.strict()` left in two chains** (no longer flagged): `.extend(...).strict()` in
   `src/lib/blueprints/authoring.schemas.ts`. One sits on `safeExtend`, whose base refinements a
   `z.strictObject({...shape})` rewrite would drop, so it needs a careful look rather than a swap.
8. **Known false positives, no change**: object URLs in `profile-photo-panel.tsx` /
   `use-heading-image-pick.ts` / `thumbnail-picker.tsx` (already revoked), index keys in
   `watch-open-roles.tsx` (documented) and `new-program-wizard-page.tsx` (append-only rows),
   `iframe-missing-sandbox` in `video-preview-card.tsx`, `nextjs-no-client-side-redirect` in
   `sign-in-with-password.tsx`, and the date-input `max` in `program-contributor-tools.tsx`.

---

### 18. Freight rate data — the blocker was never a purchase

**This section used to say the tables stay empty "until a forwarder lane list is purchased or
imported." That was wrong, and it is why nothing moved for a phase.** The number is a forwarder's,
so the forwarder is who should type it. Qatoto is bootstrapped and buying a lane list also needs a
licence to redistribute the tariff — two costs to solve a problem the supply side solves for free.

**What already works.** Store Phase 20 (`0106`–`0109`) shipped `commerce_freight_rate_card`,
`commerce_freight_rate_break`, `commerce_customs_dwell_estimate`, the rating service
(chargeable weight `max(actual, volumetric)` with the winning basis named), journey composition
with `partialJourneys[]`, the arrival window, eight `moderate_commerce` admin routes and the public
`GET /store/products/:slug/delivery-estimate`. `delivery-sheet.tsx` already renders **every** field
those return — `providerQuote`, `quotableProviders`, `unavailableReasons`, `chargeableWeightBasis`,
`validUntil`. Nothing on the buyer surface is missing.

**What is actually missing.** The six write routes are `moderate_commerce` only, so a forwarder
already selling on `/store/providers` cannot publish the lanes it sells. Every lane therefore
answers `no_active_rate_card`.

⚠️ **`shippingInCents` STAYS LITERAL `0` AND THIS WORK DOES NOT CHANGE THAT.** Rating from a card is
not a booking and confers no capacity (§19.6). Freight is arranged between the buyer and the
forwarder; the checkout line reads "Not charged — arranged separately" and keeps reading it.

#### Backend — one new 5-file module

`src/modules/store/fulfillment/commerce-provider-freight-rates.{routes,controller,service,schemas}.ts`
plus `-error-response.ts`, mirroring `commerce-freight-rates.*` exactly.

| Route                                                                  | Notes                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `GET /commerce/provider/freight-rate-cards`                            | Own cards only, keyset-paged; reuse the admin list projection |
| `POST /commerce/provider/freight-rate-cards`                           | Bands required in the same call (1..20), one transaction      |
| `PATCH /commerce/provider/freight-rate-cards/:rateCardId`              | Withdraw / retire only                                        |
| `POST\|PATCH /commerce/provider/freight-rate-cards/:rateCardId/breaks` | Staged cards only                                             |

**No customs-dwell routes.** `commerce_customs_dwell_estimate` has no provider column — it is scoped
by country and commodity and is platform-wide. A forwarder is not a broker. Dwell stays
`moderate_commerce`.

Guards: `requireAuth` + `requireActiveCommerceOrganization` on the route, then **two in-service
assertions** (the same placement `moderate_commerce` already uses in `commerce-freight-rates.routes.ts`):

1. the caller's active organization owns the card's `providerOrganizationId`;
2. that organization holds an **approved** provider profile of kind `freight_forwarder` or
   `logistics_operator`.

⚠️ **`providerOrganizationId` IS DERIVED FROM THE SESSION AND NEVER READ FROM THE BODY.** A
submitted one lets a provider author a competitor's tariff, and `.strict()` must refuse the field
rather than ignore it.

Writes carry `compactBody` + `idempotency({ scope: "active_organization" })` and a new
read/write limiter pair through `createLimiter` (`src/middleware/rate-limit.ts`). Postgres-backed,
no Redis. Six registration points: the router export, the `src/app.ts` import, the `app.use`, the
`MOUNTED_ROUTERS` array in `src/middleware/rate-limit-coverage.test.ts`, the limiter declarations,
and the route-order test if a collection route is declared before an `:id` route.

#### The card carries no moderation state, deliberately

`commerce_freight_rate_card_state` is `active | superseded | withdrawn`; `proposed` is deliberately
absent and stays absent. **The provider is the moderated entity, not the price.** A profile is
approved before it can sell anything, and the price is the forwarder's own (§19.9b) — Qatoto vetting
a lane price on merit would read as endorsement, which is the liability this platform is built to
avoid. Spam is answered by provider approval plus withdrawal, not by per-card review.

⚠️ **If that ever has to change, the enum is the small half.** The rating read selects on the
validity **window**, never on `state`, so adding `proposed` without also filtering the read would
publish every unreviewed card instantly.

#### Three traps the composer must close, all invisible until they have cost a lane

1. **`validFrom` is REQUIRED and must be in the future.** The admin controller defaults it to
   `new Date()`, and a defaulted card is in force the instant it exists —
   `assertCardAcceptsBreakWrites` then refuses both `/breaks` routes forever with
   `409 COMMERCE_FREIGHT_RATE_CARD_IN_FORCE`. `validFrom` is absent from every PATCH schema and
   `.strict()` refuses it, so a card staged wrong is withdrawn and rewritten, never corrected. The
   provider schema makes it required and refuses a past value.
2. **At least one band with `minBillableWeightGrams: 0`.** Without a floor band every lighter
   consignment rates `below_smallest_break` and the lane publishes **no option** — which reaches the
   buyer as an empty delivery sheet, indistinguishable from having loaded nothing at all. Block
   submission on it; the predicate already exists as `hasZeroWeightFloorBand`
   (`src/lib/store/admin-freight.schemas.ts`).
3. **`volumetricDivisorCm3PerKg` is per card, bounded 100–20000, and must not be defaulted.** A road
   divisor typed onto an air card is inside the bound and silently underbills every bulky
   consignment. Show mode-shaped guidance (ocean W/M 1000, road ~3000, air 5000–6000) and let the
   forwarder type it — defaulting is the platform choosing a tariff convention on their behalf.

Composer copy must also restate that `unitPriceInCents` is **cents per kilogram of chargeable
weight**, not per consignment; a flat lane price is entered as `minimumChargeInCents`.

#### Nobody types twenty weight bands by hand

A forwarder's tariff **is a spreadsheet**. A composer that only accepts one band at a time is the
same blocker this section just removed, moved one layer up: the routes exist, and the lane still
never gets loaded.

**So the composer takes a pasted grid.** The forwarder selects the band rows in Excel, copies, and
pastes into one textarea; it is parsed **client-side** into the same band array the manual editor
already produces and submitted through the **unchanged** existing route.

⚠️ **THIS IS A CONVENIENCE OVER AN UNCHANGED CONTRACT, AND THAT IS THE WHOLE DESIGN.** No new
route, no multipart, no parser on the backend, no file stored and no retention question — an Excel
copy is TSV on the clipboard already. The three server-side refusals above (future `validFrom`, a
zero-floor band, a typed divisor) are untouched and remain the authority, so a paste missing a floor
band is refused exactly as a hand-typed one is. **The importer must never default a missing
column** — that is the one way an ingest path reintroduces invented data.

A file upload can come later if a forwarder asks for it; `src/middleware/upload.ts`'s per-route
multer factory is the precedent. It is not needed to unblock the lane.

⛔ **AND NOT FORWARDER-CONNECTED CARRIER FEEDS.** Letting a forwarder attach their own carrier API
credentials so Qatoto pulls their rates was proposed and is refused for three reasons — **none of
them the trust boundary**, because that argument is CORRECT: rows written under the forwarder's own
`providerOrganizationId` would preserve Qatoto's non-principal status exactly as §19.9b requires.

1. **The feeds mostly do not exist.** A freight forwarder is a broker; their tariff is a negotiated
   sheet, not an endpoint. The parties that do expose rate APIs are aggregator platforms, not the
   SMB forwarders this surface onboards — which is precisely why a paste box beats an integration.
2. **It makes Qatoto a credential custodian.** Storing and rotating somebody else's carrier secrets
   and calling out on their behalf needs an encrypted secret store, an outbound HTTP client, a
   per-carrier adapter and a redaction discipline — every piece of infrastructure §19.12 avoided,
   carried for a handful of providers.
3. **A pulled quote is not a tariff.** `commerce_freight_rate_card` is a price list with a validity
   window; an API returns a point-in-time quote. Ingesting one stores a rate that keeps pricing
   after the quote it came from expired.

#### Frontend

| File                                                              | Action                                                                                                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/store/provider-freight.schemas.ts`                       | NEW. Row shapes match `admin-freight.schemas.ts`; the **input** shapes differ — no `providerOrganizationId`, `validFrom` required |
| `src/lib/store/provider-freight.api.ts`                           | NEW. `getJson` / `sendJson` from `src/lib/http.ts`, tagged `ActionResponse<T>`                                                    |
| `src/hooks/store/provider-freight.ts`                             | NEW. `providerFreightKeys` on the `freightAdminKeys` precedent (`src/hooks/store/admin-freight.ts`)                               |
| `src/components/commerce/freight/weight-band-editor.tsx`          | MOVE from `src/components/admin/freight/`. Both composers share it or the two ladders diverge                                     |
| `src/components/studio/commerce/logistics/rate-card-composer.tsx` | NEW, on the `service-offering-composer.tsx` precedent                                                                             |
| `src/components/studio/commerce/logistics/my-rate-card-list.tsx`  | NEW, on `my-service-offering-list.tsx`                                                                                            |
| `src/app/(studio)/studio/logistics/page.tsx`                      | MODIFY. The rate-card surface sits beside the shipment queue, or splits to a sibling route                                        |

**Unchanged, deliberately:** `delivery-sheet.tsx`, `freight.schemas.ts`, `checkout-page.tsx`,
`arrival-window.schemas.ts`. This work changes **who may write**, not what is read.

Build the backend half alone first — the frontend has nothing to show until the routes answer.

---

## Decisions Needed

- **Legal Entity Incorporation**: Settle legal name and jurisdiction to update `src/lib/site.ts`.
- **Payment Gateway Priority**: Confirm whether Stripe (international) or Razorpay (India) should be wired first.
- ~~**Freight Strategy**~~: **Settled 2026-09-18 — §18.** Neither. Rate cards are not purchased and sellers do not set flat rates (a seller flat rate makes the seller the freight principal and can express neither a customs leg nor a two-leg journey). Approved forwarders author their own lanes through provider-scoped write routes.
- **Uncovered Inland Leg Freight Rule**: Settled in §16 — covered legs compose into `partialJourneys[]` with the missing leg named.
