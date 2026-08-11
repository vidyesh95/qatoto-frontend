# TODO — wire the store frontend to the Phase 20 backend

Written 2026-08-10, updated 2026-08-11. **Phases A and B are DONE and committed.** What is left is
Phase C, plus the carry-over at the bottom.

---

## Where things stand

`pnpm fmt && pnpm exec tsc --noEmit && pnpm lint && pnpm fmt:check && pnpm build` is **clean**, and
both uncalled-wrapper audits are **silent**. Mock component files under `src/components/home/store/`
went 4 → 3 (`dispute-detail.tsx` and the two `manufacturer-chat-sheet` files).

**Phase A shipped** (`a492ff4`). The five shipping facts are on `PublicProduct` (nullable) and
`CreateProductInput` (optional), `listingCompleteness` is parsed, the studio wizard has a packaging
fieldset in named units on the pricing step plus a server-derived checklist on review, and
`src/lib/products/publish-refusal.ts` classifies the 422 instead of flattening it to its first
sentence. `MutationNotice` renders `fieldErrors` including the reserved `form` key.

**Phase B shipped** (`d9b7903`). `src/lib/store/freight.schemas.ts` and
`src/lib/store/arrival-window.schemas.ts` transcribe the Phase 20 types; `delivery-sheet.tsx` is
rebuilt on `lanePlan`; `delivery-cost.tsx` opens it from the uncovered state too; and
`src/components/commerce/sections/order-arrival-window-panel.tsx` renders the window beside its
three components in the order page's Fulfilment tab.

**Beyond the agreed scope, three things were wired** because Phase B forced them —
`getOrder`, `getOrderFulfillment` and `cancelOrder`. A real arrival-window read keyed by a fixture
order id answers 404 forever, and a mock write beside a wired read turns a working button into a
broken one. `MOCK_ORDER_DETAILS_BY_ID` and `MOCK_ORDER_FULFILLMENTS_BY_ID` were deleted rather than
left as fixtures nothing resolves.

**Not yet done: the end-to-end pass against a running backend.** Every static check is green, but no
screen in Phases A or B has been exercised against live data. The six scenarios are at the bottom.

---

## The one fact that still shapes everything

**The rate tables ship empty, deliberately, with no seed** (A36). Today _every lane is uncovered_.

So the priced path is the rare one and **the named-absence path is the product**. Phases A and B were
built that way; Phase C's console is what would ever change it.

---

## Phase C — Admin freight console, plus the two missing read routes

The six admin routes are all **writes** (`POST`/`PATCH`). There is no GET/list for rate cards or
dwell estimates. All six live under `/commerce/admin/…` and carry
`requireAuth → commerceFreightRateWriteLimiter → compactBody → idempotency({ required: true, scope: "user" })`.
`moderate_commerce` is checked **in-service**, not by route middleware, so a 403 is a normal answer
rather than a routing failure.

- [ ] Write **§19.10** into `docs/STORE_BACKEND_STRUCTURE.md` specifying the two absent reads:
      `GET /commerce/admin/freight-rate-cards` (filter by lane/mode/provider/state, cursor-paged)
      and `GET /commerce/admin/customs-dwell-estimates`. Say why: **POST supersedes silently**, so a
      console that cannot list current coverage invites an admin to replace a live card without
      knowing it existed. Add a §6.8 row per A35's rule. **§19.10 is a free slot** — the section list
      ends at 19.9b, so there is nothing to overwrite.
- [ ] `src/lib/store/admin-freight.api.ts` + `.schemas.ts`, mirroring `admin-categories.api.ts`.
      **Reuse `FREIGHT_MODES` from `src/lib/store/freight.schemas.ts`** — it is already the correct
      four-member tuple.
- [ ] `/admin/freight` under `src/app/(admin)/admin/`, following the `store-categories` precedent
      (thin `page.tsx` with `export const instant = false`, all the markup in
      `src/components/admin/freight/`). Until §19.10 ships, the list view renders an explicit
      **"no read route yet"** state — not a fake empty list.
- [ ] Forms must encode the append-only rule, because `.strict()` will 422 otherwise:
    - Create takes the card **and its 1..20 bands in one submit** (`breaks` is required on create —
      a two-call create leaves a window where the incumbent is closed and the successor prices
      nothing).
    - PATCH is a discriminated union: `{ intent: "shorten_window", validUntil }` or
      `{ intent: "withdraw", reasonNote }` (`reasonNote` required, 1..1000). Lane, mode, currency,
      `validFrom`, `sourceForwarderName` and price are **absent from the edit form entirely**.
    - Dwell create sends **explicit `null`**, never omission, for `originCountryCode` and
      `commodityScopeCategoryId` — omission would silently broaden the claim. It also refuses
      `origin === destination`: a domestic lane has no customs leg.
    - `volumetricDivisorCm3PerKg` required, 100–20000, **must not be pre-filled** — it varies by
      forwarder. Show conventions as guidance (ocean W/M 1000, road ~3000, air 5000–6000).
    - Bands carry no `position` in the body; array order is authoring order. `unitPriceInCents` is
      `min(1)` — a zero unit price is §19.6's forbidden zero — and is **cents per kilogram of
      chargeable weight**, not per shipment.
- [ ] Idempotency-Key on all six writes — but **`useResettableAttemptIdempotencyKey()`, NOT
      `useAttemptIdempotencyKey()`**. This is a correction to the original plan. The one-shot hook is
      right for composers that navigate away after a single submit; an admin console posts a SECOND
      rate card without unmounting, and a key that never rotates makes the backend dedupe that second
      card into silence. Rotate only after a confirmed success, never on failure.
- [ ] `409 COMMERCE_FREIGHT_RATE_CARD_IN_FORCE` is **not retryable** — a live card's bands are
      frozen. **The backend's own message already reads "…its bands are frozen. Post a new card to
      correct it."**, so render `message` rather than authoring that guidance client-side. There is
      exactly one `..._IN_FORCE` code, not several. The other 409s are
      `COMMERCE_FREIGHT_RATE_CARD_NOT_ACTIVE`, `COMMERCE_CUSTOMS_DWELL_OVERLAPS` and
      `COMMERCE_CUSTOMS_DWELL_ALREADY_CLOSED`.

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
- Enum values snake_case **verbatim**. Note `chargeableWeightBasis`, `FreightRatingUnavailableReason`
  and `JourneyUnpriceableReason` are **TypeScript-only unions computed at read time** — there is no
  pgEnum behind them, so transcribe from the service source, not from `schema.ts`.
- Update the `TRANSPORT:` banner on line 1 of every file touched — and do not spell the mock marker
  in prose, or the repo's own `rg` check reports the file as unwired forever.
- **No tests** unless explicitly asked (CLAUDE.md).

---

## Verification

```bash
pnpm fmt && pnpm exec tsc --noEmit && pnpm lint && pnpm fmt:check && pnpm build
```

Uncalled-wrapper audit — must stay silent (note `--no-filename`; without it `rg` prefixes every hook
name with its path and the loop reports all of them as uncalled):

```bash
for h in $(rg --no-filename -o 'export function (use\w+)' -r '$1' src/hooks/store/ | sort -u); do
  rg -q "\b$h\b" src/components || echo "UNCALLED $h"; done
for f in $(rg --no-filename -o 'export (?:async )?function (\w+)' -r '$1' src/lib/store/*.api.ts | sort -u); do
  rg -q "\b$f\b" src/hooks src/components src/app || echo "UNCALLED-API $f"; done
```

### End to end, backend running — NOT YET DONE for Phases A and B

1. Publish a draft with packaging missing → button disabled naming the missing fields (edit mode) or
   a 422 that names them (create mode); fill the five → publish succeeds.
2. Enter two of three dimensions → refused before the request, naming the all-or-nothing rule.
3. Delivery sheet with empty rate tables (today's state) → named reasons + `quotableProviders`
   linking to an RFQ. Never blank, never `$0`, never a date. **Opens from the uncovered state too.**
4. Order page → components rendered beside the window; no `?mode=` ⇒ `mode_not_selected` with the
   covered modes offered as buttons.
5. Load a card through the admin console (Phase C), re-open the sheet → per-mode options each showing
   the forwarder, `validUntil`, "subject to re-measurement", and the chargeable-weight basis.
6. PATCH a live card's bands (Phase C) → `409 …_IN_FORCE` rendered as the backend's own sentence.
7. Force a `.strict()` refusal (send an unknown key) → `MutationNotice` shows `errors.form`
   unlabelled, and the wizard's `invalid` refusal shows the per-field entries.

Scenario 3 is the one to check first — with no rate cards loaded it is the only path that exists.

---

## Does it behave like Alibaba?

§19.9 did this comparison; it holds up against the shipped code. **Mostly yes, stricter in four
places.**

Matches: no delivery date until a rated option is selected; per-mode options carrying a price _and_ a
transit range; the buyer picks the mode and the server never does; tiered manufacturing lead time; a
weight-band ladder with per-unit rate and minimum charge; provenance and expiry on every quoted
number; a refusal that offers an RFQ route rather than a blank.

| Deliberately stricter                                                 | Alibaba                                                               | Cost                                                                                                                                             |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Below the smallest band yields **no option** (`below_smallest_break`) | Applies the band's minimum charge                                     | A 5 kg parcel against a 45 kg-floor card shows an uncovered lane where Alibaba shows a price                                                     |
| **Currencies never converted** (`no_common_currency_across_legs`)     | Converts and shows the rate                                           | A USD ocean card + a EUR inland card is unpriceable, though both are real prices                                                                 |
| An uncovered inland leg makes the **whole journey** unpriceable       | Sells the international leg port-to-port, because it models Incoterms | **Largest practical divergence.** On most lanes no forwarder sells a domestic card in the destination country, so a good ocean rate goes unshown |
| **Customs dwell exposed as its own component**                        | Bundles it, or sells DDP                                              | None — _more_ transparent than Alibaba, and intended                                                                                             |

Three of the four are correct for a marketplace that is not a principal. The third is a genuine
product problem rather than a purity win, and §19.9 agrees: "the fix is an Incoterm concept, not a
rate table." Nothing in the shipped client works around it — faking a port-to-port render would be
the client deciding an Incoterm.

---

## Decisions for Vidyesh, separate from the code

- **The uncovered-inland-leg rule.** Until it is settled, most real lanes will show nothing _even
  after_ rate data is bought. Worth deciding before spending on cards.
- **Below-smallest-band yields no option.** One reviewable row per card
  (`minBillableWeightGrams: 0`) closes it — a data decision, not code.

---

## Deferred — named so it is not lost

- The **10** remaining `resolveMockRead` api modules: cart, rfqs, quotes, providers, factories,
  forum, cofounders, factory-profile, admin-community, admin-site-audits. `orders.api.ts` is now
  PARTIAL — the one-order surface is wired, the two **lists**, the delivery-address reveal and the
  service engagements are not. The lists are their own piece of work rather than a swap:
  `OrderListPageSchema` is cursor-paged and its fixtures have never been checked against a live
  response.
- `checkout/prepare`'s `arrivalWindows` — blocked on `cart.api.ts`. Note the backend builds it with
  `projectPrepareArrivalWindow`, where the window is **always null** and only `missingComponents` is
  meaningful; the components are what let a checkout sheet say "ships in 15–25 days · 24–34 days at
  sea · 3–10 days clearance" without printing a date.
- `dispute-detail.tsx` — its banner says the endpoint does not exist; **it does** (A28,
  `GET /commerce/disputes/:disputeId`).
- `catalog-breadcrumb.tsx` — its TODO asks for category `ancestors[]`; **that shipped**.
- The messaging domain (`manufacturer-chat-sheet`) — still the largest unbuilt surface.
- Duplicate delivery-estimate schemas in `products.schemas.ts` and `cart.schemas.ts` — four
  identical shapes in two places; consolidate when cart is wired.
- **`ShipmentLegSchema.mode` in `fulfillment.schemas.ts` is over-wide.** It parses with the
  five-member `FREIGHT_TRANSPORT_MODES`, but the column is `commerce_shipment_leg_mode`, which has
  four. Harmless today — `multimodal` simply never arrives — but it is a second vocabulary that
  disagrees with the database, which is the class of bug the wire-casing rule exists to prevent.
