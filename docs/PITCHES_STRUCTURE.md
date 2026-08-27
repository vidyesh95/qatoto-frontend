# Creator Studio — Pitches

The frontend + backend plan for `/studio/pitches`, its public counterpart under
`/research-and-development/pitches`, and the pitch domain behind both.

**Read alongside:**

- [R_AND_D_STRUCTURE.md](R_AND_D_STRUCTURE.md) §7 (funding), §15.7 (relationship to the studio
  surfaces — this doc closes the half of it that was left open), §18–§19 (phase order and the
  `TRANSPORT:` transport map every file here follows).
- [STUDIO_BACKEND_STRUCTURE.md](STUDIO_BACKEND_STRUCTURE.md) — video upload and the video-document
  rail a pitch reuses for its deck.
- [CLAUDE.md](CLAUDE.md) — thin-client invariant, Zod boundary parsing, discriminated-union UI
  states, wire casing.
- `todo.md` §2 — the short form of the decisions below, and the two prerequisites.

---

## 0. The definition, and why it took this long

`/studio/pitches` shipped as a `StudioPlannedPage` and stayed that way because the word had three
unrelated referents in this codebase and none of them was a pitch record:

| referent                      | where                                                    | what it actually is                                                                                                       |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `videoType: "pitch"`          | `src/lib/videos/schemas.ts:21`, `db/schema/studio.ts:80` | one of five video kinds                                                                                                   |
| `video.attachedPitchId`       | `db/schema/studio.ts:300`                                | a **dangling text column** — no FK, not client-writable. `videos.schemas.ts:262`: _"the pitch domain does not exist yet"_ |
| `shortPitch` / `oneLinePitch` | `rnd.ts:798`, `project_application`                      | free text on an idea and on a role application                                                                            |

Decided **2026-08-27**: **a pitch is a founder publishing an idea / MVP as a video to an audience
of funders — Kickstarter and YC demo day.** Not an application inbox, not investor outreach.

The roadmap summary _"Pitches you sent and received"_ (`site-roadmap.ts:842`) and the sidebar entry
(`studio-sidebar.tsx:332`) describe the application-inbox reading and are **wrong**; both change
with this build. `site-roadmap.ts:851-856` records why that matters: shipping under a summary
promising a capability the platform lacks is _"the one thing a roadmap must never do."_

## 1. The four constraints

All downstream of one requirement: **Qatoto is bootstrapped and must carry no legal liability and
no custody. Money happens off-platform or at a licensed third party.**

| Decision              | Answer                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Where funding happens | **Outbound link to a licensed platform** the founder supplies (Kickstarter / Wefunder / Ketto / Razorpay page). Qatoto stores a URL. |
| Contact handoff       | **Founder-supplied external link** (Calendly, their own site). No inbox to moderate, no personal data brokered.                      |
| Funding outcome       | **Recorded, both-party confirmed, labelled self-reported.** Qatoto asserts nothing.                                                  |
| Publish gate          | **Light gate + visible disclaimer** — spam / scam / illegal only, NEVER merit.                                                       |

**The product this produces is a listing and discovery board** — Product Hunt or a demo-day
directory, not Wefunder. Everything below exists to keep that true.

**Why the gate is light and never merit-based:** vetting a pitch on quality reads as endorsement,
which is the exact liability being avoided. Kickstarter reviews every project and states
explicitly that review is not endorsement; this surface does the same.

## 2. What the code already guaranteed, and this must not break

1. **No money rail, on purpose, stated six times.** `funding-rounds.service.ts:633` — _"A PLEDGE IS
   A COMMITMENT, NOT A CHARGE … No card is charged, no funds are held, no fee is taken."_ Escrow
   left R&D: nine routes 404 (`funding.routes.ts:190-215`), three queues deliberately unbound
   (`worker.ts:674`), `PLATFORM_FEE_BASIS_POINTS` = 0. **There is no `stripe` dependency in
   `package.json`** — the provider enum is a seam, not an integration.
2. **`ENABLED_FUNDING_ROUND_TYPES` stays `["crowdfunding"]`** (`config/index.ts:371`), enforced
   server-side before create / open / pledge. `funding.schemas.ts:66-70`: _"the gate is
   server-side, because equity and venture rounds are securities offerings."_ **Nothing here
   ungates `equity` or `venture`.**
3. **No investor entity, and `kyc` has zero occurrences in `src/`.** This design needs neither.
4. **The adjacent question was already refused.** The cofounder directory stores no
   `capitalRangeMin/MaxInCents` and no `equityExpectationBasisPoints` (`store.ts:10280-10296`):
   _"close to facilitating a securities solicitation … UNTIL DECIDED, THE BACKEND STORES NO
   CAPITAL FIGURE."_ A pitch page carrying a raise ask would reverse that. It does not — **the ask
   lives on the third-party page, behind the outbound link.**
5. **The attestation pattern already exists and is the model for the outcome record.**
   `compensation_payment_record` (`rnd.ts:6928`) — one party records, the other confirms
   (`confirmed_by_member_at`) — with the rule at `rnd.ts:149`: _"A key, never an instrument: this
   domain stores no account number, no IBAN, no UPI handle and no card detail."_
   `research_contribution_ledger_entry` (`rnd.ts:7972`) says the same: _"A RECORD OF INTENT, NOT A
   SETTLEMENT … no money moves, nothing is held."_
6. **`/studio/funding` is the precedent for the page's shape** — a cross-project read
   (`GET /funding-rounds/mine`) whose writes stayed in R&D.

## 3. The benchmark — what American companies do, and what it decides here

- **Nobody makes "a pitch" a sendable object.** The universal VC stack is a company profile, a deck
  link with per-page view analytics (DocSend), and a warm intro. AngelList adds SPVs, syndicates
  and a Data Room with access control and audit trails; Carta owns the instrument side ($10.4B
  pre-seed across 50,316 SAFEs, instrument count down 13% year over year).
- **The legal fork is general solicitation.** Reg D **506(b)** forbids public advertising; **506(c)**
  permits it but forces the issuer to _verify_ accredited status with documents — a checkbox is not
  enough. A public page with an ask on it is general solicitation. **This is why the ask stays off
  Qatoto's page.**
- **Retail crowdfunding cannot be self-hosted.** A Reg CF offering must run through a funding portal
  registered with the SEC (Form Funding Portal via EDGAR) **and** a FINRA member, or a
  broker-dealer. $5M / 12 months, per-investor limits by income and net worth, Form C, annual
  reports, 12-month resale restriction. Reg A+ is Tier 1 $20M / Tier 2 $75M with SEC qualification.
- **The market**: Wefunder led 2025 Reg CF volume at ~$109M; StartEngine ~22% share plus a secondary
  ATS; Republic runs CF → A+ on one platform.
- **Even white-label costs control.** Dalmore and DealMaker act as broker-dealer of record so the
  raise lives on your domain — with the explicit caveat that **the broker-dealer must control the
  page.**
- **The non-securities lane is Kickstarter / Indiegogo** — rewards and pre-orders, no SEC. Closest
  analogue to this model, with one difference: **Kickstarter actually charges cards at close.**
  Qatoto charges nothing, so it sits further from a security than Kickstarter does.

**What the benchmark decides:** by keeping the ask, the money and the contact all on third-party
surfaces, Qatoto stays a directory and none of the above binds it. The moment a pledge button with
an amount sits beside an equity claim on a Qatoto-hosted page, all of it does.

## 4. The model

A pitch is a row. It composes what already exists rather than duplicating it:

```
research_project ──┐
                   ├── pitch ──┬── pitchVideoId       → video (videoType: "pitch", YouTube)
video ─────────────┤           ├── deck               → existing video-document rail (Backblaze)
                   │           ├── externalFundingUrl → the licensed third party
                   │           ├── externalContactUrl → founder-owned
                   │           └── status: draft → pending → published | rejected | closed
                   │
                   └── pitch_funding_outcome  (self-reported, both-party confirmed)
```

**Why a `pitch` row rather than columns on `research_project`:** the review gate is per-pitch
(project publish is already instant and self-serve and must stay that way); a venture pitches more
than once over its life; and an outcome record attaches to a specific pitch, not to the idea.

**What a pitch deliberately does NOT have:** an amount, an equity percentage, a pledge button, a
message thread, an investor role, a KYC step, or any hosted payment control. **Each one of those is
the line between a directory and an intermediary.**

## 5. Backend (`qatoto-backend`)

Two tables in `src/db/schema/rnd.ts`, beside the funding subtree.

**`pitch`** — `id`, `projectId` → `research_project` (**restrict**: a pitch is a public record of a
solicitation and must stay resolvable), `slug` (server-generated kebab, public identity), `title`,
`summary`, `pitchVideoId` → `video` (**nullable, set null** — a video is a possession that dies
with an account per `studio.ts:190-198`; a pitch must outlive it), `externalFundingUrl` (nullable),
`externalContactUrl` (nullable), `status` pgEnum
`["draft","pending","published","rejected","closed"]`, `rejectionReason`, `publishedAt`,
`createdAt`, `updatedAt`.

**`pitch_funding_outcome`** — `id`, `pitchId` → `pitch` (restrict), `amountInCents` **bigint**,
`currencyCode` (`^[A-Z]{3}$`), `fundedOnDate`, `funderUserId` (nullable — an off-platform funder may
have no account), `funderNameText`, `note`, `recordedByUserId`, `confirmedByUserId`, `confirmedAt`
(nullable), `idempotencyKey`, unique on `(recordedByUserId, idempotencyKey)`. CHECK: amount > 0 and
currency present together. **No status column and no state machine** — an append-only attestation,
exactly like `research_contribution_ledger_entry`.

**URL validation is a security control and belongs server-side.** `externalFundingUrl` and
`externalContactUrl` are attacker-controlled strings Qatoto renders as links for other users.
Enforce: scheme `https:` only (reject `javascript:`, `data:`, `http:`), no credentials in the URL,
length cap, normalise before storage. Client-side checks are UX only.

**Routes** (`src/modules/rnd/pitches/pitches.routes.ts`):

```
POST   /research-projects/:projectSlug/pitches      create draft (founder)
GET    /research-projects/:projectSlug/pitches      project-scoped list
PATCH  /pitches/:pitchId                            edit while draft or rejected
POST   /pitches/:pitchId/submit                     → pending
POST   /pitches/:pitchId/publish                    moderate_content
POST   /pitches/:pitchId/reject                     moderate_content, reason required
POST   /pitches/:pitchId/close                      founder
DELETE /pitches/:pitchId                            draft only
GET    /pitches/mine                                founder-scoped, cross-project ← the studio read
GET    /pitches                                     public discovery, published only, paginated
GET    /pitches/:pitchSlug                          public detail
POST   /pitches/:pitchId/funding-outcomes           self-report (idempotency key)
POST   /funding-outcomes/:outcomeId/confirm         the counterparty confirms
```

`GET /pitches/mine` mirrors `GET /funding-rounds/mine` exactly, founder-scoping included — a
maintainer sees nothing, which is the answer the round writes already give.

## 6. Frontend

Follows the R&D write discipline verbatim. Every file gets a line-1 `// TRANSPORT:` banner.

**Data layer** — `src/lib/rnd/pitches.schemas.ts` and `pitches.api.ts`, beside `funding.*`:

- `const` tuple + `z.enum` + inferred type for `PITCH_STATUSES`, all three exported (the tuple
  drives the `<option>` list).
- Every response schema ends `.strip()`.
- `amountInCents` is a **decimal string** parsed with `BigInt`, never `Number` — it is a `bigint`
  column, and `funding.schemas.ts:23-37` states the rule.
- Reads via `getJson` / `getPaginated`, writes via `sendJson`, all returning `ActionResponse<T>`
  from `src/lib/http.ts`. Optional `RequestOptions` on every function so the module is callable
  from both sides.

**Hooks** — `src/hooks/rnd/pitches.ts`, keys added to `rndKeys` in `src/hooks/rnd/keys.ts`
(`["rnd","pitches",…]`). `unwrap` inside `mutationFn`, `invalidateQueries` in `onSuccess`. **No
mutation is optimistic.** An idempotency key is minted once per attempt in component state via
`newIdempotencyKey` / `useAttemptIdempotencyKey`, and rotated on success for the repeatable control
(outcome recording), per the `claim-submit-island.tsx` idiom.

**Studio console** — `src/components/studio/pitches/pitches-page.tsx`, `"use client"`,
`TRANSPORT: client-query — GET /pitches/mine`. Reuses `MutationErrorNotice` /
`MutationSuccessNotice` and a `MemberScopedListViewState` from `src/lib/view-state.ts` with an
exhaustive `switch` and a `never` default. Per pitch: status badge, linked video, deck, both
external links, the outcome record and its confirmation state. Controls: create, edit, submit for
review, close, record outcome. `src/app/(studio)/studio/pitches/page.tsx` drops `StudioPlannedPage`
and keeps `export const instant = false`.

**Create / edit form** — a single-page form, not a wizard. The composer precedent
(`ComposerStepRail`, `TextField` in `src/components/commerce/composer/composer-fields.tsx`) is
there if it grows past ~6 fields, but four fields and two URLs do not warrant steps.

**Public surface** — pitch detail at `/research-and-development/pitches/[pitchSlug]`
(`server-fetch`, `generateStaticParams` reconciled through `withSentinelValues` in
`src/lib/rnd/static-params.ts` — **never empty**, or the build fails under `cacheComponents`).
Discovery goes on the **existing** `/research-and-development/funding` deal-flow page as a Pitches
rail. **No new sidebar item; R&D stays at five** (R_AND_D §15.8, §15.13).

**Outbound-link rendering, everywhere a stored URL appears:**
`target="_blank" rel="noopener noreferrer nofollow ugc"`, the destination host shown in the label
so nobody clicks blind, and a visible "you are leaving Qatoto" cue.

**The disclaimer is part of the component, not a footer.** Every public pitch page and the studio
console state that Qatoto does not vet, endorse, verify or hold funds, and that any funding happens
off-platform between the parties. **Under a light gate this sentence is the liability position** —
it is not decoration and must not be trimmed in review.

**Roadmap and label** — `site-roadmap.ts:842` flips `planned` → `route`, and the summary is
rewritten to what the page does.

## 7. Prerequisites and open items

1. **The terms of service must be rewritten first.** Both legal documents still describe _"the
   Qatoto Video Sharing Site"_ and mention no store, projects, payments or equity. Shipping a
   funding-adjacent surface under them is the largest exposure here — larger than anything in the
   code — and it is a writing task, not a build task. `LEGAL_ENTITY_NAME`,
   `LEGAL_ENTITY_REGISTERED_ADDRESS`, `GOVERNING_LAW_JURISDICTION` and `GOVERNING_LAW_COURTS` in
   `src/lib/site.ts` still render as bracketed "TO BE CONFIRMED".
2. **Two funding models will coexist and one is now the odd one out.** R&D funding rounds still
   offer an on-platform pledge button (`POST /funding-rounds/:roundId/pledges`) while a pitch sends
   people to a third party. **The pitch page must not carry a pledge button.** Whether the existing
   round pledge stays, is relabelled or is retired is a separate decision, not taken here.
3. **Check the content before shipping the discovery rail.** `/anime` is the standing lesson — five
   pages stayed on mocks because `anime_series` had 0 rows and wiring them would have replaced
   invented content with blank pages. Probe published `research_project` counts first; if there is
   nothing to list, ship the studio console and hold the public rail.
4. **DONE, 2026-08-27 — the upload wizard's Investor-only tier is gone.**
   `visibility-step.tsx` offered `investor_only` plus an NDA toggle. `createVideo` opens with
   `assertGatingSupported("youtube", …)` — videoSource hardcoded — so the option answered
   `GATING_UNSUPPORTED_FOR_SOURCE` **every single time**, and `video_gating_ck`
   (`studio.ts:503-506`) refuses the pair at the storage layer too. It was a dead control, not
   merely bad copy. Removed with the reason recorded in the file; it returns only if self-hosted
   video does.

## 8. Verification

- `pnpm build`, `pnpm lint`, `pnpm fmt:check` clean.
- Sidebar **Pitches** no longer lands on `StudioPlannedPage`; the roadmap surface shows it as
  `route` with the corrected summary.
- `rg -n "TRANSPORT:" src/components/studio/pitches/` — a banner on line 1 of every file.
- The hook audit still prints nothing (note `--no-filename`, without which every hook name is
  path-prefixed and all of them report as uncalled):

    ```bash
    for h in $(rg --no-filename -o 'export function (use\w+)' -r '$1' src/hooks/rnd/ | sort -u); do
      rg -q "\b$h\b" src/components || echo "UNCALLED $h"
    done
    ```

- End to end against the live backend, as a founder: create draft → attach a pitch video and deck →
  save both external URLs → submit → (as a `moderate_content` holder) publish → public page renders
  at its slug → record an outcome → confirm from the counterparty account → the studio row shows it
  confirmed and labelled self-reported.
- **The negative checks matter more than the happy path.** `POST` an `externalFundingUrl` of
  `javascript:alert(1)` and an `http://` URL — both rejected server-side, not just by the form. A
  non-founder calling `GET /pitches/mine` sees nothing. A non-moderator calling `publish` gets
  **404, not 403** — 404 is the not-authorized answer on this surface. An unconfirmed outcome never
  renders as confirmed anywhere.
- **No screen ships unwatched in a browser.** `todo.md` §9 records that every store contract was
  asserted over HTTP and no screen was ever watched rendering. Do not repeat it here.

## 9. Sources for §3

- [SEC — Registration of Funding Portals](https://www.sec.gov/divisions/marketreg/tmcompliance/fpregistrationguide.htm)
- [FINRA — Funding Portals](https://www.finra.org/registration-exams-ce/funding-portals)
- [SEC — Regulation Crowdfunding offerings data](https://www.sec.gov/data-research/statistics-data-visualizations/regulation-crowdfunding-cf-offerings)
- [SEC issues new Reg CF guidance (Feb 2026 C&DI)](https://crowdfundingattorney.com/2026/03/17/sec-issues-new-reg-cf-guidance/)
- [Broker-dealer vs funding portal](https://www.crowdfundinsider.com/2023/05/206609-investment-crowdfunding-broker-dealer-funding-portal-what-is-the-difference/)
- [Dalmore — Reg CF white-label](https://dalmorefg.com/reg-cf/)
- [Wefunder vs Republic vs StartEngine volumes](https://angelinvestorsnetwork.com/market-analysis/wefunder-vs-republic-vs-startengine-for-raising-capital)
- [AngelList — Data Room](https://www.angellist.com/blog/empowering-every-fund-with-free-data-rooms)
- [Carta — startup fundraising cheatsheet](https://community.carta.com/c/corporations-updates/startup-fundraising-cheatsheet)
