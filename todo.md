# TODO — wire the store frontend to the Phase 20 backend

Written 2026-08-10. Scope agreed: §19 delivery surface + the publish fix + the failing check.
The 11 remaining `resolveMockRead` api modules stay carry-over (listed at the bottom).

---

## Where things stand

Done and green: the legacy parallel fetcher is gone, `/store/home` and
`/store/organizations/:slug` are wired, and the product detail page reads the real backend across
five endpoints. Mock files under `src/components/home/store/` went from 26 to 4.

Backend Phase 20 (`0106`–`0109`) shipped: lane rate cards, customs dwell, chargeable weight, the
rating service, the arrival window, six admin routes. `db:verify-store-phase-20-constraints`
passes 17/17. `delivery-sheet.tsx` is unblocked — §19.7 names it.

**Checks right now:** `tsc`, `oxlint` and `pnpm build` are clean. `pnpm fmt:check` **fails** on
`docs/STORE_BACKEND_STRUCTURE.md` — the doc edit is unformatted. `pnpm fmt` clears it.

---

## The one fact that shapes the whole delivery build

**The rate tables ship empty, deliberately, with no seed** (A36). Today _every lane is uncovered_.

So the priced path is the rare one and **the named-absence path is the product**. This work is
judged on how well it renders `unavailableReasons`, `unpriceableReasons`, `missingComponents` and
`quotableProviders`. A blank panel is the failure mode, not an acceptable default.

---

## Phase A — Unbreak publishing, and fix the failing check

**§19.9a made five shipping facts required to publish, and the frontend has none of them.**
`src/lib/products/schemas.ts` carries no packaging fields and there is no packaging input anywhere
under `src/components/studio/`. Every publish returns a 422 the seller cannot see or fix.
Verified: `projectListingCompleteness` at `products.service.ts:261`, exposed as
`PublicProduct.listingCompleteness` at `:408`.

- [ ] `pnpm fmt` — clears the only failing check in the repo.
- [ ] Add the five facts to `src/lib/products/schemas.ts`: `packageLengthMm`, `packageWidthMm`,
      `packageHeightMm`, `packageGrossWeightGrams`, `unitsPerPackage`. **Nullable** on
      `PublicProduct`, **optional** on create/update — drafting stays free.
- [ ] Parse `listingCompleteness` (shape below). One projection feeds both the 422 and the
      seller's checklist, so the form cannot disagree with the button.
- [ ] Packaging fieldset in `src/components/studio/pages/create-listing-page.tsx`, in named units
      (mm, grams, count) — never a formatted string.
- [ ] New `src/lib/products/publish-refusal.ts`, mirroring the existing
      `src/lib/videos/publish-refusal.ts` closely: `describeProductPublishRefusal(error)` returning
      a discriminated union, and `describeProductPublishBlock(product)` that disables the button
      _before_ the request off `listingCompleteness`. **Reuse that file's shape and its
      `MISSING_FIELD_LABELS` idea** — it already solves this exact problem for videos.
- [ ] Honour §7.1 in `src/components/home/store/shared/mutation-notice.tsx`: render `message`, and
      `errors.form` when present. Today an object-level `.strict()` refusal reaches the user as a
      sentence naming nothing. `research-and-development/sections/mutation-feedback.tsx` already
      renders `fieldErrors` — align the two.

`listingCompleteness` shape:

```text
{
  requirements: [{ key, state, missingFields }],
  requirementCount, applicableRequirementCount, satisfiedRequirementCount,
  isComplete,
}
key   ∈ title | price | images | samplePrice | shippingFacts
state ∈ satisfied | missing | not_applicable
```

---

## Phase B — The delivery surface

### B1. Schemas and api

- [ ] Extend `src/lib/store/products.schemas.ts` / `products.api.ts`. `data.estimates` is
      **byte-identical**; `lanePlan` is a new sibling, so the page schema grows a field.
- [ ] **Parse `lanePlan` as nullable.** The doc says never-null on a 200; the code
      (`planFreightJourney`) returns `FreightLanePlan | null` when the seller's origin country is
      unresolved. Code wins.
- [ ] Transcribe using the **backend's** type names, which differ from the doc's prose:
      `FreightLanePlan`, `FreightLegPlan`, `FreightOption`, `ProviderFreightQuote`,
      `QuotableFreightProvider`, `FreightJourneyProjection`, `FreightJourneyLegSelection`.

    - `lanePlan.contracting.party: "provider"` — stated **once** per plan, not per row.
    - `legs[]` — at most 2; `kind ∈ international | inland_destination | domestic`; `sequence`;
      `originLocality`/`destinationLocality` are **labels only**, never a lane key.
    - `legs[].options[]` — `mode`, `transitDaysMin/Max`, `rateCardId`, `rateBreakId`,
      `chargeableWeightGrams`, `chargeableWeightBasis`, and `providerQuote`.
    - `providerQuote` — `priceInCents`, `currency`, `providerOrganizationId`, `sourceForwarderName`,
      `validUntil`, `subjectToRemeasurement: true`. **There is no price at option level. Do not
      flatten this when typing it** — the nesting is the mechanism (§19.9b).
    - `journeys[]` — `currency`, `primaryMode`, `totalInCents`, `transitDaysMin/Max`, `validUntil`,
      `legSelections[]` (chargeable weight is **per leg** — two legs legitimately differ).
    - `unpriceableReasons[]` — discriminated on `kind`: `leg_uncovered` (+ `legSequence`, `reasons`),
      `no_common_currency_across_legs`, `origin_country_unresolved`.
    - `quotableProviders[]` — present **even when nothing priced**.

- [ ] New `getOrderArrivalWindow(orderId, { mode? })`. Two gotchas: the route carries
      `requireActiveCommerceOrganization`, and the payload **double-nests** — the date pair is
      `data.arrivalWindow.arrivalWindow`.
- [ ] Reuse `FREIGHT_TRANSPORT_MODE_LABELS` / `_ICONS` from `src/lib/store/labels.ts` instead of
      the sheet's hardcoded mode names.

### B2. `delivery-sheet.tsx` — the held sheet

Today it takes only `{ onClose }`, hardcodes two legs with invented prices, **names two real
forwarders (Sinotrans, DHL) against fabricated rates**, and sums `priceUsd` floats in the browser.

- [ ] Replace all of it with the `lanePlan` that `delivery-cost.tsx` already fetches, passed down.
- [ ] Render per-leg `options[]`. **Nothing is auto-selected** — "no mode chosen yet" is a real
      state, not an empty one.
- [ ] **Never sum.** Use `journeys[].totalInCents` and `journeys[].transitDaysMin/Max`.
- [ ] Every price renders **through** `providerQuote`: forwarder name, `validUntil`, and "subject
      to re-measurement at pickup" in the same visual unit as the number.
- [ ] Show `chargeableWeightBasis` beside the price — a buyer whose 20 kg bills as 3,000 kg reads a
      correct volumetric charge as an error otherwise.
- [ ] **Today's actual path:** no cards ⇒ `options: []` + named reasons + `quotableProviders` as a
      route into `/store/rfqs/new`.

### B3. `delivery-cost.tsx` and the order page

- [ ] `delivery-cost.tsx` keeps working against `estimates`, gains a `lanePlan` summary. Still no
      date, still no zero. It currently opens the sheet **only in the `ready` state** — change
      that; the sheet is now most useful precisely when nothing priced.
- [ ] Add the arrival window to `src/components/commerce/order-detail.tsx`, which today shows no
      delivery estimate at all. Components are **discriminated unions on `status`**, never nullable
      objects. Render them **beside** the window, not collapsed into it.
    - `arrivalWindow: null` ⇒ `missingComponents` names which of `manufacturing | freight | customs`.
    - `customs` `not_applicable/domestic_lane` (window still closes) vs
      `unknown/no_dwell_estimate_for_lane` (window cannot close) must read **differently**.
    - `clockStartAt` and `orderPlacedAt` are **different instants**; the gap is meant to be legible.
    - No `?mode=` ⇒ freight is `unknown / mode_not_selected` with `availableModes` — offer them.

---

## Phase C — Admin freight console, plus the two missing read routes

The six admin routes are all **writes**. There is no GET/list for rate cards or dwell estimates.

- [ ] Write **§19.10** into `docs/STORE_BACKEND_STRUCTURE.md` specifying the two absent reads:
      `GET /commerce/admin/freight-rate-cards` (filter by lane/mode/provider/state, cursor-paged)
      and `GET /commerce/admin/customs-dwell-estimates`. Say why: **POST supersedes silently**, so a
      console that cannot list current coverage invites an admin to replace a live card without
      knowing it existed. Add a §6.8 row per A35's rule.
- [ ] `src/lib/store/admin-freight.api.ts` + `.schemas.ts`, mirroring `admin-categories.api.ts`.
- [ ] `/admin/freight` under `src/app/(admin)/admin/`, following the `store-categories` /
      `site-audits` precedent. Until §19.10 ships, the list view renders an explicit **"no read
      route yet"** state — not a fake empty list.
- [ ] Forms must encode the append-only rule, because `.strict()` will 422 otherwise:
    - Create takes the card **and its 1..20 bands in one submit** (`breaks` is required on create).
    - PATCH is a discriminated union: `{ intent: "shorten_window", validUntil }` or
      `{ intent: "withdraw", reasonNote }`. Lane, mode, currency, `validFrom`, `sourceForwarderName`
      and price are **absent from the edit form entirely**.
    - Dwell create sends **explicit `null`**, never omission, for `originCountryCode` and
      `commodityScopeCategoryId` — omission would silently broaden the claim.
    - `volumetricDivisorCm3PerKg` required, 100–20000, **must not be pre-filled** — it varies by
      forwarder. Show conventions as guidance (ocean W/M 1000, road ~3000, air 5000–6000).
    - Bands carry no `position` in the body; array order is authoring order.
- [ ] Idempotency-Key on all six writes, **user-scoped**, via `useAttemptIdempotencyKey()`.
- [ ] `409 …_IN_FORCE` is **not retryable** — a live card's bands are frozen. Guide to "post a new
      card", never "try again".

---

## Rules that apply throughout

- `unknown` → Zod `.strip()` → tagged `ActionResponse<T>` → discriminated-union view state →
  exhaustive `switch` with `const exhaustiveCheck: never`. No `as`, no `any`.
- **A price renders only through `providerQuote`.** Qatoto sells no freight.
- **Never sum legs, components or currencies.** The server returns the totals.
- **A missing component is named** — never defaulted, averaged or extrapolated.
- **Never render a zero or a date** where the server returned an absence.
- **Do not filter options by card `state` client-side** — the server's read predicate is
  window-based, so a live option may legitimately come from a `superseded` card.
- **Do not order bands by `position`** — floors define the ladder; `position` is authoring order.
- Enum values snake_case **verbatim**, read off the backend's `src/db/schema.ts`. (Last round the
  doc's prose said `upload` where the pgEnum is `file_upload`; the schema won.)
- Update the `TRANSPORT:` banner on line 1 of every file touched.

---

## Verification

```bash
pnpm fmt && pnpm exec tsc --noEmit && pnpm lint && pnpm fmt:check && pnpm build
```

Uncalled-wrapper audit — must stay silent:

```bash
for h in $(rg --no-filename -o 'export function (use\w+)' -r '$1' src/hooks/store/ | sort -u); do
  rg -q "\b$h\b" src/components || echo "UNCALLED $h"; done
for f in $(rg --no-filename -o 'export (?:async )?function (\w+)' -r '$1' src/lib/store/*.api.ts | sort -u); do
  rg -q "\b$f\b" src/hooks src/components src/app || echo "UNCALLED-API $f"; done
```

End to end, backend running:

1. Publish a draft with packaging missing → button disabled naming the missing fields; fill the
   five → publish succeeds.
2. Delivery sheet with empty tables (today's state) → named reasons + `quotableProviders` linking
   to an RFQ. Never blank, never `$0`, never a date.
3. Load a card through the admin console, re-open the sheet → per-mode options each showing the
   forwarder, `validUntil`, "subject to re-measurement", and the chargeable-weight basis.
4. PATCH a live card's bands → `409 …_IN_FORCE` rendered as "post a new card".
5. Order page → components beside the window; no `?mode=` ⇒ `mode_not_selected` + covered modes.
6. Force a `.strict()` refusal → `MutationNotice` shows `errors.form`.

---

## Does it behave like Alibaba?

§19.9 did this comparison; it holds up against the shipped code. **Mostly yes, stricter in four
places.**

Matches: no delivery date until a rated option is selected; per-mode options carrying a price
_and_ a transit range; the buyer picks the mode and the server never does; tiered manufacturing
lead time; a weight-band ladder with per-unit rate and minimum charge; provenance and expiry on
every quoted number; a refusal that offers an RFQ route rather than a blank.

| Deliberately stricter                                                 | Alibaba                                                               | Cost                                                                                                                                             |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Below the smallest band yields **no option** (`below_smallest_break`) | Applies the band's minimum charge                                     | A 5 kg parcel against a 45 kg-floor card shows an uncovered lane where Alibaba shows a price                                                     |
| **Currencies never converted** (`no_common_currency_across_legs`)     | Converts and shows the rate                                           | A USD ocean card + a EUR inland card is unpriceable, though both are real prices                                                                 |
| An uncovered inland leg makes the **whole journey** unpriceable       | Sells the international leg port-to-port, because it models Incoterms | **Largest practical divergence.** On most lanes no forwarder sells a domestic card in the destination country, so a good ocean rate goes unshown |
| **Customs dwell exposed as its own component**                        | Bundles it, or sells DDP                                              | None — _more_ transparent than Alibaba, and intended                                                                                             |

Three of the four are correct for a marketplace that is not a principal. The third is a genuine
product problem rather than a purity win, and §19.9 agrees: "the fix is an Incoterm concept, not a
rate table." Nothing in this plan works around it on the client — faking a port-to-port render
would be the client deciding an Incoterm.

---

## Decisions for Vidyesh, separate from the code

- **The uncovered-inland-leg rule.** Until it is settled, most real lanes will show nothing _even
  after_ rate data is bought. Worth deciding before spending on cards.
- **Below-smallest-band yields no option.** One reviewable row per card
  (`minBillableWeightGrams: 0`) closes it — a data decision, not code.

---

## Deferred — named so it is not lost

- The 11 `resolveMockRead` api modules: cart, orders, rfqs, quotes, providers, factories, forum,
  cofounders, factory-profile, admin-community, admin-site-audits.
- `checkout/prepare`'s `arrivalWindows` — blocked on `cart.api.ts` above.
- `dispute-detail.tsx` — its banner says the endpoint does not exist; **it does** (A28,
  `GET /commerce/disputes/:disputeId`).
- `catalog-breadcrumb.tsx` — its TODO asks for category `ancestors[]`; **that shipped**.
- The messaging domain (`manufacturer-chat-sheet`) — still the largest unbuilt surface.
- Duplicate delivery-estimate schemas in `products.schemas.ts` and `cart.schemas.ts` — four
  identical shapes in two places; consolidate when cart is wired.
