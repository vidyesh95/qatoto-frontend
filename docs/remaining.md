### Summary of Remaining Work, External Blockers & Architectural Decisions

#### 1. Payment Gateway & Marketplace Split (Top Production Blocker)

- **What is shipped**:
    - Full cart checkout, order generation, and double-entry ledger bookkeeping.
    - "Buy Now" express checkout for single listings.
    - **Razorpay is fully integrated**: 536-line direct `fetch` adapter (`RazorpayCommercePaymentProviderAdapter`), dual HMAC signature verification (webhook body and checkout handler), persistent webhook inbox (`commerce_payment_webhook_event`), and frontend modal in `OrderPaymentPanel`.
- **What is missing / blocking production**:
    - **⛔ Marketplace Payout Split**: Neither Razorpay nor Stripe may run in production without a marketplace split mechanism (Razorpay Route in India, Stripe Direct Charges globally). Without Route/Connect, captured buyer money settles into Qatoto's own account, violating Qatoto's strict policy against taking custody of user funds or operating as a merchant of record. `settlement_account_ref` and `application_fee_in_cents` columns currently have no writer on the Razorpay path.
    - **Stripe Adapter**: Stripe is listed as an enum label with no implementation code. If global card/bank processing is needed, an adapter using direct `fetch` and webhook handlers must be built.

#### 2. Shipping & Freight Rating

- **What is shipped**:
    - Transport mode selection (air, sea, rail, road) with multimodal journey composition.
    - Provider freight rate card database schema and rating service (`max(actual, volumetric)` weight basis).
    - Studio freight rate card composer at `/studio/logistics/rate-cards` with TSV paste for logistics operators.
- **What is missing**:
    - Forwarder onboarding: An organization must hold a `verified` `freight_forwarder` or `logistics_operator` link before publishing rate cards (currently returns 403).
    - Service-offering coverage read: Link service offering locations to buyer delivery destinations.
- **Decided: Not building it**:
    - Connecting third-party carrier APIs (FedEx, DHL, Shiprocket) is an explicit non-goal. Shipping is arranged between buyer and forwarder; `shippingInCents` is literal `$0` by design.

#### 3. Phone Verification (SMS)

- **What exists**: Email OTP login (via Brevo) and WebAuthn Passkeys.
- **What is missing**: Phone verification in Account Settings is disabled/read-only because the backend has no SMS gateway (e.g. Twilio or Msg91) configured, and Better Auth's `phoneNumber()` plugin is not active.
- **Open decision**: Determine whether phone verification is actually required. Authentication is already secured by email OTP and passkeys, and Qatoto runs no KYC and holds no funds.

#### 4. Blueprints Hub (Launch Blocked on Content & Indexing)

- **What exists**: Full UI, backend CRUD, 3D exploded view WebGL engine, and in-platform sworn rights claims (`POST /blueprints/teardowns/:slug/claims` reviewed at `/admin/rights-claims`).
- **What is missing**: All 32 current records are seeded test fixtures (`blueprint-seed-corpus.ts`).
- **Launch step**: Once real hardware teardowns and manufacturing case studies are submitted, remove `robots: { index: false, follow: false }` across all 7 blueprint pages and restore `/blueprints` entries in `src/app/sitemap.ts`.

#### 5. Video Transcripts, Search Analytics & Paywalls

- **What exists**:
    - YouTube embeds, chapters, and comments.
    - Creator-supplied transcripts (.srt / .vtt / pasted text) parsed server-side and rendered in the watch page's Transcript tab (shipped 2026-09-28).
    - Trending tags aggregated from hourly snapshots (shipped 2026-09-28).
    - Search query logging with weekly-salted hashing for "Everyone is searching for:" (shipped 2026-09-28).
    - Brand SVG assets for WhatsApp, X (Twitter), and LinkedIn in `public/icons/` wired into the share sheet (shipped 2026-09-29).
- **What is missing**:
    - Creator paywalls (`isPremium`) are hardcoded to `false` (no backend entitlement or paywall model).
- **Decided: Not building it**:
    - In-player caption authoring is an explicit non-goal; captions inside the video player are managed natively by YouTube.

#### 6. Legal & Policy Compliance

- **What exists**: Comprehensive Terms of Service and Privacy Policy rewrite (shipped 2026-09-28) covering B2B marketplace commerce, R&D ventures, and engineering blueprints. Sign-up consent links for Terms and Privacy Policy shipped 2026-09-29 (`sign-up.tsx`), and "Not legal, tax, or investment advice" notices were added to R&D equity surfaces (slice ledger, skills explainer, pie bake panel; shipped 2026-09-29).
- **What is missing**:
    - Legal entity details in `src/lib/site.ts` (`LEGAL_ENTITY_NAME`, registered address, jurisdiction) are marked `[TO BE CONFIRMED]`.
    - Terms acceptance recording: Backend migration and write path for `terms_accepted_at` and `terms_version` audit timestamp columns.
    - Data export service lags recent tables (orders, cart, R&D effort, claims, receipts, equity).
    - ~~Contradictory copy in `src/components/information/how-qatoto-works.tsx` (lines 37, 124) claiming Qatoto ships goods and handles returns must be corrected to match Terms clause 5.~~ (Fixed)

---

### Recommended Next Steps

1. **Phase 1: Marketplace Split & Payment Settlement**:
    - Wire Razorpay Route linked accounts (and Stripe Direct Charges if Stripe is added) to populate `settlement_account_ref` and `application_fee_in_cents`, allowing payments to be safely enabled in production.
2. **Phase 2: Legal Entity & Compliance Polish**:
    - Fill in company incorporation constants in `site.ts`.
    - Add `terms_accepted_at` backend migration and recording (sign-up consent links shipped 2026-09-29).
    - Update `data-export.service.ts` to cover orders and R&D entries.
    - ~~Align `how-qatoto-works.tsx` copy with marketplace terms.~~ (Completed)
    - ~~Add "Not legal, tax, or investment advice" notices to R&D equity pages.~~ (Completed 2026-09-29)
3. **Phase 3: Store & Civic Pulse Minor Gaps**:
    - Implement service-offering coverage read.
    - Fix moderation report dismissal bug for withdrawn answers.
    - ~~Add coarse reporter map pin to the Civic Pulse problem map.~~ (Completed 2026-09-20; place-picker fallback UI and error handling shipped 2026-09-29).
    - Feasibility readout: 3 of 4 pillars shipped 2026-09-29 (Need density, World Bank purchasing power, manufacturing; 4th pillar regulatory ease open).
4. **Phase 4: Blueprints Public Launch**:
    - Publish real hardware teardowns and remove `noindex` headers.
