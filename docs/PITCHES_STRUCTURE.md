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
`src/lib/static-params.ts` — **never empty**, or the build fails under `cacheComponents`).
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

---

## 10. What the live run changed — read this before trusting §5 or §6

Everything above was written before the surface met a real database. It was built, applied as
migration `0148`, and driven end to end against the live backend on **2026-08-27**. Three things
came back different, and this section is the correction rather than a changelog.

### 10a. A one-sided outcome could never become public, and nothing said so

**The bug the live run found, and it was a design hole rather than a typo.** `funder_user_id` is
nullable because the schema note (correctly) assumes the funder is often a stranger to Qatoto. But
a confirmation needs somebody to give it: with no account named, the row has ONE party, no second
signature is possible, and only a confirmed outcome reaches the public page. So a founder could
record funding, watch it sit there forever, and never learn why — while `confirmPitchOutcome`
answered `NOT_A_PARTY`, a **404**, to both actual parties. The most misleading possible answer:
"no such record" when the truth is "this record can never be confirmed".

Three changes, all shipped:

- A new error, `OUTCOME_HAS_NO_COUNTERPARTY` → **422** with a sentence that says exactly that.
- A derived `isConfirmable` on `PitchOutcomeView`, false when `funder_user_id` is null.
- `OutcomeAttestationNote` grew a **third state** — _private · nobody can confirm it_ — and the
  confirm control is not offered on such a row.

**The frontend copy was wrong too, and in the direction that mattered.** The composer said "A name
is enough — the funder does not need a Qatoto account." True for storing the row, false for
everything a founder wants from it. It now says a name alone keeps the record private, and offers
the funder's account id as the thing that makes it publishable.

### 10b. `compactBody` would have 413'd a legal pitch

`json-body-budget.test.ts` measures the largest body each route's own schema can produce. A
maximal pitch — 2000-character summary plus two 2048-character URLs, JSON-escaped — is ~25 KB
against `compactBody`'s 16 KB. **Create and PATCH use `longFormBody`**, like the other two prose
routes in the codebase. The test caught this, not a reviewer.

### 10c. The project-scoped list route is gone

`GET /research-projects/:projectSlug/pitches` was specced in §5 and built, then deleted with its
controller, service function and frontend wrapper. `GET /pitches/mine` supersedes it entirely —
cross-project, founder-scoped, already carrying each project's name. The `CLAUDE.md` hook audit
is what surfaced it: an uncalled wrapper is unverified code, and inventing a control to justify
one is the wrong repair.

### 10d. Two smaller corrections

- **`parseExternalUrl` was extracted to `src/lib/external-url.ts`** as `parseHttpsUrl`, and
  `promotional-destination.ts` now delegates to it while keeping its own error vocabulary. That
  file's header already argued against a third URL parser in this codebase; a copy in the pitches
  module would have made a fourth.
- **`pnpm db:migrate` could not apply `0148`.** Five earlier migrations (0042, 0047, 0049, 0052, 0147) have file hashes that no longer match `drizzle.__drizzle_migrations`, because this repo's
  own documented workflow is to hand-write a header AFTER `db:generate` — often after applying.
  drizzle-kit therefore reads those five as pending and dies re-running `0042`, **with the error
  swallowed by its spinner**. `0148` was applied by hand in one transaction after being dry-run
  against the live database and rolled back, and its ledger row was inserted with the hash of the
  finished file. **This is a pre-existing repo condition, not a consequence of §12, and the next
  migration will hit it again.**

### 10e. What was proved live, and what it cost

Draft → submit → 403 for a non-moderator → publish as a moderator → public page renders signed
out → outcome recorded → refused on self-confirmation → countersigned by the other party → visible
publicly. Both screens were watched rendering in a browser. Negative checks all refused
server-side: `javascript:`, `http:`, `//evil.tld`, embedded credentials, a dotless host, and
`status` in a create body (422 `Unrecognized key`, not a moderation bypass). Idempotency replay
returned the first row rather than creating a second.

**What the cleanup could not remove, and why that is correct.** The pitch, its two outcomes and
the notification were deleted. The throwaway project could NOT be — `project_member_interval` is
append-only and its trigger refuses DELETE (§4f) — so it was **archived** instead. The two test
accounts could not be deleted either: `platform_audit_entry.actor_user_id` and
`project_member.user_id` both `restrict`. And the `pitch_published` audit entry remains by design,
because that chain is hash-linked and append-only. Every one of those refusals is the deletion
policy working.

---

## 11. The video — shipped second, and the gate that should have come first

§4's model diagram has always shown `pitchVideoId → video`, and the column shipped with the
migration. **The feature did not.** Asked "where is the pitch video link, can funders see it like
Kickstarter", the honest answer was no, and `grep -rn "pitchVideoId" src/components` returned
nothing at all — no picker, no render, anywhere.

### 11a. ⚠️ The write was unvalidated, and that was a disclosure bug

`pitches.service.ts` wrote the client's `pitchVideoId` straight through. The foreign key proves
only that **a video row exists** — not that the founder owns it, not that it is public, not that
it has anything to do with the venture. A founder could name **any video id in the system**,
including a stranger's private or unlisted upload, and the moment the page rendered a title and
thumbnail that video would leak.

This is precisely what `studio.ts:297` warns about for `attached_pitch_id` — "deliberately NOT a
foreign key and deliberately NOT client-writable … accepting it today would store an unvalidated
client string". The column written to replace it repeated the mistake it was warned about.

**The fix is `isVideoEmbeddableByPitch`**, called on create and on every edit. Two conditions:
the video passes `PUBLICLY_SERVABLE` (imported from `public-video-gate.ts`, not re-typed — three
byte-identical copies already exist), and `video.research_project_id` is this pitch's project.
That second term is what makes ownership checkable without a second gate: attaching a video to a
venture already went through `resolveAttachableResearchProjectId`, which proved active membership
of an active project. **Four failures, one answer** — no such video, not public, not yours, not
this venture's — so the field cannot be used to probe video ids.

### 11b. The read is an object, joined through the gate in the ON clause

`PitchView.pitchVideoId` became `PitchView.pitchVideo`, carrying `videoId`, `videoSource`,
`youtubeVideoId`, `title`, `thumbnailUrl`, `durationSeconds` — every one already public on the
watch payload. The lifecycle columns are deliberately absent.

**The gate lives in the JOIN, not the WHERE.** In a WHERE it would filter the _pitch_ out whenever
its video stopped being public — a live funding solicitation vanishing because a moderator hid a
video. In the ON clause it only nulls the video. **Verified live:** hiding the video left the
pitch at HTTP 200 with `pitchVideo: null`.

This is the opposite of `spotlight.service.ts`, which inner-joins so an ineligible slot drops out
of its rail. Both are right: there the row _is_ the video; here it is not.

### 11c. Two bugs the live run found, both of the same family

- **Every write under-reported the video it had just saved.** `updatePitch` returned its own
  `.returning()` row, which carries pitch columns and no join — so `pitchVideo` came back `null`
  on the very response that attached a video. The row was right and the answer was wrong, which is
  the worst shape of bug because the client caches the lie. Every write now returns
  `readPitchViewById`, the joined re-read.
- **The picker rendered a 422 as "no videos".** It requested `limit=100`; that route caps `limit`
  at 50 and answers 422. The founder saw an empty state for a venture that had a video —
  "failed" collapsed into "empty", the exact conflation `view-state.ts` exists to prevent. The
  limit is now 50 _and_ the picker has a distinct error branch.

### 11d. What was deleted rather than kept

`listRecentPitchDecisions` was written for a staff panel that was never built, so nothing called
it. An uncalled export is unverified code — the same rule the frontend hook audit enforces — and
`platform_audit_entry` already answers that question durably. Deleted.

### 11e. The picker, and why its empty state is the main screen

It reads `GET /research-projects/:slug/videos` unchanged — public, already `PUBLICLY_SERVABLE`-
gated, so every option offered is one the write will accept. A picker over `GET /videos/mine`
would have listed drafts and private uploads the server then refuses.

**No video in the database has a venture attached**, so today every founder meets the empty state
first. It explains the two-step flow (attach the video to the venture in the upload wizard, then
pick it here) rather than shrugging.

### 11f. Verified live, then removed

Refused: a stranger's public video, a nonexistent id, and the founder's own video while still a
draft — all `422`, all the same message. Accepted once that video was published. Hidden video →
pitch still renders. Watched in a browser: the player leading the public page, and the picker both
empty and populated. The pitch, the video and the notification were deleted afterwards; the
throwaway venture is archived again.
