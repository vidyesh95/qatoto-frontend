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
- ~~**"Buy Now" Checkout**~~ — **DONE.** `checkout/prepare` takes an `items` selection, and the PDP button adds its line then sends the buyer to `/checkout?buyNow=…`. The rest of the cart is untouched.
- **Four Minor Store Items** — Service-offering coverage read, `standardCode` filter, `viewer.canDelete` on Q&A, and `DELETE /products/:id` 500 on customized listings.
- ~~**§18 (Provider freight rate cards)**~~ — **DONE.** Backend routes plus the Studio composer at `/studio/logistics/rate-cards`, with the TSV paste box. A verified forwarder can publish a lane end to end. What remains is onboarding: until an organization holds a `verified` `freight_forwarder` or `logistics_operator` kind link, every call is a correct 403.

**Content & Launch Blockers:**

- **Blueprints Public Launch Step** — Currently de-indexed (`noindex` on 7 routes, excluded from `sitemap.ts`) because the 32 builds are seeded test fixtures. Real hardware teardowns must be published before removing `noindex` and restoring the sitemap.
- **In-Platform Rights Claims** — Currently uses a pre-formatted `mailto:` link. Needs an in-platform `blueprint_rights_claim` table and submission route.

**Platform & Media Capabilities:**

- **Video Transcripts & Paywalls** — Transcripts are mock placeholders (no Speech-to-Text ASR pipeline or table); `isPremium` has no entitlement or paywall model in the backend.
- **Third-Party Escrow & FX Adapters** — Escrow and FX adapters are deterministic fakes. The **logistics** adapter is a fake on purpose and stays one — see §4.

**R&D / Civic Pulse:**

- **Problem map basemap** — **Part 1 SHIPPED.** MapLibre over free keyless OpenFreeMap tiles behind `NEXT_PUBLIC_CIVIC_PULSE_MAPLIBRE`, static SVG as the fallback. The coarse map pin, the `domain` enum, the four-component feasibility readout and viewport-driven reads are open. One E2E assertion is flaky with the flag on and is left unchanged. See §19.
- **Problem map UI/UX** — **§19.4, §19.8 and §19.9 SHIPPED 2026-09-20.** The surface is now a
  map-first instrument at all three breakpoints, the page does not scroll, and `(home)` gained a
  fixed-height flex shell whose `<main>` is the scroll container. What remains of
  `docs/PROBLEM_MAP_UX.md` is §19.1, the coarse reporter pin. Also open: §19.10 and §19.11's two
  remaining defects.
- **Two E2E tests fail on `main`, and they are NOT a Civic Pulse problem.** `smoke.spec.ts:8` and
  `home-shell.spec.ts:19` both resolve the sidebar through `tests/pages/sidebar.po.ts:73`, which is
  `page.locator("aside")`. `AlphaBanner` is ALSO an `<aside>` (`alpha-banner.tsx:38`), so the
  locator matches two elements and Playwright's strict mode fails it. Measured at HEAD with every
  other change stashed: same two failures, so it predates the §19.4 work. The fix is one selector
  in the page object — which is a test edit, so it waits to be asked for.

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

### 2. "Buy Now" Single-Line Checkout — **SHIPPED**

The button was never `disabled` — it was rendered as the most prominent of the three CTAs with no
handler at all, so it looked more clickable than the controls that worked. It lives in
`src/components/home/store/cards/buy-action-buttons.tsx` (rendered twice by `product-detail.tsx`),
not in the detail page itself.

**Backend:** `PrepareCheckoutSchema` gained an optional `items`. Absent means the whole cart, so the
cart page is unchanged. A line is named by the tuple `(productId, variantId?, isSample?)` rather
than an id — the cart projection exposes no line id, and the cart is UNIQUE on that tuple, so it is
exact. A selector matching nothing is refused with `CHECKOUT_ITEMS_NOT_IN_CART` (422) rather than
narrowed.

⚠️ **AND CONFIRM NO LONGER EMPTIES THE WHOLE CART.** It deleted every line `WHERE cartId =
prepare.cartId`, which was harmless only while every prepare covered every line. Scoped, that same
statement would have made "buy one chair" silently discard the rest of the buyer's cart.
`pnpm db:smoke-scoped-checkout` is the guard: it buys one of two sellers' lines and asserts the
other survives.

**Frontend:** the button adds the line, awaits the write, then navigates — prepare names lines by
tuple, so arriving first would be refused for naming a line that does not exist yet. The scope
survives a re-prepare, or picking a freight mode would silently widen the checkout to everything.
The checkout page says when it is scoped and links to the full cart.

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
per-site read or a decision, not a mechanical fix. **Item 5 shipped 2026-09-18 and is kept as the
record of what was decided, not as open work.**

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
5. ~~**`dangerous-html-sink` ×2**~~ — **SHIPPED 2026-09-18. THE SINK IS GONE, NOT SANITIZED.**

    `blog-detail.tsx` and `press-detail.tsx` no longer contain a `dangerouslySetInnerHTML`. The CMS
    body is **GFM Markdown** and renders through `src/components/information/article-markdown.tsx`,
    which sets `skipHtml` (raw HTML is dropped, never escaped into view), an `allowedElements`
    allowlist with `unwrapDisallowed`, and a `urlTransform`. Measured against the live renderer:
    `<script>`/`<iframe>`/`<img onerror>` vanish, and `javascript:`, `data:` and protocol-relative
    `//host` addresses are stripped to `""`, which the `a` override renders as a plain `<span>`
    rather than an `<a href="">` that still looks clickable.

    **A sanitizer lost and stays lost.** DOMPurify needs `isomorphic-dompurify` for SSR and leaves a
    sink that has to remain correctly configured forever. No sanitizer dependency was added, and
    `react-markdown` + `remark-gfm` were already dependencies, so this cost nothing to install.

    **⚠️ NO IMAGES IN AN ARTICLE BODY, BY DESIGN.** `img` is absent from the allowlist. An article's
    image is `coverImage`, already a sized `next/image`; a body image carries no dimensions — the
    case `showcase-write-up.tsx` refuses outright because it shifts the page — and `next.config.ts`
    admits only `res.cloudinary.com` plus two OAuth avatar hosts anyway. Add them the day the CMS
    supplies a size contract, the way `writeUpImages` does. **Do not add a sizeless fallback.**

    **The second hole closed in the same pass.** `cmsFetch` took `schema: z.ZodType<T>` and
    `safeParse`s; the bare `const data: T = await res.json()` is gone, and `BlogPost` / `PressItem`
    are now `z.infer` of schemas rather than hand-written types. ⚠️ **Those schemas are permissive
    about FORMATS and strict about SHAPE on purpose** — `slug`, `publishedAt` and `body` are plain
    `z.string()`. A slug regex or `z.iso.datetime()` would turn a CMS that formats a date differently
    into a silent fall back to the invented mock articles, which is worse than rendering what it sent.
    All 21 tests in `src/lib/cms.test.ts` pass unmodified.

    ⚠️ **THE URL FILTER NOW LIVES IN `src/lib/markdown-safe-url.ts` AND IS SHARED.** It was local to
    `showcase-write-up.tsx`; two copies of the filter that stops `javascript:` reaching an `href` is
    the shape where one gets a fix and the other does not. Deliberate twins are fine for labels, not
    for this.

    ⚠️ **DO NOT "FIX" THE THIRD `dangerouslySetInnerHTML`.** `src/lib/structured-data.tsx:69` is
    JSON-LD and was already correct — it escapes `<` to `<` against a `</script>` breakout,
    documented at `:58-64`. It was not touched. React Doctor does not flag it and neither should
    anyone else.

    **Deliberately not carried over from the launch renderer:** the nesting-depth guard
    (`deepestWriteUpNestingDepth`, max 32). It stops a `RangeError` on deeply nested **maker UGC**;
    an article body is first-party editorial from a CMS the company chooses, and importing
    `@/lib/blueprints/` into `(information)` would couple two unrelated domains for a failure mode
    that is a 500 rather than an injection. **Add it the day the CMS accepts third-party submissions.**

    **Still open, and it is not this item:** once a real CMS is live, a malformed or failing upstream
    makes `cmsFetch` return `null` and the getters serve the four invented articles under the
    company's name. That is pre-existing behaviour on a non-2xx and on a network error too — the Zod
    parse only adds a third way to reach it — and it deserves its own decision rather than a quiet
    change.

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

#### Backend — **SHIPPED.** One new 5-file module, plus one the design did not foresee

`src/modules/store/fulfillment/commerce-provider-freight-rates.{routes,controller,service,schemas}.ts`
plus `-error-response.ts`, mirroring `commerce-freight-rates.*` exactly — and
`commerce-freight-rate-card-projection.ts`, which the staff service's private projection,
band-write gate and supersession transaction moved into so both surfaces share one copy rather
than two that can drift.

| Route                                                                  | Notes                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `GET /commerce/provider/freight-rate-cards`                            | Own cards only, keyset-paged; reuse the admin list projection |
| `POST /commerce/provider/freight-rate-cards`                           | Bands required in the same call (1..20), one transaction      |
| `PATCH /commerce/provider/freight-rate-cards/:rateCardId`              | Withdraw / retire only                                        |
| `POST\|PATCH /commerce/provider/freight-rate-cards/:rateCardId/breaks` | Staged cards only                                             |

**No customs-dwell routes.** `commerce_customs_dwell_estimate` has no provider column — it is scoped
by country and commodity and is platform-wide. A forwarder is not a broker. Dwell stays
`moderate_commerce`.

Guards, as shipped: `requireAuth` + **`requireActiveProviderCommerceOrganization`** on the route
(the design said the plain variant; the provider one is what `/commerce/provider/rfqs` already
carries and it narrows further), then **two in-service assertions** (the same placement
`moderate_commerce` already uses in `commerce-freight-rates.routes.ts`):

1. the caller's active organization owns the card's `providerOrganizationId`;
2. that organization holds a **`verified`** provider kind link of `freight_forwarder` or
   `logistics_operator` — strictly `verified`, not the directory's laxer
   "not rejected, not suspended".

⚠️ **ANOTHER PROVIDER'S CARD ANSWERS `404`, NOT `403`.** A 403 would confirm the card exists,
which makes the surface an id oracle for a rival's lane portfolio. The composer must not read a
404 as "deleted" — it also means "not yours".

⚠️ **UNTIL SOME FORWARDER IS `verified` FOR ONE OF THOSE KINDS, EVERY CALL IS A CORRECT 403.**
That is the remaining blocker and it is an onboarding one, not a code one.

⚠️ **`providerOrganizationId` IS DERIVED FROM THE SESSION AND NEVER READ FROM THE BODY.** A
submitted one lets a provider author a competitor's tariff, and `.strict()` refuses the field
rather than ignoring it.

⚠️ **`sourceForwarderName` IS DERIVED TOO, AND IS ALSO REFUSED IN A BODY.** The server writes the
caller's own organization display name. The composer must NOT render a "forwarder name" input —
it would 422 the whole submission.

Both refusals arrive as `errors.form` naming the key, not as a field-keyed error, because a
`.strict()` rejection is an object-level parse issue.

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

1. **`validFrom` is REQUIRED and must be in the future** — enforced at the schema AND re-checked
   in the service against the write's own clock, so a composer that posts a `validFrom` seconds
   away can still be refused. The admin controller defaults it to
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
   ⚠️ **THE SERVER ENFORCES THIS ON `PATCH .../breaks` TOO**, which the design did not spell out —
   replace-the-set is the only write that can DELETE the floor off a card that already had one, so
   the band editor must block that edit as well, not just the create form.
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

**As shipped:** `src/lib/store/freight-band-paste.ts`, six fixed columns with their units in the
header (`min kg · min cm³ · price per kg · min charge · days min · days max`), applied as a
whole-ladder replace rather than a merge.

⚠️ **THE UNIT CONVERSION IS THE DANGEROUS PART AND IS WHY IT IS A TESTED PURE FUNCTION.** The wire
is integer grams and integer cents; a tariff sheet is kilograms and currency units. A kg column read
as grams underprices a lane by 1000×, and the result sits INSIDE every bound the server checks — the
divisor range, the price floor, the band count — so nothing downstream would refuse it. Money is
therefore parsed from the string rather than through a float (`4.55 * 100` is `454.99999999999994`),
a third decimal is refused rather than rounded to a price nobody quoted, and a thousands separator
is refused rather than stripped (`1,234` is `1.234` in half the world).

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

#### Frontend — **SHIPPED**

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

### 19. Civic Pulse — the rest of the problem-mapping specs

**Part 3 shipped: the map-first shell (§19.8) and the chrome height (§19.9).** See those two items
for what was built and for the measurement that changed how §19.9 had to be done.

**Part 2 shipped: viewport-driven reads (§19.4).** `moveend` now drives the fetch, the panel count
is the server's `total` for what is on screen, the camera rides in `?lat&lng&z`, and the three
emptinesses are three different sentences. Four corrections came out of building it and are written
into items 1, 4 and 9 below — read them before the next part, because two of them were shipped bugs
that the design brief did not predict.

**Part 1 shipped: the vector basemap.** `/research-and-development/problem-map` renders MapLibre GL
over OpenFreeMap behind `NEXT_PUBLIC_CIVIC_PULSE_MAPLIBRE`, with the static SVG as the flag-off and
no-WebGL2 fallback. Free, keyless, no vendor. Details and the four decisions that came with the
specs are in `docs/R_AND_D_STRUCTURE.md` §6; each spec doc carries its own correction header.

⚠️ ~~**ONE E2E ASSERTION IS FLAKY WITH THE FLAG ON**~~ — **FIXED 2026-09-20**, with the §19.8 work
that would otherwise have broken it anyway. The assertion below was dropped; the test now asserts
only `button[aria-pressed]`, which is what it is actually about and is stable in BOTH renderers.
Measured 5/5 green with the flag on afterwards. Kept here as the record of what it was:

```ts
await expect(
    surface.main.getByRole("img", { name: "World map of reported problems" }),
).toBeVisible();
```

The surface deliberately renders `static` on the server and upgrades to `vector` after hydration
(so the server HTML and the hydration render agree — see §6), so that assertion raced the upgrade:
measured 1 failure in 5 runs against a flag-on dev server, 21/21 green with the flag off. It was
asserting WHICH RENDERER WON, which is not what the test is for and is not stable by construction.

⚠️ **THE UI/UX FOR ITEMS 1, 4, 8 AND 9 IS DESIGNED AND WRITTEN DOWN.**
`docs/PROBLEM_MAP_UX.md` is the brief: the map-first shell at three breakpoints, the state
table, the copy table, the pin's privacy mechanism and what a cluster pin is allowed to claim.
Read it before touching this surface. It is a design brief, not a decision log — where it and
the code disagree, the code wins and the brief gets corrected.

**1. The coarse map pin — SHIPPED 2026-09-20.** `report-problem-sheet.tsx` carries a Place block:
"Use my location", a tappable MapLibre map, a readout and Clear. `approxLatitudeMicrodegrees` /
`approxLongitudeMicrodegrees` are optional on `POST /discovery/problem-reports`, both or neither.

⚠️ **THE OPEN QUESTION THIS ITEM LEFT IS ANSWERED, AND THE ANSWER IS "NO".** It asked whether a
`LOCATION_NOT_FOUND` geocode should still kill a submission that came with usable coordinates. It
must, because **there is no reverse geocoder anywhere in the backend** and `regionId` is a pure
function of `countryCode`, which only forward-geocoding `locationText` produces. A region-less row
is not slightly worse — `recompute-opportunity-scores.ts` counts `distinct regionId` and NULLs are
skipped, so it scores **0 of 20** on the geographic-spread ladder, and `recompute-demand-signals.ts`
filters `regionId is not null`, so it is **absent from the region×category heatmap entirely**. A pin
that rescued a failed geocode would mint second-class records that look fine and rank like nothing.
So `locationText` stays required, the geocode still owns country/region/label, and the pin refines
**position only**.

⚠️ **"IT NEEDS NO MIGRATION" WAS WRONG AND THAT NOTE WAS MINE.** The existing
`latitude_microdegrees` / `longitude_microdegrees` do exist, but they are the clustering job's
OUTPUT — `MyProblemReportSchema` tells the reporter so ("server-geocoded and NULL until the job has
run"). Writing a client claim into them would make that sentence false and would show a reporter
their own pin as the resolved position. The pin got **its own pair** and **migration 0201**, on the
same declared-versus-measured separation `designationSource` enforces on a teardown's alloy.

**0201 IS APPLIED** (2026-09-20). `approx_latitude_microdegrees` / `approx_longitude_microdegrees`
and `problem_submission_approx_coordinate_ck` are live on the shared database; the two existing
`problem_submission` rows were untouched, the migration being additive and nullable.

⚠️ **APPLYING IT TOOK FOUR MIGRATIONS, NOT ONE, AND UNCOVERED A BACKEND BUG THAT HAD NOTHING TO DO
WITH THE PIN.** The database was at ledger row 197 while the journal was at 0201, and `drizzle-kit
migrate` selects everything newer than the ledger's MAX `created_at` — so 0198, 0199, 0200 and 0201
all ran as one batch. Applying 0201 alone was not an option: writing its ledger row by hand would
have pushed the max past the other three and made them **permanently inert**, which is the "gaps are
inert" failure this repo has hit before.

⚠️ **0198 COULD NEVER HAVE APPLIED ANYWHERE, AND STILL CANNOT WITHOUT THE FIX BELOW.**
`src/db/schema/home.ts` declared TWO `.unique()` constraints that drizzle auto-names identically:
`showcase_launch.headingImagePublicId` and `showcase_launch_heading_image.publicId` both derive
`showcase_launch_heading_image_public_id_unique`. A UNIQUE constraint creates an INDEX, and index
names are unique per SCHEMA rather than per table, so `CREATE TABLE showcase_launch_heading_image`
died with `42P07 relation "showcase_launch_heading_image_public_id_unique" already exists` against
any database holding the older column. Fixed by naming the new table's constraint explicitly —
`showcase_launch_heading_image_asset_public_id_unique` — in `home.ts`, in `0198_perfect_nightshade.sql`
and in the 0198–0201 snapshots. `db:generate` then reports no drift.
⚠️ **THE SNAPSHOT EDIT MUST PRESERVE KEY ORDER.** Reordering the `uniqueConstraints` map made drizzle
pair constraints positionally and propose moving the name onto `showcase_launch_write_up_image`,
which shares the identical doc comment and is easy to edit by mistake instead.

**THE WRITE PATH IS VERIFIED AGAINST THE REAL DATABASE** (2026-09-20) by
**`pnpm db:smoke-problem-pin`** (`scripts/smoke-problem-pin.ts` in the backend), on the
`smoke-scoped-checkout` precedent: the real `CreateProblemReportSchema`, then the real
`createProblemSubmission`, then a read-back, then a delete.

⚠️ **IT IS A SCRIPT RATHER THAN A UNIT TEST BECAUSE THE THING IT GUARDS ONLY EXISTS AGAINST A REAL
INSERT.** A unit test can check `quantizePublishedMicrodegrees` in isolation; it cannot check that
the service still CALLS it on the way to the column, which is the line an ordinary refactor would
drop. Unlike `smoke-scoped-checkout` it cleans up after itself — `problem_submission` carries no
append-only trigger, and a stray submission would be clustered and become a pin on the public map.

⚠️ **THE PIN WAS SENT DELIBERATELY OFF-GRID TO PROVE THE SERVER RE-QUANTIZES**, which is the half of
the mechanism a browser cannot be trusted with. `19076543 / 72877654` went in — what a hostile client
posts when it skips the rounding — and `19077000 / 72878000` came back out. On the same row
`latitude_microdegrees` and `country_code` stayed NULL, so a client claim reaches neither the job's
output nor the geography the opportunity score reads. `chooseSubmissionPoint` then preferred the pin
over a geocode 4 km away and ignored it against one in Delhi.

The row was deleted and the database is back to its prior 2 submissions and 2 clusters.

**The disagreement rule.** `chooseSubmissionPoint` (`submission-point.ts`, a pure module split out
so the radius comparison is testable without a database) takes the pin only when it is within the
matcher's own 25 km of the geocoded point. Beyond that the two describe different places and the
geocode wins, because it is what country and region were derived from — honouring a distant pin
would centre a row in one country while labelling it another. Nothing is refused over it: a
mis-tapped map is not worth failing a report for.

**Why this does not break §6.** §6 forbids client-claimed geography because `countryCode` feeds the
opportunity score. That stays server-derived and `countryCode` is still a 422. The pin only refines
where inside the geocoded place the report sits, and a reporter could already move their own report
anywhere on earth by typing different free text — this adds resolution, not a forgery surface. The
zero-trust sweep in `problem-clusters.controller.test.ts` keeps rejecting `countryCode`, `regionId`
and the resolved coordinates; its framing was rewritten to state the line.

**The privacy mechanism, which is the whole point.** `src/lib/rnd/report-pin.ts` rounds to 3 decimals
(~110 m) and is called IN the map click handler and INSIDE the `navigator.geolocation` success
callback, so a device-grade reading never reaches React state. The server re-quantizes on receipt
through the existing `quantizePublishedMicrodegrees`, because a client-side check is UX feedback and
never a control. No consent checkbox — `GEOLOCATION_PRIVACY.md` §4's tick-box promises a 90-day
purge nobody can keep and a "stored privately" claim that is false once nothing precise is stored.
One sentence under the map says the true thing instead.

**Measured, not assumed:** a tap produced `{approxLatitudeMicrodegrees: 33176000,
approxLongitudeMicrodegrees: 41217000}` against a readout of `33.176, 41.217`, and that exact
captured body was parsed by the real `CreateProblemReportSchema`. Clear removes both keys rather
than sending `undefined`. Every submit test ran with `fetch` stubbed, so nothing reached the
database — which is why the round trip below is still owed.

⚠️ **STILL OPEN: `GEOLOCATION_PRIVACY.md` §5's PII SCREEN.** Its correction header keeps it as
client-side UX feedback only. It is about the DESCRIPTION text rather than the pin, so it was not
bundled here, and it is unbuilt.

**1b. The 2D/3D view toggle — SHIPPED 2026-09-20, and why there is no satellite beside it.**

`/problem-map` carries a two-button control under MapLibre's zoom buttons: **2D** (default, pitch 0)
and **3D** (pitch 50). State is `useState`, like the tablet panel collapse — a way of looking at the
map rather than a property of what is being looked at, so it is in neither the URL nor the one
storage key.

⚠️ **3D COST NOTHING AND ADDED NOTHING.** `liberty` already ships a `building-3d` fill-extrusion
layer at `minzoom: 14`, wired to `render_height` / `render_min_height`. It renders nothing at pitch 0
because an extrusion seen from vertically overhead is its own footprint. So the toggle adds no layer,
no source, no key and no vendor — it stops looking straight down. Measured at z15.5 over Mumbai: 33
extruded buildings in view. **It only reads as 3D from z14**, which is where OpenFreeMap's vector
data ends; at country zoom it is a tilted flat map, and that is honest rather than broken.

⚠️ **SATELLITE WAS INVESTIGATED AND REFUSED ON LICENCE GROUNDS. DO NOT RE-RUN THIS.**
There is no raster source that is free, commercially licensed AND useful here:

| source                          | free                | commercial                                                                             | resolution      |
| ------------------------------- | ------------------- | -------------------------------------------------------------------------------------- | --------------- |
| EOX Sentinel-2 cloudless, 2017+ | yes                 | **NO — their WMTS capabilities mark `-2020`, `-2022`, `-2023`, `-2024` NonCommercial** | 10 m            |
| EOX Sentinel-2 cloudless, 2016  | yes                 | yes, CC-BY                                                                             | 10 m, and stale |
| Esri World Imagery              | keyless in practice | **ambiguous** — attribution plus, read strictly, an ArcGIS account                     | street level    |
| MapTiler / Mapbox / Bing        | free tier           | keyed, metered, billed                                                                 | street level    |
| Google                          | no                  | no                                                                                     | —               |

⚠️ **AND 10 m IS THE WRONG TOOL EVEN WHEN THE LICENCE IS CLEAN.** A pothole, a flooded underpass and
a dark streetlight are all invisible at 10 m per pixel, and those are the subject of this map.
Satellite here would be decoration carrying a licence liability. Google specifically is also barred
twice over: its ToS restricts showing Google tiles outside Google's own SDKs, and
`CIVIC_PULSE_PROBLEM_MAPPING.md` §3.1 already rejected the Maps API on cost and mandatory billing.
⚠️ **Gaode/AMap is a CORRECTNESS bug, not a preference** — Chinese basemaps use the mandated GCJ-02
datum, which shifts coordinates 50–500 m from the WGS-84 the centroids and pins are computed in.

**No disabled "Satellite" button was added**, and that was deliberate: `docs/Design.md` §6 bans
shipping a control with nothing behind it, and a greyed one teaches every reader about a licensing
problem that is not theirs. This entry is where the answer lives instead.

**Two things the toggle interacts with, both measured rather than assumed:**

- ⚠️ **A pitched camera returns a WIDER bounding box** — 1.82× the latitude span at pitch 50 — so the
  viewport-scoped read legitimately widens. Confirmed to settle at **exactly one extra fetch** per
  toggle; `easeTo` fires `moveend`, and §19.4's latch is what stops that feeding itself.
- ⚠️ **`aria-pressed` COULD NOT BE USED ON THE CONTROL.** On this surface `button[aria-pressed]` IS a
  cluster pin, and `tests/specs/rnd-backend.spec.ts` counts that selector to prove single-select — a
  pressed chrome button silently became a third pin and broke the test. It uses `aria-current`, which
  is also the correct semantic (a selection among a set, not an independent toggle) and matches
  `FilterChipRow`.

**Placement is top-right at every breakpoint**, under the zoom buttons, because the other three
corners are taken: the panel owns top-left, the legend bottom-left (measured 48px tall at `md`, where
it wraps rightward), the ODbL attribution the bottom edge, and under `md` the sheet covers everything
below its peek detent and moves between three of them.

**2. `research_category.domain` as a closed enum.**
Not a FK, not user-creatable — it is the comparability layer that lets one country's
`cold_storage_loss` roll up beside another's. Categories stay user-creatable; domain assignment is
moderated separately, so an unassigned category still pins and clusters and simply does not enter
the country matrix yet. Plus a nullable self-FK `parentCategoryId` for optional nesting, and stable
slugs as the durable identity with database-generated UUIDs. See `docs/PROBLEM_TAXONOMY.md`.

**3. The four-component feasibility readout.** Four bounded sub-scores, each with its own source
and `asOf`, never summed and with no verdict enum. See `docs/FEASIBILITY_MODEL.md`.

**4. Viewport-driven cluster reads — SHIPPED 2026-09-20.** `moveend` drives
`useProblemClustersQuery`, `problem-map-canvas` is `TRANSPORT: client-query`, and the count readout
is `pagination.total` for what is on screen. Four things were learned building it that the brief
did not predict. **Two were shipped bugs and the next part will meet both again.**

⚠️ **TRAP 1 — `fitBounds` IN THE MARKER EFFECT IS AN ENDLESS REFETCH LOOP.** That effect re-runs on
every `clusters` change, and `clusters` now changes because the reader panned: pan → refetch → new
array → effect → `fitBounds` → `moveend` → refetch, with no exit, because `fitBounds` is itself a
camera move. It is now latched to once per map instance and skipped outright when the URL carries a
camera. Do not remove `hasFittedToClustersRef`.

⚠️ **TRAP 2 — A CALLBACK PROP IN THE MAP-CREATION EFFECT'S DEPS DESTROYS AND REBUILDS THE MAP.**
Worse than trap 1 and it is the one that actually shipped. The effect listed `onUnavailable`, which
the parent passes as an inline arrow. That was harmless only while the parent barely re-rendered;
once it held a React Query subscription it re-rendered per fetch with a fresh closure, so the map
was torn down and recreated, and `createMap` ends in `setReadyMapToken` — so each rebuild scheduled
the render that caused the next. Measured: `Maximum update depth exceeded` ×129, `load` never
firing, and **every marker destroyed**, which removed `button[aria-pressed]` from the page and with
it both the keyboard path to the pins and the selector the E2E spec asserts on. Callbacks now go
through refs and **the creation effect's dependency array is empty and must stay empty.**
A fresh `[]` for the no-clusters case had the same shape of effect and is hoisted to `NO_CLUSTERS`.

⚠️ **TRAP 3 — `window.history.replaceState`, NOT `router.replace`.** `docs/PROBLEM_MAP_UX.md` §7
and §13 Q1 both say `router.replace`. Both avoid a history entry per drag, which is the property
the brief wanted, but `router.replace` to the same route also runs an RSC round-trip, so the server
component re-reads the whole cluster list on every gesture while the island fetches the same thing.
Measured after the fix: one request per gesture, `history.length` unchanged.

⚠️ **TRAP 4 — "IS THIS THE WHOLE WORLD" IS NOT HOW TO PICK THE EMPTY STATE.** The first cut decided
between "no clusters match these filters" and "no clusters in this view" by asking how WIDE the box
was, on the theory that a reader looking at the planet has nothing left to zoom out to. Measured,
the default camera renders a 629×269 canvas showing 180° of longitude and 68° of latitude, so no
sane threshold ever fired and a filter matching nothing anywhere told the reader to zoom out. The
discriminator is a FACT, not geometry: the server page already reads the same filters UNBOUNDED, so
`hasAnyClusterMatchingFilters` says whether matches exist at all and zoom is only ever the answer
when they exist somewhere else. Cold start needs its own unfiltered `limit: 1` probe for the same
reason — every other read on the surface is filtered, viewport-scoped or both, so zero is ambiguous.

⚠️ **KNOWN GAP, DELIBERATELY LEFT: A CATEGORY CHIP DROPS THE CAMERA.** The chips are server-rendered
`Link`s built from the server's `searchParams`, and the camera is written client-side by
`replaceState`, so the server never sees it and the hrefs carry no `lat/lng/z`. A chip click
therefore refits to the filtered clusters. That is defensible — you want to see where the matches
are — but it is NOT what `docs/PROBLEM_MAP_UX.md` §7 claims. Fixing it means the chips become
client controls, which is §19.8's panel work, not a patch here.

**5. Media on problem reports.** The backend pipeline exists — `sharp`, `multer`, `cloudinary`,
`src/lib/image.ts`, 21 other upload routes — but problem reports have no attachment route, table or
column. Until then `DATA_RETENTION.md`'s "Processed Problem Photos" row describes nothing.

**6. Tile tiers 2 and 3, and the abuse controls.** MapTiler hot-failover needs an account and a
public key with a metered quota; PMTiles-on-R2 is ~$1.50/month for a ~110 GB planet file. Neither is
worth it before the traffic exists — today three consecutive tile errors hand the surface back to
the static canvas. Altcha PoW and the honeypot from `CIVIC_PULSE_PROBLEM_MAPPING.md` §4 are also
unbuilt; the shipped abuse control is `requireIdentifiedUser` plus a 10-per-15-minutes limiter.

**7. Delete `src/types/research-and-development/discovery.ts`.** Dead legacy `ProblemReport` with
`mapPosition`, `reportCount` and `opportunityScore` — every one of which is gone from the wire. It
is imported by nothing.

**8. The map-first shell — SHIPPED 2026-09-20.** `/problem-map` fills the viewport and does not
scroll. A 360px panel floats over the canvas from `lg`, 320px collapsing to a 44px tab from `md`,
and a three-detent non-modal sheet under it. `MyProblemReportsPanel` moved to
`/research-and-development/my-reports` (on the `/applications` precedent: `instant = false`, and
`noindex` because a crawler gets nothing). The `h1` is `sr-only`; the standing note moved into the
panel. `?sort=` landed as a `FilterChipRow` over `PROBLEM_CLUSTER_SORTS`, `?cluster=` carries the
selection, and the default sort is written OUT of the URL.

⚠️ **THE CHIPS MOVED INTO THE PANEL AND THAT CLOSED §19.4's KNOWN GAP.** They are still `Link`s —
making them client controls would break two things, since `history.replaceState` does not re-run the
server component (so a client-written `?sort=` would never re-query) and `hasAnyClusterMatchingFilters`
would go stale the moment a filter changed. What changed is WHERE the href is built: the panel is a
client island, so it builds from the LIVE camera instead of the server's `searchParams`. Measured
after: a category chip click applies the filter and keeps `?lat&lng&z`.

⚠️ **TWO DEPARTURES FROM `docs/PROBLEM_MAP_UX.md` §5, BOTH MEASURED.**

1. **The standing note is in the scrolling body, not the fixed header.** §5 lists it among the
   header items AND requires the mobile peek detent to show the chips, the count and a row. Both
   cannot hold: the note is two lines, and pinned it pushed `Report a problem` off the bottom of the
   peek sheet — the one control a reporter standing at the broken thing came for. It is context
   rather than a control, so it moved to the content.
2. **The legend is offset past the panel, not at `left-0`.** §5 draws it bottom-left, which is also
   where the docked panel is; measured, the four labels rendered behind it.

⚠️ **THE SHEET IS NOT A MODAL AND MUST NOT BECOME ONE.** No scrim, no focus trap, no `inert`, no
body scroll lock — verified in the browser, not just intended. `RndSheet` and `ModalSheet` are all
four of those and could not be reused. The handle is a real `<button aria-expanded>` with Enter and
arrow-key detents; both existing sheets render a decorative `<span>` instead. At `full` the map
keeps 25% of the region (measured 135px of 539px) and there is no detent that covers it.

⚠️ **DO NOT COPY THETRAFFIC'S DISTANCE-FROM-CENTRE LIST ORDER.** `PROBLEM_CLUSTER_SORTS` is
`opportunity | recent | reporters` and carries no `distance`, so that ordering would be a client
sort over a fetched page. Distance ordering is item 10.

**Still not built here:** `easeTo` the centroid on selection (`docs/PROBLEM_MAP_UX.md` §6's
"Cluster selected" row). Every camera mutation interacts with the `fitBounds` latch and the
`moveend` refetch in item 4, and the row already highlights, so it was left rather than bolted on
at the end of a large change.

**9. The chrome height — SHIPPED 2026-09-20, AND NOT THE WAY THIS ITEM SAID.**

This item prescribed "a CSS custom property set where the banner is rendered, read by everything
that needs the chrome height". ⚠️ **THAT IS NOT EXPRESSIBLE AND THE MEASUREMENT IS WHY.**
`AlphaBanner` is **36px at 1440px and 56px at 500px** — its copy wraps, and `alpha-banner.tsx`
requires it to wrap rather than truncate because its only control is the last four words. There is
no literal to put in a token, and a hardcoded 92px would have left the map 20px too tall on a phone:
the page would scroll, on the one breakpoint the brief calls most broken. (This item also said
"roughly 37px"; it is 36 at desktop and not a constant at all.)

**What shipped instead is structural.** `(home)/layout.tsx` is now `flex h-dvh flex-col`: the navbar
and the banner take their natural heights, a `flex min-h-0 flex-1` row takes the remainder, and
`<main>` is the scroll container. No token, no `calc`, no runtime measurement, and the banner stays
a server component. A route that wants the viewport asks for `h-full`.

⚠️ **THE EARLIER DIAGNOSIS IN THIS ITEM WAS RIGHT BUT INCOMPLETE.** The sidebar's overshoot was
real — measured `scrollHeight` 767 against a 731 viewport, exactly the banner's height — and it was
transient only because the banner scrolled away. It is now zero at every scroll position.

⚠️ **`<main>` IS THE SCROLL CONTAINER NOW, WHICH HAS THREE CONSEQUENCES.** Audited before the
change: nothing under `src/components/home` or `src/components/commerce` reads `window.scrollY`,
`window.scrollTo` or listens for a window `scroll` — every listener is on an inner container.

1. Next's scroll-to-top on navigation targets the document and stopped working.
   `main-scroll-reset.tsx` restores it, keyed on `usePathname()` ONLY — never on search params,
   which is what preserves `FilterChipRow`'s deliberate `scroll={false}`.
2. `product-detail.tsx`'s gallery was `lg:sticky lg:top-16` to clear the navbar. The navbar is no
   longer in flow above it, so it is `lg:top-0`; an offset would have left a 64px gap.
3. `alpha-banner.tsx`'s comment listed eight sticky offsets a sticky banner would break. **None of
   them moved**, because the banner is not sticky — it is simply above the scrollport.

**10. Two backend asks this surface would use the day they exist.**
Neither blocks item 8 and neither may be faked client-side.

- **A `distance` sort on `GET /discovery/problem-clusters`**, ordered from a caller-supplied centre.
  It is what makes thetraffic's "near the map centre" list possible without sorting a fetched page
  in the browser.
- **The cluster match radius on the wire.** `submission-point.ts` matches within
  **25 km**, so a pin marks the middle of a catchment that may be 50 km across. A radius ring is the
  most honest possible rendering of that and it is the right eventual answer, but a hardcoded 25 km
  circle silently becomes a lie the day the backend tunes the constant. ⚠️ **Until the radius ships
  as data, draw no ring and print no accuracy figure.** thetraffic prints `±3911 m` because it holds
  a device accuracy reading; we hold none, and inventing one is the unattributed number PRODUCT.md
  bans.

**11. Four shipped defects on this surface — ALL FOUR CLOSED 2026-09-20.**

- ~~**Serif Boundary violation in two files**~~ — FIXED. ⚠️ **THE WIDER DOMAIN STILL BREAKS IT.**
  `rg font-serif src/components/home/research-and-development/` prints ~45 hits (`talent-page.tsx`,
  `market-research-page.tsx`, the heroes, the section headers). Real backlog, domain-wide sweep, not
  a Civic Pulse change. Do not use that bare `rg` as a green/red check for this surface.
- ~~**The cluster detail's four-panel `dl`**~~ — **FIXED.** One hairline `<dl>`, five facts, figures
  at body size.
  ⚠️ **IT BROKE §3 AS WELL AS §6, WHICH THIS ITEM NEVER SAID.** The figures were `text-xl
font-semibold` — a THIRD type size in a product the Two-Size Rule says is written at 14 and 12px.
  ⚠️ **AND THE FOUR WERE NEVER PEERS.** Three cells were counts; the fourth was two formatted
  timestamps, ~50 characters. Identical boxes claimed a symmetry the content did not have.
  **The row is `shared/hairline-definition-row.tsx`**, hoisted out of
  `blueprints/teardowns/sections/teardown-decision-row.tsx` — which was already this component, cited
  both bans in its own docblock, and now wraps the shared one. `filter-chip-row.tsx` is the hoist
  precedent. A second copy beside it is the shape where one gets a fix and the other does not.
  **A fifth fact appeared because the drop rule made room for it**: `Score computed` renders
  `formatIsoInstant(scoreComputedAt)` and **disappears** when that is null, which is what let the
  score cell stop carrying two `<dd>`s for one `<dt>`.
  ⚠️ **ONE DELIBERATE DEPARTURE FROM §5**: an unscored cluster still shows "Not scored yet" rather
  than dropping. A detail page is where a reader came FOR that number; silence there reads as a
  rendering fault. The rule is honoured on `scoreComputedAt`, which is absent rather than pending.
  **It also closed a third, unlisted defect**: that null said "Not computed yet" here and "Not scored
  yet" on the card and the preview. One state, one spelling now. `formatScorePoints` is untouched —
  its other callers are other domains.
  Figures are `tabular-nums`, NOT mono: §3 reserves Code type for "anything that must be copied
  exactly". **The centroid keeps mono** because it is, matching `place-picker.tsx`.
- ~~**`ProblemClusterList` renders its own empty state**~~ — FIXED.
- ~~**Hardcoded hex throughout**~~ — **FIXED.** 21 utilities across 10 components, plus the two band
  records. `#00696E` → `primary-imprint`, `#CAC4D0` → `outline-variant`. This surface is the FIRST
  consumer of tokens that had none. Verified identical in light mode: `bg-primary-imprint` computes
  to `lab(39.7064% -25.0424 -10.598)`, which is `#00696E`.

    **Four things stayed literal, each for a stated reason:**
    1. `ring-red-500` / `ring-amber-500` / `bg-red-100` / `bg-amber-100` — the `high` and `medium`
       bands. No token exists: `--destructive` means DESTRUCTION, and borrowing it for "high
       opportunity" makes a palette decision into a semantic lie.
    2. ⚠️ **`PIN_RING_CLASS.unscored` — AND THE DARK-MODE CHECK IS WHAT CAUGHT IT.** It was briefly
       `ring-outline-variant`; that token DARKENS in dark mode, and the ring is drawn on the DARK
       BASEMAP, so the pin and its legend swatch vanished into the ground. **A pin is not chrome** — it
       sits on somebody else's imagery whose dark variant is dark — so its colours must stay light in
       BOTH themes. Same reason the pin body is a literal `bg-white`. Measured before and after: the
       legend's fourth swatch was invisible, then legible at `#cac4d0`.
    3. `place-picker.tsx`'s `new Marker({ color: "#00696E" })` — MapLibre takes a colour VALUE and
       writes it into an SVG it builds itself. It never sees a class name.
    4. `bg-white` pin bodies and the sheet handle's `bg-black/15` — not hex, but equally un-themeable.
       Correct as-is; changing them is a design decision, not a conversion.

    ⚠️ **THE DARK CHECK §6 DEMANDS IS DEVTOOLS-ONLY, AND THAT IS NOT A SHORTCUT.** Nothing writes
    `.dark`: appearance was removed and "took the whole theme system with it". `classList` appears once
    in `src/` and it is a READ. So the check is `document.documentElement.classList.add("dark")` by
    hand — which also flips the basemap, since `isDarkThemeActive()` re-reads the class. It found a
    real bug (2 above), so it was worth running rather than waived.

⚠️ **FOLLOW-UP NOW THAT A SHARED ROW EXISTS.** Four R&D pages still carry the bordered-box recipe
verbatim — `talent-detail-page.tsx`, `supplier-detail-page.tsx`, `sections/market-research-overview.tsx`,
`sections/research-program-hero.tsx`. Each has its own null-copy vocabulary ("Not computed yet", "No
run yet", "Not published", "No minimum"), so migrating them is a per-page reading, not a sweep. They
can adopt `HairlineDefinitionRow` whenever somebody is in those files anyway.

⚠️ **THE MAPLIBRE WORKER IS COPIED INTO `public/` ON EVERY `dev` AND `build`, AND THAT IS LOAD-BEARING.**
`scripts/sync-maplibre-worker.mjs` exists because Turbopack breaks MapLibre's tile worker twice
over: `import.meta.url` is a `file://` URL so MapLibre derives an empty worker URL, and Turbopack's
own emitted copy of the worker keeps a relative `import "./maplibre-gl-shared.mjs"` that resolves to
a 404 against its content-hashed sibling. Both failures are SILENT — the map renders a shaded-relief
backdrop and simply never fetches a vector tile. If the basemap ever goes blank after a dependency
bump, check that script first; it throws on an unmet sibling import rather than letting the failure
reach a reader.

---

## Decisions Needed

- **Legal Entity Incorporation**: Settle legal name and jurisdiction to update `src/lib/site.ts`.
- **Payment Gateway Priority**: Confirm whether Stripe (international) or Razorpay (India) should be wired first.
- ~~**Freight Strategy**~~: **Settled 2026-09-18 — §18; backend shipped the same day.** Neither. Rate cards are not purchased and sellers do not set flat rates (a seller flat rate makes the seller the freight principal and can express neither a customs leg nor a two-leg journey). Approved forwarders author their own lanes through provider-scoped write routes.
- **Uncovered Inland Leg Freight Rule**: Settled in §16 — covered legs compose into `partialJourneys[]` with the missing leg named.
