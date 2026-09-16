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
- **§18 (Freight rate cards)** — Forwarder rate cards for international shipping lanes need to be purchased/populated.
- **Brand SVG Assets** — WhatsApp, X, and LinkedIn brand marks in `public/icons` for the share sheet.

**Commercial & Payment Rail (Top priority open build):**

- **Payment Gateway Integration** — Stripe (international card/bank rail) and Razorpay (India UPI/cards rail). The `fake` adapter is refuse-closed in production; real provider adapters, webhooks, and frontend checkout modals are unbuilt.
- **"Buy Now" Checkout** — Direct single-product checkout bypassing the multi-seller cart.
- **Four Minor Store Items** — Service-offering coverage read, `standardCode` filter, `viewer.canDelete` on Q&A, and `DELETE /products/:id` 500 on customized listings.

**Content & Launch Blockers:**

- **Blueprints Public Launch Step** — Currently de-indexed (`noindex` on 7 routes, excluded from `sitemap.ts`) because the 32 builds are seeded test fixtures. Real hardware teardowns must be published before removing `noindex` and restoring the sitemap.
- **In-Platform Rights Claims** — Currently uses a pre-formatted `mailto:` link. Needs an in-platform `blueprint_rights_claim` table and submission route.

**Platform & Media Capabilities:**

- **Video Transcripts & Paywalls** — Transcripts are mock placeholders (no Speech-to-Text ASR pipeline or table); `isPremium` has no entitlement or paywall model in the backend.
- **Third-Party Carrier & Escrow Adapters** — Logistics and escrow adapters are currently deterministic fakes.

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

### 18. Freight rate data

`delivery-sheet.tsx` and shipment leg calculation work. The routes, tables, and rating service all
exist, and the rate tables ship **empty by design** (A36). Every lane answers `no_active_rate_card` and
`shippingInCents` is permanently `0` until a forwarder lane list is purchased or imported.

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

### 1. Payment Gateway Integration (Stripe & Razorpay)

The platform currently operates on `direct_processor` and `FakeCommercePaymentProviderAdapter` (`commerce-payment-provider.adapter.ts`).
In production (`NODE_ENV=production`), the fake adapter throws `PROVIDER_UNAVAILABLE`. Stripe is an unhandled
placeholder branch, and Razorpay is not yet in the schema.

**Backend (`qatoto-backend`):**

- Install `stripe` SDK.
- Implement `StripeCommercePaymentProviderAdapter` implementing:
    - `createPaymentIntent`
    - `retrievePaymentIntent`
    - `createRefund`
    - `retrieveRefund`
- Add webhook endpoint `POST /commerce/webhooks/stripe` to handle:
    - `payment_intent.succeeded` -> transitions order to `confirmed`, updates ledger settlement.
    - `payment_intent.payment_failed` -> marks payment as failed.
    - `charge.refunded` -> updates order refund state.
- For India: Widen `CommercePaymentProviderName` to include `"razorpay"`, add `razorpay` SDK, order creation, and webhook signature verification.

**Frontend (`qatoto-frontend`):**

- In `src/components/commerce/sections/order-payment-panel.tsx`:
    - When payment intent is created, embed Stripe Elements (Card / Apple Pay / Google Pay) or open the Razorpay Checkout modal.
    - Confirm payment and poll intent status until settled.

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

### 4. Third-Party Carrier & Escrow Adapters

- **Carrier Integration**: `logistics-provider.adapter.ts` is currently a seam with a deterministic fake. To provide automated tracking numbers and shipping status updates, connect an aggregator or carrier API (e.g. Shiprocket, EasyPost, or FedEx).
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

## Decisions Needed

- **Legal Entity Incorporation**: Settle legal name and jurisdiction to update `src/lib/site.ts`.
- **Payment Gateway Priority**: Confirm whether Stripe (international) or Razorpay (India) should be wired first.
- **Freight Strategy**: Determine whether to purchase third-party rate cards or allow sellers to define flat-rate shipping directly on listings.
- **Uncovered Inland Leg Freight Rule**: Settled in §16 — covered legs compose into `partialJourneys[]` with the missing leg named.
