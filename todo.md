# TODO — the store frontend is wired

Written 2026-08-10, rewritten 2026-08-12. **Every store api module reads and writes the real
backend.** `src/mocks/store/` no longer exists and neither does `src/lib/store/mock-transport.ts`.

---

## Where things stand

```bash
pnpm fmt && pnpm exec tsc --noEmit && pnpm lint && pnpm fmt:check && pnpm build
```

Clean. Both uncalled-wrapper audits silent. Backend: `tsc` + `oxlint` clean, **2030/2030** unit
tests, **71/71** phase 17–19 smoke checks.

**`rg -l "TRANSPORT: mock" src/` returns five files, all VIDEO-domain** — `watch/comments.tsx`,
`watch/share-sheet.tsx`, `watch/watch-content.tsx`, `studio/series/series-editor-modal.tsx`,
`lib/videos/studio-view.ts`. The store surface has none.

| Pass                | What shipped                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Phase A (`a492ff4`) | The five shipping facts, `listingCompleteness`, the packaging fieldset, `publish-refusal.ts`                              |
| Phase B (`d9b7903`) | `freight.schemas.ts`, `arrival-window.schemas.ts`, `delivery-sheet.tsx` on `lanePlan`                                     |
| Buyer path          | Cart, checkout, order lists, address reveal, the whole payment surface. Verified end to end                               |
| Store wiring        | 11 mock modules swapped, 35 contract drifts fixed, 6 backend gaps closed, 3 stale-banner surfaces rebuilt, 6 routes built |
| Phase 25 — earnings | `GET /commerce/provider/earnings`, the settlement-attestation pair, `?state=` on the order lists, migration `0119`        |

---

## What the backend gained

Additive, no migrations. Each was found by a frontend read that could not work.

| Added                                                                                                 | Why it had to exist                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /commerce/bookmarked-products`                                                                   | The bookmark toggle shipped in Phase 13 and **nothing ever listed what it produced**. `/wishlist` is built on it. Bookmarks only — a like is a counter, not a list |
| `state` on both RFQ lists, `board`+`threadState` on own-forum-threads, `state` on service engagements | Five reads that 422'd on a filter their UI already sent                                                                                                            |
| `viewer.isThreadAuthor` on the forum thread                                                           | Accept-answer was unreachable — the payload carries `authorDisplayName`, deliberately not an id, so the client had nothing to compare a session against            |
| `moderatedAt` + `decisionReason` + `createdAt` on own-forum-threads                                   | A rejected author saw "pending" with no reason. The only rational response to that is to post it again                                                             |
| `body` + `createdAt` on the forum moderation queue                                                    | A `pending_review` thread is 404 on **every** public read, so publish/reject was being decided on a 240-character excerpt with the full text reachable nowhere     |
| `bio`/`lookingFor`/`state`/`priorVentures`/`submittedAt` on the cofounder queue                       | Same problem on a person's profile                                                                                                                                 |
| `buyerDisplayName` on manufacturing inquiries                                                         | The received queue was a wall of UUIDs                                                                                                                             |
| `standardName` on coded factory certifications                                                        | Any factory with one failed its whole page                                                                                                                         |

**Deliberately REFUSED, with the reason written into the schema:**

- **`state` on the two moderation queues.** The frontend's own component comment argues against its
  own filter type: _"filtering on state alone would show every rejection this console has ever made,
  forever."_ A reject leaves the thread `pending_review` with a note, so the queue would never empty.
- **`visibilityState` on forum replies.** The read filters `state = 'visible'` — "a hidden reply
  leaves the public read entirely; it is not shown as a tombstone" — so the field would be a
  constant. The frontend's tombstone branch was deleted instead.
- **The seven `/store/providers` filters.** The directory has exactly one filter UI (kind chips).
  Seven query keys for a UI nobody built is unverified code.

---

## The five drift patterns

0 MISSING endpoints. 24 MATCH. **35 DRIFT**, every one of which would have failed on its first live
call.

| Pattern                                                     | Example                                                                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| A filter the query schema does not accept                   | 7 reads, each a 422 that killed the whole page                                                                                     |
| Body field renamed against `.strict()`                      | `note`→`reasonNote` ×5, `target`→`targetState`, `currency`→`sampleCurrency`, `coveredSiteIds`→`siteIds`                            |
| Controller returns one object, frontend parses a page       | all four admin moderation writes                                                                                                   |
| Bare projection vs wrapper key                              | `{inquiry}`, `{audits}` vs `siteAudits`                                                                                            |
| **Schema transcribed from the SERVICE, not the CONTROLLER** | `acceptQuote` returns an **Order**; decline/withdraw return a quote **shell**; five cofounder writes return a nested owned profile |

**The rule this pass exists to write down: for a wire shape the authority is the CONTROLLER.** The
payment-intent bug in the buyer-path pass was the first instance; it repeated ten more times here.
Several routes DO pass a service value through verbatim, which is what makes the assumption feel
safe.

---

## Three "this endpoint does not exist" banners were stale

Two of them rendered an apology to the user for a gap that closed in Phase 15/21.

- `dispute-detail.tsx` → `GET /commerce/disputes/:disputeId` (A28) + `POST …/notes` (A40)
- `logistics-overview.tsx` → `GET /commerce/provider/shipments` (A29)
- `catalog-breadcrumb.tsx`'s `TODO(backend)` for `ancestors[]` → shipped with A25

**Check a claim like that against the routes file before believing it.**

---

## Rules that apply throughout

- `unknown` → Zod `.strip()` → tagged `ActionResponse<T>` → discriminated-union view state →
  exhaustive `switch` with `const exhaustiveCheck: never`. No `as`, no `any`.
- **The wire shape is the CONTROLLER's response**, not the service's return type.
- **A price renders only through `providerQuote`.** Qatoto sells no freight.
- **Never sum legs, components or currencies.** The server returns the totals.
- **A missing component is named** — never defaulted, averaged or extrapolated.
- **Never render a zero or a date** where the server returned an absence.
- **A `202` is not a result.** Payment intents, refunds, document upload, customization assets.
- **An idempotency key is minted once per attempt, in component state**, and rotates only after a
  confirmed success — never on failure, which is the retry it exists to make safe.
- **A missing `Idempotency-Key` is a 400, not a 422.**
- Enum values snake_case **verbatim** — except `commerce_incoterm`, which is UPPERCASE.
- Update the `TRANSPORT:` banner on line 1 of every file touched.
- **No tests** unless explicitly asked (CLAUDE.md).

---

## Verification

Backend needs **both** processes. Without the worker, payments accept and never settle with an
EMPTY `last_error` — indistinguishable from A41's old bug:

```bash
cd ../../backend/qatoto-backend
pnpm dev          # the API
pnpm dev:worker   # pg-boss — DISPATCHES THE PAYMENT OUTBOX
pnpm db:seed-store-demo   # store-demo-{buyer,seller,staff}@example.invalid / store-demo-password-2026
```

**`max_connections = 20`** on the free-tier Aiven instance, so two processes is the ceiling. A green
`/health` proves nothing — it touches no database.

Audits (note `--no-filename`; without it every hook reports as uncalled):

```bash
for h in $(rg --no-filename -o 'export function (use\w+)' -r '$1' src/hooks/store/ | sort -u); do
  rg -q "\b$h\b" src/components || echo "UNCALLED $h"; done
for f in $(rg --no-filename -o 'export (?:async )?function (\w+)' -r '$1' src/lib/store/*.api.ts | sort -u); do
  rg -q "\b$f\b" src/hooks src/components src/app || echo "UNCALLED-API $f"; done
```

**The audit is not bookkeeping — it caught three surfaces that existed and were unreachable**
(`/disputes/[id]` had no link, there was no thread inbox, `useMyCommerceOrganizationsQuery` had no
caller). That is the same failure A38 spent nine backend routes fixing.

### Live — RUN AND PASSING, 2026-08-12

Every schema parsed against a live payload through the real `src/lib/store/*.schemas.ts`. Throwaway
harnesses did it and were deleted.

| Surface                               | Checks | Notes                                                                                     |
| ------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Buyer path                            | 18     | cart → prepare → confirm → pay → `settled` → `confirmed`; fresh-account pending workspace |
| merchandising / providers / factories | 15     |                                                                                           |
| forum                                 | 8      | all five drifting write responses                                                         |
| cofounders                            | 6      | plus the create body proven separately (no `displayName` → 422)                           |
| procurement                           | 9      | RFQ create/open/close, quote comparison, engagements                                      |
| admin                                 | 5      | as the staff account                                                                      |
| disputes / shipments / messaging      | 10     | note write grew the timeline 1→2; `createOrGet` returned the same thread id twice         |
| the four routes                       | 7      | as the seller: 20 provider orders, 10 dispatchable                                        |

**Not exercised, named rather than claimed:**

- **`standardName`** — the seed creates 7 uncoded and 0 coded factory certifications, so the one
  field added for it has never met a live payload.
- **The delivery-address 429.** The seeded checkout sends no `deliveryAddressId`, so the reveal 404s
  before the limiter is in play.
- **The browser.** Everything above is the transport contract asserted over HTTP. No screen has been
  watched rendering.

---

## What the backend still cannot do

### Impossible by decision — the mocks are deleted, not scheduled

Public product comment threads (A10 — Q&A, reviews and inquiries already cover it, so `commentCount`
can never exist), trade-protection guarantee copy (A20/§14 — claims custody Qatoto does not have),
author-deleted reviews (A38 — removal goes through a moderator).

### Blocked on a §14 LEGAL decision, not on engineering

- **Cofounder capital range / equity ask.** Publishing what a person will invest beside a contact
  affordance is close to a securities solicitation, and how close is a per-market answer. The columns
  deliberately do not exist and `verify-store-phase-19-constraints` asserts their **absence** by
  name. The create body 422s on them today — verified.
- **"Online revenue" on a seller profile.** §14 decided it is publishable **only on explicit
  consent**. Needs a consent column, a withdrawal path, and a third wire member.
  **NOT THE SAME THING AS PHASE 25's `/sales` PANEL, and the distinction is worth keeping straight
  because the two look alike.** §14 governs PUBLISHING a seller's takings to strangers on a public
  storefront; the earnings read is self-scoped and authenticated, and a seller reading their own
  books needs no consent to see them. Nothing in Phase 25 touches the storefront, and no
  `consentedDisclosures` member or `revenue_disclosure_consented_at` column was added.

### Real gaps with a written spec

| Gap                                                 | What it needs                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Seller cost of goods, and therefore margin**      | SHIPPED IN PHASE 25: revenue. Margin is what is left. Nothing records what a seller PAID — no cost column, no purchase record, no expense table — so it needs a table, a write route, and A13's declared-vs-measured split, since a self-entered cost is a DECLARED stat sitting beside measured revenue. Specified below, not started |
| **Message attachments**                             | An upload path returning an authorized document id. The message body takes `encryptedDocumentIds` of ALREADY-authorized documents, and the only multipart routes are verification evidence and customization assets                                                                                                                    |
| **Liked / watch later / subscriptions**             | No routes mounted at all. `/library` ships playlists and names the rest                                                                                                                                                                                                                                                                |
| **Multi-axis variants**                             | `commerce_product_variant_option{variantId, optionName, optionValue, position}`. A26 defers it deliberately — building axes early migrates every row that reaches an immutable order-line snapshot, for a UI nothing has asked for                                                                                                     |
| **Port-to-port pricing on an uncovered inland leg** | Incoterm **semantics**. Phase 23 shipped the vocabulary only; nothing branches on the value                                                                                                                                                                                                                                            |
| **Provider directory filters**                      | Six more query keys, and the UI to go with them                                                                                                                                                                                                                                                                                        |
| **An organization-level conversation**              | There is no thread kind for it, and there should not be: the thread's unique index is `(resourceKind, resourceId)`, so a thread keyed on an organization would be ONE THREAD PER SELLER shared by every buyer. The storefront's "Chat now" was removed for this reason                                                                 |

### Works, empty until data is bought

`delivery-sheet.tsx`. The routes, tables and rating service all exist; the rate tables ship **empty
by design** (A36). Every lane answers `no_active_rate_card` until a forwarder lane list is purchased.
`shippingInCents` is permanently `0`.

---

## Phase 25 — what a seller has been paid

`/sales` shipped with a panel explaining its own absence: "nothing on this platform reports a
seller's takings". That was true of the ROUTES and **false of the DATA**. The hash-chained
double-entry journal, the payment intents with `counterpartyOrganizationId` and `settledAt` on the
row, and the refund table had all existed since Phase 14 — and `deriveCommerceJournalBalances` sat
in `commerce-journal.service.ts` with **no caller and no test**. The gap was one route.

**Built, no schema change beyond one index:**

| Added                                                         | Why                                                                                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /commerce/provider/earnings`                             | Six concurrent aggregates, self-scoped, `Cache-Control: no-store`. No `organizationId` key — the `.strict()` schema 422s it          |
| `GET\|POST /commerce/orders/:orderId/settlement-attestations` | `commerce_settlement_attestation` had **no writer anywhere in `src/`** since Phase 14. Dead schema, now wired                        |
| `state` on both order lists                                   | The dispatch queue was a client-side filter over one page, defended only by the absence of a server filter                           |
| Migration `0119`                                              | `commerce_payment_intent_counterparty_idx`, partial on `settled_at IS NOT NULL`. The table had a buyer index and none for the seller |

**Three rules this surface is built on, each from the code rather than taste:**

- **No grand total, anywhere, ever.** `commerce_journal_account_memorandum_ck` exists "so no future
  balance report can sum memo value and real money into one number". Observed, escrow-released and
  self-attested are three kinds of fact; a hero figure spanning them is a regression, not a feature.
- **The rail filter on the journal query is load-bearing.** `direct_processor` posts
  `settlement_released_memo` exactly as escrow does, so without
  `settlementRail = 'external_escrow'` every processor payment counts twice and revenue silently
  doubles. `smoke-store-phase-25` asserts this by name.
- **An attestation is a claim, not an observation.** It posts nothing to the journal, and the
  earnings read keeps it in `selfReported`. The kind is derived from the actor's side of the order,
  never from the body — a buyer must not be able to record that the seller was paid.

**Verified live, 2026-08-12:** `pnpm db:smoke-store-phase-25` — **14/14**, including a real
processor payment landing in `processorSettled` while `escrowReleased` held flat, and an offline
order moving from `uncounted` into `selfReported` on attestation with a 409 on the second attempt.
All four frontend schemas parsed against real payloads.

---

## Not started

**Phase D — cost of goods, and therefore margin.** The half of "profit and loss" that Phase 25 could
not build, because the input does not exist anywhere in this backend. It needs a per-order-line cost
a seller enters, its write route, and — the part that is not mechanical — **A13's declared-vs-measured
split**: a self-entered cost is a DECLARED stat sitting directly beside platform-MEASURED revenue,
and the wire has to make that visible or a seller will read an unverified number as a verified one.
Until it exists, `/sales` says margin is not shown and why, rather than relabelling revenue.

**Phase C — the admin freight console.** Unblocked since §19.10: both reads exist and `bandsEditable`
rides on the shared projection, so the console does not derive it. §19.11 is the operator sequence
and is not optional reading — a card authored the obvious way can never have its bands edited, and a
card with no band at `minBillableWeightGrams: 0` reports every small consignment as an uncovered lane.

Also unused: **A39's search facets** (five dimensions, drill-down blind to their own filter),
**A40's incoterm enum** on the quote form and `commerce_review_media_state`, and
**`POST /commerce/orders/:orderId/refunds`** (needs a control that can render `409 OVER_REFUND`,
whose balance rides in the envelope's `data`, which the shared transport drops).

**`checkout/prepare`'s `arrivalWindows`** is sent and `.strip()`ped: the window is always null at
prepare time and only `missingComponents` is meaningful, so rendering it needs a panel that names
components without printing a date.

---

## Decisions for Vidyesh

- **The uncovered-inland-leg rule.** Until settled, most real lanes show nothing _even after_ rate
  data is bought. Worth deciding before spending on cards.
- **Below-smallest-band yields no option.** One reviewable row per card
  (`minBillableWeightGrams: 0`) closes it — a data decision. §19.11 documents it as step 4.
- **Should `POST /commerce/admin/freight-rate-cards` refuse a silent supersede?** §19.10's list route
  exists now, so an operator can see the incumbent and `supersedesRateCardId` becomes expressible.
- **Naming the reporter in the moderation queue.** `CommunityContentReportProjection` carries no
  reporter identity and the queue does not show one. A moderator who can see who reported whom is a
  moderator who can be lobbied — worth deciding deliberately rather than by adding a schema field.
- **The Postgres ceiling.** `max_connections = 20`, and API + worker + a seed script is most of it.
  Either the per-process pool comes down or the plan goes up before anyone trusts a local run.

---

# `/your-account` and `/settings` — Part 1 shipped, Parts 2–3 are open

Written 2026-08-18. `docs/REMAINING_WORK.md` §2 called these two "the cheap two" — a host, not a
feature. Part 1 built the host.

## What shipped

**Seventeen routes across two nested trees**, the first nested layouts in `(home)`:

- `/your-account` + nine sub-routes — `full-name`, `profile-photo`, `handle`, `phone-number`,
  `password`, `passkeys`, `google`, `github`, `switch-account`. `ƒ (Dynamic)`; each awaits
  `hasCallerSession()` and seeds `useViewerSignedIn`, so the sign-in gate never mismatches on
  hydration.
- `/settings` + three sub-routes — `language`, `location`, `ai-assist-mode`. `◐ (Partial
Prerender)` and **deliberately not gated**: these are device preferences with no server
  counterpart, so requiring an account to pick a browse country
  would be a gate protecting nothing.

**`/settings/password` is one URL, two panels** — whether it is "set" or "change" is
`accountsByProvider.has("credential")`, not something a URL can know.

**Preferences persist, device-only.** `src/lib/browser-preferences.ts` +
`src/state/browser-preferences-context.tsx`: one `localStorage` key, parsed with a `.partial()`
Zod schema so a blob from an older build cannot wipe the preferences it does carry. The account
dropdown reads the same context, so the two surfaces cannot disagree. No server sync — the backend
has no preferences endpoint and is not getting one for these.

**The theme is applied.** `THEME_BOOTSTRAP_SCRIPT` is a blocking inline `<script>` in the root
`<head>` that puts `.dark` on `<html>` before first paint. `globals.css` had a complete 32-token
`.dark` palette that **nothing had ever applied** — it was dead CSS.

**One read got the house treatment.** `GET /users/me/linked-accounts` had an inline Zod schema and a
hand-rolled `useEffect` inside `menus/settings-menu.tsx`; four surfaces now need it, so it moved to
`src/lib/account/linked-accounts.{api,schemas}.ts` + `src/hooks/account/`.

**Entrances.** `SettingsPanel`'s "Your account" row was inert — no `onClick`, nowhere to go — and is
a link now. The sidebar gained a Settings row: `/settings` had **no entry point anywhere in the
app**, not the sidebar, not the navbar, not the mobile nav.

## Part 2 — `panels/*.tsx` at page width

The eight identity panels still render the 360px dropdown layout inside a `max-w-3xl` column, and
still draw their own sticky back-header with the arrow. That header is why neither route layout
carries an `<h1>` — two stacked headers is the visible tell that this part has not happened.

**Use Tailwind v4 `@container` queries, not a `variant` prop.** The dropdown and the page render the
same component, so a prop means a branch that can drift and a second layout nobody looks at. A
container query makes the dropdown's 360px container keep today's stacked layout and the page's wide
container get side-by-side fields and a card, from one source. Verify at 360px afterwards — the
dropdown is the regression that matters.

## Part 3 — `menus/*.tsx` at page width

Same technique for the six preference panels, plus lifting the `<h1>` out of the panels and into
`your-account/layout.tsx` and `settings/layout.tsx` once they no longer draw their own header.

## Dark mode was REMOVED, and the icon debt with it

Written 2026-08-18, later the same day. Appearance, Child mode and Incognito mode were deleted —
they are not going to be implemented, and a settings row that changes nothing is worse than no row.

**Appearance was the only writer of `.dark`**, so removing it made the app light-only. Gone with it:
`THEME_BOOTSTRAP_SCRIPT`, `applyThemeToDocument`, `resolveIsDarkTheme`, the `theme` preference, the
`prefers-color-scheme` subscription in the provider, `suppressHydrationWarning` on `<html>`, and the
32-token `.dark` block in `globals.css`.

**That cancels the icon work outright.** The 177 `_000000_` glyphs are black on a light ground and
always were, which is correct in a light-only app. No `<MaterialIcon>`, no `<ThemedIcon>`, no 134
white twin assets, no `filter: invert()`. Two attempts at this were built and discarded; do not
start a third unless dark mode comes back.

**Kept:** the `body` rule in `globals.css`. It was added during the dark-mode work but is not a
dark-mode rule — it paints the page from `--background` / `--foreground` rather than leaving the UA
default white with initial-black inherited text.

**No storage migration was needed, and the storage self-heals.** `StoredBrowserPreferencesSchema` is
`.partial().strip()`, so a returning visitor's six-key blob parses fine and the three dead keys are
ignored — then dropped entirely by the next `setPreference` write. Verified against a seeded legacy
blob carrying `theme: "dark"`: the page rendered light, `isAiAssistModeOn` survived, and one toggle
rewrote storage as `{"language","countryCode","isAiAssistModeOn"}`.

**Still true and unaffected:** the 2,030 hardcoded hex classes across 283 files. They stop being a
dark-mode problem and are now just two colour vocabularies coexisting, which is what
`home/shared/status-panel.tsx` already argues is deliberate.

## The count in `REMAINING_WORK.md` §2 was wrong

It read "Seventeen routes are stubs", then listed six routes under a bullet labelled "Five". The real
number was eighteen. It is **sixteen** now — twelve `(studio)` stubs and four under `(home)`
(`/customer-service`, `/advertise-with-us`, `/report-history`, `/policies-and-safety`).

---

# `/your-account` and `/settings` are DELETED — the account menu owns them

Written 2026-08-18, later still. **This cancels Parts 2–3 above.** Do not start the
`@container` rewrite; the pages those parts were widening no longer exist.

## What was removed

- `src/app/(home)/your-account/**` (11 files) and `src/app/(home)/settings/**` (5 files) —
  the seventeen routes Part 1 shipped.
- `src/components/home/account/pages/**` (5 files) — `your-account-index`,
  `your-account-panel`, `settings-index`, `settings-preference` and `account-route-guard`
  existed only to host those routes.
- The sidebar's "Your account" and "Settings" rows, their `ROUTES` entries and their two
  now-unused `ICON_PATHS` keys.
- Both `kind: "route"` nodes from `src/lib/roadmap/site-roadmap.ts`.

## Why, given Part 1 built them on purpose

Part 1's premise was that eight identity panels and three preference panels were "trapped
inside the 360px account dropdown" and needed a host. What it actually produced was a
**second list of the same rows** — `pages/your-account-index.tsx` was `menus/settings-menu.tsx`'s
action list with `setView` swapped for `href`, maintained in parallel, plus a third entry
point in the sidebar. Three surfaces, one job.

The dropdown was never the problem; the row shape was. "Set handle" is an imperative that
buries the current value in a subtitle, which is the wrong way round for somebody who came to
**read** their account.

## What replaced them

`src/components/home/account/menus/your-account-menu.tsx` — a sub-panel of the Settings panel,
reached the same way as Language or Location. Label on the left, **value on the right**, one
row per fact: full name, profile photo, handle, email (+ Verified), phone number, password,
passkeys, Google, GitHub, member-since, account ID with a copy button. Rows that have an
editor open it; Email, Member since and Account ID do not pretend to.

Two things it does deliberately:

- **It owns no editors.** `onOpenEditor` hands the choice to `menus/settings-menu.tsx`, which
  already hosts all ten. `SettingsView` became a discriminated union carrying
  `returnTo: "list" | "your-account"` so back from an editor lands on the list it was opened
  from — the one piece of state the two-list arrangement actually needs.
- **Null is not "no".** Provider, password and passkey rows read "Checking…" until their query
  lands, never "Not linked".

New: `src/hooks/account/passkeys.ts` (`usePasskeysQuery` over the Better Auth SDK, for the
count) and `accountKeys.passkeys()`. `panels/passkeys-panel.tsx` keeps its own `useState` list
— it owns add/rename/delete and rewiring it is separate work.

## The preference context survives the deletion

`browser-preferences.ts` + `browser-preferences-context.tsx` were justified in Part 1 by "two
surfaces edit the same three preferences". One surface does now — but the justification was
always weaker than the real one: the dropdown **closes**, and a preference discarded on close
is a control that does nothing. The comments in both files were rewritten to say that instead.

## Known-dead row, kept

**Phone number will read "Not set" for everybody.** `session.user.phoneNumber` and
`phoneNumberVerified` are declared client-side in `lib/auth-client.ts` via
`inferAdditionalFields`, and the backend has no `phoneNumber()` plugin and no `phone_number`
column — `rg phoneNumber qatoto-backend/src` returns nothing. The field type-checks and is
`undefined` at runtime, so `PhoneNumberPanel`'s OTP calls hit a route that does not exist.
The row and the panel both predate this change and both stay; the value shown is the honest
one. **Fixing this is a backend task**, not a frontend one.

## `/your-account` and `/settings` now 404

No redirects were added — they were reachable only from the sidebar and the dropdown, both of
which were changed in the same commit. Add `redirects()` in `next.config.ts` if bookmarked
URLs turn out to matter.

---

# Crawl policy: `robots.txt` and the noindex fence shipped — `sitemap.ts` is NOT written

Written 2026-08-18. This started as "should the account panel go back to being a page, for
crawlers?" It should not — `/your-account` and `/settings` both carried
`robots: { index: false, follow: false }` and `/your-account` sat behind a sign-in guard, so
neither was ever indexable. Deleting them cost nothing. But the question was worth asking,
because the app had **no `robots.txt` and no sitemap at all**, and 27 private pages were
inviting the crawler in.

## What shipped

**`src/lib/site.ts`** — `SITE_URL` / `SITE_TITLE` / `SITE_DESCRIPTION` were module-locals in
`app/layout.tsx` and unexported. Three files need the origin now, so they moved.

**`src/app/robots.ts`** — 25 disallowed prefixes, `Host`, and **deliberately no `sitemap:`
line** (see below).

**The noindex fence**, which was the actual hole. 27 auth-gated pages carried no `robots`
directive; being auth-gated is what made that bad, since a crawler reaching one gets a sign-in
wall and Google files that as a soft 404.

- `(studio)/layout.tsx` and `(admin)/layout.tsx` — one `metadata` export each, covering 42
  pages. Next merges metadata per-field down the segment chain, so the 13 pages that already
  set `robots` keep theirs.
- **`(auth)/layout.tsx` is NEW.** That group had no layout, and none of its four pages exports
  metadata at all — `/sign-in`, `/sign-up`, `/sign-in-with-password` and `/forgot-password`
  were fully indexable. The layout renders `{children}` and nothing else; it is a metadata
  carrier, not chrome.
- Nine `(home)` routes individually (`/cart`, `/history`, `/orders-and-returns`, and six R&D
  ones). `(home)` holds public routes too, so it gets no group-wide rule.
- **The four public stubs** — `/customer-service`, `/advertise-with-us`, `/report-history`,
  `/policies-and-safety`. Each renders a bare `<h1>`. Their noindex comment says REMOVE THIS
  LINE when the page gets content: it is about the current state, not a policy about the route.

`noindex` and `Disallow` are not interchangeable and the order matters. A `Disallow` stops the
crawl, so the `noindex` is never read and anything already indexed stays listed without a
snippet. The meta tag removes the URL from results; `robots.txt` only saves crawl budget.

## NOT built: `src/app/sitemap.ts`

Nothing announces the ~43 static public pages or the 16 dynamic families — including the whole
product catalogue. `robots.ts` therefore has no `sitemap:` line, because pointing at a URL that
404s is a Search Console error rather than a harmless placeholder. **Add that line in the same
change that creates the file.**

Everything needed to write it is in the plan at
`~/.claude/plans/in-account-menu-on-deep-lampson.md` Part 4. The five constraints that will
otherwise bite, in order of how quietly they fail:

1. **`"use cache"` cannot go in a Route Handler body** (Next 16 docs, `route-handlers.md:144`) —
   extract every remote read to a helper. The failure is silent: an uncached fetch does not break
   the build, it degrades `sitemap.ts` to request-time, re-fetched per crawler hit.
2. **Never `new Date()`** — a non-deterministic op stops prerendering, and a fabricated
   `lastModified` is a lie. Most store list projections carry no timestamp; omit the field.
3. **Never `src/lib/server-http.ts`** — `callerRequestOptions()` calls `cookies()`.
4. **Filter `"__none__"`** — `withSentinelValues` would otherwise publish
   `/store/rails/__none__`.
5. **Guard the CMS fallback** — with `QATOTO_CMS_URL` unset, `getBlogs()` serves four hardcoded
   mocks, and the sitemap would publish them as real URLs.

Three route comments claim products/organizations/offerings are unenumerable. **They are out of
date.** `GET /store/search` is public and cursor-paged, `hit.publicSlug` is the slug for both
`product` and `provider_offering`, and `hit.organizationSlug` on those same hits yields every
storefront that lists anything — so no new backend endpoint is needed. Pass `documentKind`
explicitly: the backend also indexes `organization`, which is absent from the frontend's
`SEARCH_DOCUMENT_KINDS`, and one such row fails Zod for the whole page.

`/research-and-development/talent/[handle]` stays out on purpose — both reads are `requireAuth`,
and bulk-indexing profiles of real people is a privacy decision, not an oversight.

## Also found, not built

- **No JSON-LD anywhere** — zero `ld+json` in `src/`, despite product, blog, press and org pages
  being natural `Product` / `Article` / `Organization` candidates.
- **No `alternates.canonical` anywhere** — matters most for `/store/[...slug]` (33 legacy URLs,
  redirecting) and the `/compare` routes, whose comments already name a canonical target.
- **Rich metadata on 3 of 137 files** — root layout, `/blogs/[slug]`, `/press/[slug]`.
  `/store/product/[id]` is title + description only: no OG image, no price, no availability.
- No store list projection carries a timestamp, so a sitemap cannot signal when a product
  changed. Adding `updatedAt` to the store card schemas would improve recrawl behaviour.
- `manifest.json` omits `start_url` and `description`.

---

## Data & privacy — Part 1 shipped, Parts 2 and 3 are open

Written 2026-08-18. The settings row `Your data in app account` was an inert stub: a full-width
`<button>` with no `onClick`, sitting under a privacy policy that promises access, correction and
deletion by email. It is now `Your data & privacy` → `account/panels/data-and-privacy-panel.tsx`,
with `account/panels/delete-account-panel.tsx` behind it. `Time watched` was removed for the same
defect, and `SettingsItem.onClick` is now **required**, so the type stops the next dead row.

**Every control in there is real, existing, or an explicit request.** The backend has no deletion
and no export endpoint, so access/export/deletion open a prefilled draft to `PRIVACY_CONTACT_EMAIL`
(`lib/privacy-request.ts`). Nothing claims a write that did not happen — the terminal state says
"your request is not sent yet".

### Blocking, before this is worth anything

**Is `privacy@qatoto.com` real and monitored?** Every request control routes there and the privacy
policy has always named it. An unread mailbox makes the panel a more elaborate dead stub and leaves
the policy an unfulfilled promise. If the address is wrong, it is one constant in `lib/site.ts`.

### Part 2 — the privacy policy is missing every GDPR Art. 13 mandatory item

`disclaimers/privacy-policy.tsx` names no controller entity or address, no lawful basis, no
retention period, no enumerated data-subject rights, no supervisory-authority complaint route, no
international-transfer basis, and never says "cookie" — while `account/menus/location-menu.tsx`
offers 108 countries including every EU/EEA member.

Cookies are essential-only today (the auth session cookie and `qatoto.browser-preferences`; the only
`<Script>` in `app/layout.tsx` is dev-gated), so a disclosure section closes this cheaply — but a
consent banner becomes required the moment any analytics script lands. Also fix
`disclaimers/terms-and-conditions.tsx`, whose governing-law clause is circular: "the laws of the
country in which Qatoto operates".

### Part 3 — backend, so the request rows become endpoints

In `qatoto-backend`. The FK graph already decided the shape (cascade rule **R2**,
`src/db/schema/rnd.ts`): 55 tables hold `restrict` FKs into `user` and ~66 are protected by
`BEFORE UPDATE OR DELETE` triggers, so account deletion is an **anonymization** flow, not a delete.

- `user.deactivatedAt` + `user.anonymizedAt` — there is no lifecycle column at all today, so an
  account has exactly two states: exists, or row gone.
- `POST /users/me/deletion-request`, `POST /users/me/deletion-request/cancel`, and a scheduled
  anonymization job at grace expiry (the frontend copy commits to **30 days**, cancellable).
- `GET /users/me/export` — Art. 15/20. Nothing like it exists; the nearest route is the founders'
  payroll CSV export, which is not a subject access request.
- A scrub routine over `name` / `email` / `image` / `handle` / `locationLabel`, plus revocation of
  every `session`, `account` and `passkey` row, plus a decision on `session.ipAddress` /
  `session.userAgent` and the `viewerFingerprint` tables.
- Better Auth's `deleteUser` plugin stays **off** — it would attempt exactly the hard delete the
  triggers exist to prevent.

**Verify this first, it may invalidate the whole design:** `projectAuditEntry.actorNameSnapshot`
(`src/db/schema/rnd.ts`) sits _inside_ a chain hash and can never be edited. If real names are
written there today, anonymization and the hash chain are mutually exclusive, and the write path has
to become pseudonymous before any deletion feature ships.

---

## Watch time & platform metrics — backend shipped, frontend is open

Written 2026-08-18. `Time watched` was deleted from `settings-menu.tsx` earlier the same day
because there was no endpoint to point it at. There is one now.

**Backend (`qatoto-backend`), all of it landed and `pnpm gate` green at 2030/2030:**

- Three tables in `src/db/schema/home.ts` — `user_activity_hour` (per user × UTC date × hour,
  written by `recordViewBeacon` as beacons arrive, 90-day retention), `user_watch_daily`
  (per user × date, 25 months) and `platform_activity_hour_daily` (24 rows a day, no user id).
- `rollup-user-watch-activity`, cron `40 4 * * *` — **fifteen minutes before the prune at `55 4`,
  and that ordering is the correctness argument.**
- `GET /users/me/watch-time` — four totals, a 30-day series, a 24-bucket histogram, optional
  `?timeZone=`. Returns **`null`, never `0`**, for an account with no rows.
- `GET /admin/metrics/{active-users,watch-time,activity-hours,retention-cohorts,users}` behind a
  new `view_platform_metrics` capability, `admin` only. `/users` returns named accounts and is the
  only READ in the platform audit chain.
- Full write-up: `docs/HOME_BACKEND_STRUCTURE.md` §3.3a.

### Blocked on one manual step

**`pnpm db:generate` has to be run by a human in a TTY.** drizzle-kit prompts a
create-vs-rename question and cannot be answered non-interactively — and it prompts on a CLEAN
tree too, so there is pre-existing snapshot drift to resolve while you are in there. Until the
migration exists and `pnpm db:migrate` has run, the three tables do not exist and every endpoint
above 500s. Then `pnpm db:verify-watch-metrics-constraints` proves the bounds and, more
importantly, that the composite PKs landed: without them the beacon's `ON CONFLICT DO UPDATE`
inserts instead of adding, and watch time silently multiplies by the beacon count.

### Frontend work

- **`Time watched` row returns** to `settings-menu.tsx`, opening a `WatchTimePanel` beside the
  other `account/panels/*`. Copy must state that **signed-out watching is not counted** — the
  beacon only writes the hour counter for a session with a viewer id — and must render `null` as
  "nothing recorded yet", never as `0` (`formatScorePoints`, `src/lib/rnd/format.ts`).
- **`/admin/metrics` page**, gated with the `useOwnStaffContextQuery()` capability pattern from
  `staff-role-page.tsx`. Add it to `ADMIN_NAVIGATION_ITEMS` in `admin-sidebar.tsx` **desktop-only**
  — the mobile bottom nav is capped at six tabs.
- **This is the first chart in the repo.** No chart library is installed. The only precedent for
  coordinate math is `research-branch-map.tsx` + `branch-tree-layout.ts`, inline SVG with integer
  per-mille units. Start with the 24-bucket histogram, which is 24 rects and needs no layout engine.
- `formatDurationLabel` (`src/lib/feed/format.ts`) and `formatEffortFromMinutes`
  (`src/lib/rnd/format.ts`) are what a `formatWatchTimeLabel` should be built from.
- **The activity-hours axis is UTC.** There is no per-user time zone on the platform, so the admin
  histogram cannot be localised and the surface has to say which zone it is showing.

### Disclosure debt this creates

`data-and-privacy-panel.tsx` claims to mirror what is held, and its own header says the policy wins
if the two disagree. It and `privacy-policy.tsx` must gain these three records and their retention
windows. The anonymization spec above must delete `user_activity_hour` and `user_watch_daily`
outright — behavioural, no legal-retention argument, not covered by the Art. 17(3) exemptions that
keep the ledger.
