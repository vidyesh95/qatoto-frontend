# Research & Development — Structure

The frontend doc for the `/research-and-development` surface — the home of Qatoto's full
**concept-to-consumer pipeline**: market-demand research → problem mapping → team
building (equity for skills) → build with AI-analyzed daily logs → verified effort →
month-end compensation statements → go-to-market. The landing page tells the whole
pipeline story; deep features live on sub-routes.

**Read alongside:**

- [R_AND_D_BACKEND_STRUCTURE.md](R_AND_D_BACKEND_STRUCTURE.md) — the API contract this surface will
  consume. **Five of its six domains are shipped and reachable today**; only §10 (Project Immortal)
  is pending. Section references below like "backend §7A" point there.
- [PROOF_OF_EFFORT_SPEC.md](PROOF_OF_EFFORT_SPEC.md) — the Slicing Pie math and verification
  pipeline the `/proof-of-effort` route renders.
- [ESCROW_LEDGER_STRUCTURE.md](ESCROW_LEDGER_STRUCTURE.md) — where the escrow ledger design went
  (the **commerce** domain). It is not part of this surface any more.
- [CLAUDE.md](CLAUDE.md) — thin-client invariant, naming rules, current phase.

> **Phase note:** UI + mock data only. No fetch, no Zod, no loading/error states beyond simple
> placeholders, no new abstractions. Verified: **zero** `fetch(` / `useQuery` / `@tanstack` matches
> anywhere on this surface — every number on it (funding, equity, compensation, AI analysis, slice
> ledgers, opportunity scores, demand stats) is a **static mock**, and every interaction mutates
> page-local client state only.
>
> The backend being live does **not** move this surface into integration. §11–§14 below record what
> the integration phase must do — the wire format it adopts, the type shapes that must change, the
> endpoints each route calls, the screens that do not exist yet. They are a spec, not a changelog.

> **Escrow left this surface.** The backend contract made this domain **fully non-custodial and
> free**: Qatoto computes what each member is owed each month in cash and equity, and the parties
> settle it between themselves. Holding funds is regulated money movement in the EU, US and India,
> and gating a wage on a verification verdict — which the escrow design did — is unlawful
> withholding (backend §7A.6). Three copy rules follow, and they are non-negotiable:
>
> - **Qatoto holds no funds and charges nobody** in this domain. No client copy may imply a payment
>   rail, a hold, a charge, or a fee exists. A pledge is a **commitment**.
> - **Cash is never reduced or withheld by a verification verdict.** A flagged claim **annotates** a
>   compensation line and changes no number. Verification gates _equity_, never a wage.
> - **A statement is gross only** — no tax, no withholding, no social contribution — and the surface
>   says so. Qatoto is not a payroll processor.

---

## 1. What exists today

Everything on this surface is built. The table is an inventory, not a plan.

| Piece                    | Location                                                                                          | State                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Routes                   | [src/app/(home)/research-and-development/](<src/app/(home)/research-and-development/>)            | ✅ **10 page routes**, each with a sibling `loading.tsx`. No `layout.tsx` / `error.tsx` in the subtree      |
| Components               | [src/components/home/research-and-development/](src/components/home/research-and-development/)    | ✅ **81 files** — 10 page bodies, 13 cards, 3 rails, 44 sections, 5 sheets, 6 wizard. **21 client islands** |
| Types                    | [src/types/research-and-development/](src/types/research-and-development/)                        | ✅ **6 files, 67 exported types** — `shared` `project` `discovery` `workshop` `immortal` `proof-of-effort`  |
| Types re-export composer | [src/types/research-and-development.ts](src/types/research-and-development.ts)                    | ✅ kept deliberately — ~55 importers use the flat specifier and must keep working                           |
| Mocks                    | [src/mocks/research-and-development/](src/mocks/research-and-development/)                        | ✅ **34 leaf files** behind 4 top-level composers (§10)                                                     |
| Proof-of-Effort surface  | [proof-of-effort-page.tsx](src/components/home/research-and-development/proof-of-effort-page.tsx) | ✅ **its own route with 5 tabs** (§5b) — not documented in earlier revisions of this file                   |
| Project Immortal         | [page.tsx](<src/app/(home)/research-and-development/projects/project-immortal/page.tsx>)          | ✅ see §4b; the old `/project-immortal` route is a 6-line `redirect()` shim                                 |
| Sidebar nav              | [sidebar.tsx](src/components/home/layout/sidebar.tsx)                                             | ✅ top-level "R&D" (`science`) + a 5-item **Research and Development** section (§15 Q8)                     |
| Mobile bottom nav        | [mobile-bottom-nav.tsx:36](src/components/home/layout/mobile-bottom-nav.tsx#L36)                  | ✅ single R&D tab; sub-path matching works, no sub-links                                                    |
| Navbar breadcrumb        | [navbar.tsx](src/components/home/layout/navbar.tsx)                                               | ✅ `RESEARCH_AND_DEVELOPMENT_SUBPAGES` (5 entries) + a `prettifySlug` fallthrough for everything else       |
| Network layer            | —                                                                                                 | ❌ **none, by design** — zero fetch/React Query on the surface                                              |

Pattern donors elsewhere in the repo:

- **Component decomposition**: [src/components/home/store/](src/components/home/store/) —
  `rails/ cards/ sections/ sheets/` with the page bodies at the directory root. This surface mirrors
  that exactly, plus a `wizard/` directory.
- **Dynamic route under `cacheComponents: true`**:
  [store/product/[id]/page.tsx](<src/app/(home)/store/product/[id]/page.tsx>) —
  `generateStaticParams` is **required** or the build breaks.
- **Server panels into a client tab island**: [project-tabs.tsx](src/components/home/research-and-development/sections/project-tabs.tsx),
  cloned by `workshop-tabs.tsx` and `proof-of-effort-tabs.tsx`.

---

## 2. The pipeline in one picture

The founder's eight pillars, and which surface carries each:

| #   | Pillar                                               | Carried by                                                                                |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Market-demand research & feasibility                 | `/knowledge-hub` + demand chips on project Overview                                       |
| 2   | Problem Mapping / "Civic Pulse"                      | `/problem-map`                                                                            |
| 3   | Knowledge Hub (market intelligence)                  | `/knowledge-hub`                                                                          |
| 4   | Talent matching / Virtual Workshop                   | `/talent`, open-roles rail, Team tab, `/project/[id]/workshop`                            |
| 5   | Funding (crowd / VC, transparency)                   | Funding tab + `/funding` deal flow. **Records of intent only** — a pledge is a commitment |
| 6   | Daily Update Protocol (AI logs, Proof of Effort)     | Daily Logs tab + the whole `/project/[id]/proof-of-effort` route (§5b)                    |
| 7   | Financial governance (compensation, anti-corruption) | Compensation & governance tab (§5.5) — a **month-end statement**, not an escrow ledger    |
| 8   | Go-to-market (suppliers, ODM, shipping, storefront)  | Pipeline-stage card pointing at the existing **`/store`** B2B surface — no new route      |

Related surface **not** part of this doc: **Anime** (`/anime`), the creative-inspiration R&D feed.
Already built; referenced in copy only.

```mermaid
flowchart LR
  PM[Problem Map<br/>Civic Pulse] --> KH[Knowledge Hub<br/>demand intelligence]
  KH --> IDEA[/new wizard<br/>post an idea]
  IDEA --> TEAM[Team building<br/>equity for skills]
  TEAM --> BUILD[Workshop + Daily Logs]
  BUILD --> POE[Proof of Effort<br/>verified slices]
  POE --> COMP[Month-end statement<br/>cash + equity owed]
  COMP --> GTM[Go-to-market<br/>/store B2B]
```

---

## 3. Route map

Ten page routes, each with a `loading.tsx`.

```text
/research-and-development                             ✅ pipeline hub landing
/research-and-development/new                         ✅ 4-step idea wizard
/research-and-development/project/[id]                ✅ project detail (5 tabs)
/research-and-development/project/[id]/workshop       ✅ Virtual Workshop (boards/files/chat)
/research-and-development/project/[id]/proof-of-effort ✅ Slicing Pie ledger (5 tabs) — §5b
/research-and-development/problem-map                 ✅ Civic Pulse map + reports
/research-and-development/knowledge-hub               ✅ market intelligence
/research-and-development/talent                      ✅ people trading skills for equity
/research-and-development/funding                     ✅ investor deal-flow view
/research-and-development/projects/project-immortal   ✅ moonshot research program — §4b
/project-immortal                                     ✅ redirect() shim, pre-move links
```

Route decisions baked in:

- **Project detail is one route with client-state tabs**, not nested tab segments — nested segments
  under `[id]` each need `generateStaticParams` plumbing and buy nothing in a mock phase.
- **Proof of Effort is a sibling route, not a sixth tab** — it carries five tabs of its own, so
  nesting it inside the detail tab bar would mean tabs inside tabs.
- **Detail nests under `/project/`** so the dynamic segment cannot collide with the static
  `problem-map` / `knowledge-hub` / `talent` / `funding` segments (mirrors `/store/product/[id]`).
- **All three `[id]` routes export `generateStaticParams`** (cacheComponents constraint), each
  reading the mock array directly — there is no getter layer this phase:

```typescript
import { MOCK_RESEARCH_PROJECTS } from "@/mocks/research-and-development-mocks";

// Prerender every mock project slug — required for a dynamic route under cacheComponents.
export function generateStaticParams() {
    return MOCK_RESEARCH_PROJECTS.map((project) => ({ id: project.id }));
}
```

- **`params` is a Promise** (`Promise<{ id: string }>`) and every `[id]` route uses
  `generateMetadata`, not a static `metadata` export.

---

## 4. Landing — `/research-and-development`

Top-to-bottom composition (server component, mirrors [store-page.tsx](src/components/home/store/store-page.tsx)):

| #    | Section                                                 | Purpose / content                                                                                                                                                                                        | Mock source                                  |
| ---- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 4.1  | **Hero band** (`pipeline-hero`)                         | "From concept to consumer." Pitch + two CTAs: **Post your idea** → `/new`, **Explore projects** → anchor to 4.3                                                                                          | static copy + `rnd_hero_bg_01.avif`          |
| 4.2  | **Pipeline stages strip** (`pipeline-stages-strip`)     | 6 stage cards condensing the 8 pillars: Market Research → Problem Mapping → Team Building → Build & Daily Logs → Funding & Governance → Go-to-Market                                                     | inline `PIPELINE_STAGES`                     |
| 4.2b | **Lifecycle roles strip** (`lifecycle-roles-strip`)     | The five ways to contribute — Researcher, Founder & Director, Venture Capitalist, Supplier, Supporter — with the compensation modes each supports. Stages are _what_ gets built; this is _who_ builds it | inline `LIFECYCLE_ROLES`                     |
| 4.3  | **Featured projects rail** (`projects-rail`)            | `ProjectCard`s: cover, name, tagline, stage badge, funding progress bar, team avatar stack, open-roles count → `/project/[id]`                                                                           | `MOCK_RESEARCH_PROJECTS` (6, all stages)     |
| 4.4  | **Problem map teaser** (`problem-map-preview`)          | Split: stylized map thumbnail with pins; "Top reported gaps" list (location, category, report count, opportunity score). CTA → `/problem-map`                                                            | top slice of `MOCK_PROBLEM_REPORTS`          |
| 4.5  | **Market insights rail** (`market-insights-rail`)       | `MarketInsightCard`s: headline stat, trend arrow, region + category chips. CTA → `/knowledge-hub`                                                                                                        | `MOCK_MARKET_INSIGHTS`                       |
| 4.6  | **Open roles rail** (`open-roles-rail`)                 | "Join a team for equity": role title, project name, skill chips, equity range, commitment tag, **Express interest** (client toggle → "Interest sent")                                                    | `MOCK_OPEN_ROLES` (flatMapped from projects) |
| 4.7  | **Project Immortal banner** (`project-immortal-banner`) | Full-width featured card, teal-gradient moonshot styling → `/research-and-development/projects/project-immortal`                                                                                         | static copy + a `diamond` glyph              |
| 4.8  | **Bottom CTA band**                                     | "Have an idea the world needs? Post it." → `/new`                                                                                                                                                        | none                                         |

---

## 4b. Project Immortal — `/research-and-development/projects/project-immortal`

The moonshot research program (extending healthy human life), and the reference implementation of
what an R&D _research_ project looks like on Qatoto. Body in `project-immortal-page.tsx`; mocks under
`src/mocks/research-and-development/immortal/`; types in `src/types/research-and-development/immortal.ts`.

| Section                              | Content                                                                                                                                                                                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project-immortal-hero`              | Teal-gradient identity matching the landing banner + four program stats                                                                                                                                                                                        |
| `research-branch-map` 🏝️             | Hand-rolled SVG flowchart of every research branch. Status-coded nodes (`active`/`emerging`/`contested`/`missing`); `missing` = a gap Qatoto highlights; `overlappingGroupCount >= 2` = duplicated work. Selecting a node fills `research-branch-detail-panel` |
| `project-immortal-products`          | Monetizable products derivable from each branch                                                                                                                                                                                                                |
| `project-immortal-papers` 🏝️         | **Formal** paper library + upload dropzone (local list only; no network)                                                                                                                                                                                       |
| `project-immortal-informal-posts` 🏝️ | **Informal** track — blog-style ideas, no proofs or citations                                                                                                                                                                                                  |
| `project-immortal-contributors` 🏝️   | Who is building it, effort/money tracked, compensation preference, role filter chips                                                                                                                                                                           |
| `project-immortal-discussion` 🏝️     | Netizen ideas on increasing lifespan; composer + expandable replies (`idea-item` 🏝️ + `idea-reply-item`)                                                                                                                                                       |

The geometry and node constants are split out of the island into
`research-branch-map.constants.ts` / `research-branch-map.geometry.ts` so the client bundle carries
only the interaction code.

> **This is the one surface with no backend behind it.** Backend §11f is ⏳ pending — no
> `research-programs.routes.ts`, no controller, no migration. Everything here stays mock until backend
> phase 6.

---

## 5. Project detail — `/research-and-development/project/[id]`

**Header** (`project-header`, always visible above tabs): cover image band; name + tagline; stage
badge + category chips; founder avatar + name; stats row (raised % of goal, team size, daily-log
streak days, watchers); **Request to join** (🏝️ `request-to-join-button`) and **Back this project**
(🏝️ `back-project-sheet`).

**Tab bar** — 5 tabs, client state, rendered via exhaustive `switch` over a `ProjectDetailTab` union
with a `never` default (`CLAUDE.md` Pattern 1). `project-tabs.tsx` is a small `"use client"` island
that receives each **server-rendered panel as a `ReactNode` prop** — panels stay server components.

### 5.1 Overview

- Problem statement + solution summary.
- **Market-demand evidence chips** — 2–3 `MarketInsight`s cross-referenced from the knowledge-hub
  mocks (shows the surfaces interlock).
- "Born from Civic Pulse report" link chip when `originProblemReportId` is set → `/problem-map`.
- Link chips out to the **Virtual Workshop** and **Proof of Effort** sibling routes.
- **Milestone timeline** (`milestone-timeline`) — vertical, done / current / upcoming, with the
  planned payout per milestone. Lives here rather than a sixth tab to keep the bar tight.

> When the backend lands, keep the founder's own `demandEvidenceNotes` **visually distinguishable**
> from a platform-computed demand signal (backend §5). An assertion must never read as verified
> evidence.

### 5.2 Daily Logs (pillar 6)

Feed of `DailyLogCard`s, date-grouped, behind 🏝️ `daily-logs-feed` (member filter chips):

- date, author avatar, **video-thumbnail placeholder** with play glyph,
- transcript excerpt (2 lines, clamped), expandable via native `<details>/<summary>` (zero JS),
- **AI summary chips**, kind-colored: `blocker` / `progress` / `velocity` / `suggestion`,
- "Proof of Effort verified" badge.

> Backend §8 ships this as: video is an **optional pasted YouTube link** (never uploaded bytes, never
> Livepeer), one Gemini call produces transcript + chips + claims together, and submit returns
> **`202`** — not a verdict. `isEffortVerified: boolean` becomes a six-value enum (§12).

### 5.3 Team (pillar 4)

- **Equity split summary bar** — stacked horizontal, one segment per member + unallocated.
- Roster cards (`team-member-card`): name, role, skills, equity %, effort-hours logged, joined date,
  founder marker.
- **Open roles** cards with Express-interest buttons (same interaction as landing 4.6), apply via
  sheet §8.4.

> Equity is **computed, never asserted** (backend §0). There is no writable equity column and no
> endpoint that sets one — a founder cannot type a number into someone's stake. `isFounder` goes
> away, derived from a project role instead (§12).

### 5.4 Funding (pillar 5)

- Current round card: type badge (`equity` / `crowdfunding` / `venture`), goal vs raised, progress
  bar, backer count, closes-on date.
- Backer avatar list; past rounds table.
- **Investor confidence meter** — visual-only gauge, annotated in-UI as derived from log streak +
  verified milestones. Currently a hardcoded `78`.
- **Back this project** → sheet §8.3.

> Three integration facts. Raised totals are sums of **committed** pledges and the copy must label
> them that way. `investor-confidence` returns **`404` when never computed** — render "not computed
> yet", never a fabricated `0`. And **equity/venture round types are API-disabled** (securities
> offerings); hiding a chip in `funding-deal-filter-grid.tsx` is cosmetic, not a control.

### 5.5 Compensation & governance (pillar 7)

What `governance-tab.tsx` renders today is an **escrow ledger the contract no longer describes**.
What it must render is the **month-end compensation statement** — the pipeline's headline output
(backend §7A):

- **Period header**: the month, the project's time zone, `open` / `finalized` / `superseded`; for a
  finalized period, who finalized it, who countersigned it, and the statement hash. For an **open**
  period, show its `asOf` — nothing is frozen and the numbers may still move.
- **Per-member statement table**: one row per member with **cash owed** (retainer or hourly, with
  the verified minutes behind an hourly line) and the **equity delta** in basis points — signed,
  because a share falls when others out-contribute you.
- **Payment state per line**: unpaid / recorded / **confirmed by the member**. A recorded payment the
  member has not confirmed renders as _unconfirmed_, **never** as paid.
- **Actions**: finalize (founder), countersign (a **different** admin), record a payment, confirm a
  payment (the member), export CSV/JSON for the founder's payroll provider.
- Funding cards stay, re-labelled: a pledge is a **commitment**, not a charge. No allocated /
  released / held cards — there is no pool to allocate from.
- Corrections **supersede**; nothing is ever edited. There is no PATCH on a period or a line, and no
  endpoint that marks a line paid directly.

> Every figure here is a static mock today and entirely server-owned once integration starts. The
> frontend never computes or enforces any of it — and the three copy rules in the header note
> (no custody, no verdict-gated wages, gross only) each have a statute behind them.

---

## 5b. Proof of Effort — `/research-and-development/project/[id]/proof-of-effort`

The Slicing Pie ledger, and the most numerically dense surface in the app. Body in
`proof-of-effort-page.tsx` (server): resolves the project from `MOCK_RESEARCH_PROJECTS` and the
ledger from `MOCK_PROJECT_PROOF_OF_EFFORT_LEDGERS`, `notFound()` on either miss, then hands five
server-rendered panels to 🏝️ `proof-of-effort-tabs` as `ReactNode` props. Only client state is
`activeSection`, over a `ProofOfEffortSection` union with an exhaustive `switch`.

| #   | Section id     | Label        | Panel                       | Cards                                                   |
| --- | -------------- | ------------ | --------------------------- | ------------------------------------------------------- |
| 1   | `slice-ledger` | Slice Ledger | `slice-ledger-tab`          | `member-slice-breakdown-card`, `compensation-badges`    |
| 2   | `verification` | Verification | `verification-pipeline-tab` | `claim-verification-card`, `physical-work-receipt-card` |
| 3   | `disputes`     | Disputes     | `dispute-window-tab`        | `dispute-window-entry-card` 🏝️                          |
| 4   | `optimization` | Optimization | `optimization-tab`          | —                                                       |
| 5   | `audit-trail`  | Audit Trail  | `project-audit-trail-tab`   | —                                                       |

Mechanism spec: [PROOF_OF_EFFORT_SPEC.md](PROOF_OF_EFFORT_SPEC.md) §3 (Slicing Pie math) and §4
(verification pipeline, 24-hour dispute window, physical receipts). Backend §9 is **✅ shipped in
full** — this is the surface with the largest gap between what the API offers and what the UI
exposes (§14).

Two things this surface currently renders that the contract contradicts, both on the §12 list:

- **Short hashes.** `entryHashLabel: "a1f9c3"` is a _rendering_ of a 64-char hash. At 24 bits,
  collisions hit 50% around 4,800 entries — it must never be a key, a cache key, or an equality test.
- **Pre-composed equations.** `timeSliceEquationLabel` bakes a `×`, a currency and a locale into one
  string. The client composes that sentence from typed integers instead.

---

## 6. Problem map — `/research-and-development/problem-map` (Civic Pulse)

`problem-map-page.tsx` is a thin server shell; all interaction lives in 🏝️ `problem-map-canvas`:

- **Map canvas**: a `relative` container with `public/dummy/world_map.svg` via `next/image` and
  reports mapped to `<button>` pins positioned from `mapPosition: { leftPercent, topPercent }` —
  **no map library**. Pin markers carry a category icon inside an opportunity-score ring
  (red ≥80 / amber ≥60 / teal below); size scales `size-3`/`size-4`/`size-5` by score. Mapping lives
  in `PIN_ICON_SRC_BY_CATEGORY`.
- **Report list** (`problem-report-list`, a server component taking props) beside/below the canvas —
  also the mobile-first view.
- Category filter chips + `selectedReportId` cross-highlighting, both client-side.
- **Report a problem** sheet (§8.2) appends to the canvas's local `reports` state — lost on refresh.

> **`mapPosition` cannot survive integration.** It is a CSS offset into one specific SVG at one
> aspect ratio, so MapKit / MapLibre / Google Maps cannot render it and both native clients are dead
> on arrival. The backend stores **lat/lng microdegrees**; web keeps its SVG by projecting them to
> percentages client-side (§12).
>
> Also integration-phase: the sheet currently fabricates `countryCode: ""`,
> `mapPosition: {50, 50}`, `reportCount: 1` and `opportunityScore: 40` client-side. **Every one of
> those becomes server-derived** — and a submission is not a report: `reportCount: 342` means 342
> distinct people, so the map renders a server-side **cluster**, and `POST` returns **`202`** because
> clustering is a job.

---

## 7. Knowledge hub — `/research-and-development/knowledge-hub`

- Header framing: "where demand is highest."
- **Insight card grid** — the same `MarketInsightCard` as landing 4.5, full set.
- **Demand leaderboard** (`trending-demand-signals`): rank, category, region, demand score, trend,
  related-projects count.
- **Rising categories** trend chips row.

All static mock. No chart library — plain numbers + arrow glyphs (▲ ▼ —). Real charting is a later
phase. Scores are server-computed on a nightly schedule once integrated, never computed on read and
never accepted in a body.

---

## 8. Sheets

All four are self-contained `"use client"` components exporting their own trigger button + bottom
sheet (mirrors the store sheets pattern). Shared field options live in `sheets/sheet-shared.ts`.

| #   | Sheet                  | Trigger                                                 | Fields                                                                                  | On submit (mock)                                                |
| --- | ---------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 8.1 | `post-idea-sheet`      | **unwired** — kept as the compact-form donor for `/new` | idea name, one-line pitch, category, problem it solves, roles needed (chips)            | confirmation state only                                         |
| 8.2 | `report-problem-sheet` | Problem-map header                                      | title, category (creatable combobox), location text, description                        | appends to `problem-map-canvas`'s local list                    |
| 8.3 | `back-project-sheet`   | Project header + Funding tab                            | pledge preset / custom amount, **commitment** explainer copy (no charge, no funds held) | trigger flips to "Backed ✓"; the progress bar does **not** move |
| 8.4 | `apply-role-sheet`     | Open-role cards (landing 4.6 + Team tab)                | short pitch, skills (chips), commitment select, equity expectation                      | button flips to "Interest sent"                                 |

---

## 9. User journeys

| Journey                                                                                           | Phase-1 behavior                       | Real or visual?                         |
| ------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------- |
| Browse → open project → read all 5 tabs                                                           | Full navigation + tab switching        | ✅ Real (mock data)                     |
| Project → Workshop / Proof of Effort sibling routes                                               | Full navigation + 3- and 5-tab islands | ✅ Real (mock data)                     |
| Express interest in a role                                                                        | Button → "Interest sent" toggle        | ✅ Real, client state only              |
| Back a project                                                                                    | Sheet → confirm → "Backed ✓"           | ✅ Real, client state; bar doesn't move |
| Report a problem                                                                                  | Sheet → appends to canvas list         | ✅ Real, lost on refresh                |
| Founder posts idea                                                                                | `/new` wizard → 4 steps → confirmation | ✅ Real; nothing is appended anywhere   |
| Invite talent                                                                                     | Button → "Invited" toggle              | ✅ Real, client state only              |
| AI chips, Proof of Effort, slice ledgers, compensation statements, confidence, opportunity scores | Static render                          | 👁️ Visual-only, backend-owned           |

```mermaid
flowchart LR
  L[Landing] -->|project card| D[Project detail]
  D -->|Team tab| J[Apply for role → Interest sent]
  D -->|Funding tab| B[Back project → Backed]
  D -->|Overview chips| W[Workshop] & P[Proof of Effort]
  L -->|teaser| M[Problem map] -->|sheet| R[Report added locally]
  L -->|hero CTA| I[/new wizard → confirmation]
```

---

## 10. Types & mocks — where they actually live

Two trees, both split by domain. Neither has a fetch layer, a getter, or a `"use cache"` annotation —
that layer slots in on top at integration without moving anything.

**Types** — `src/types/research-and-development/`, 6 files / 67 exported types, all `export type`,
zero runtime exports:

| File                 | Covers                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `shared.ts`          | cross-cutting unions: `ProjectStage`, `RoleCommitment`, `AiSummaryChip*`, `MilestoneStatus`, `FundingRound*`, `Escrow*`, `TrendDirection`                                                              |
| `project.ts`         | `ResearchProject`, `TeamMember`, `OpenRole`, `DailyLog`, `Milestone*`, `FundingRound`, `CompensationComponent`, `EscrowLedgerEntry`, `MapPosition`                                                     |
| `discovery.ts`       | `ProblemReport`, `MarketInsight`, `TrendingSignal`, `TalentProfile`, `TalentAvailability`                                                                                                              |
| `workshop.ts`        | `ProjectWorkshop`, `WorkshopBoardColumn`, `WorkshopTask*`, `WorkshopFile*`, `WorkshopChatMessage`                                                                                                      |
| `immortal.ts`        | 13 `Immortal*` types — branches, papers, posts, ideas, contributors, product opportunities, program stats                                                                                              |
| `proof-of-effort.ts` | 20 types — `MemberSliceBreakdown`, `VerificationStep*`, `ClaimVerificationRun`, `DisputeWindow*`, `PhysicalWorkReceipt*`, `OptimizationSuggestion*`, `ProjectAuditEntry`, `ProjectProofOfEffortLedger` |

[src/types/research-and-development.ts](src/types/research-and-development.ts) is a **re-export
composer** (`export * from "./research-and-development/shared"`, …), kept so ~55 existing importers
of the flat specifier keep working. New code may import either.

**Mocks** — four top-level composers over a leaf tree:

| Composer                                                      | Exports                                                                                                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/mocks/research-and-development-mocks.ts`                 | `MOCK_RESEARCH_PROJECTS` (6) + `MOCK_OPEN_ROLES` (flatMapped from them); re-exports insights, problem reports, talent, trending signals, investor confidence, `PROJECT_STAGE_LABELS` |
| `src/mocks/research-and-development-proof-of-effort-mocks.ts` | `MOCK_PROJECT_PROOF_OF_EFFORT_LEDGERS`; its header carries the Slicing Pie recipe the mocks were computed with                                                                       |
| `src/mocks/research-and-development-workshop-mocks.ts`        | `MOCK_PROJECT_WORKSHOPS`                                                                                                                                                             |
| `src/mocks/project-immortal-mocks.ts`                         | re-export-only composer for every `MOCK_IMMORTAL_*` + the four label maps                                                                                                            |

Leaf files under `src/mocks/research-and-development/` (34):

```text
investor-confidence.ts  market-insights.ts  problem-reports.ts
project-stage-labels.ts talent-profiles.ts  trending-signals.ts
immortal/        branches · contributors · ideas · informal-posts · papers ·
                 product-opportunities · program-stats · labels
projects/        one file per slug → <SLUG>_PROJECT
proof-of-effort/ one file per slug → <SLUG>_LEDGER
workshop/        one file per slug → <SLUG>_WORKSHOP
```

The six slugs are identical across `projects/`, `proof-of-effort/` and `workshop/`:
`solar-cold-storage`, `modular-water-purification`, `agricultural-drone-kits`,
`prefab-housing-panels`, `e-waste-recycling-line`, `medical-cold-chain-packaging`. There is no barrel
inside the leaf directory — consumers import a composer or a leaf file directly.

**Today's value convention**, and it is the thing §11 replaces: money, percentages, durations, file
sizes and equations are **pre-formatted display strings** (`"$6,000"`, `"62%"`, `"148 hrs"`,
`"1.8 MB"`, `"Locks in 9h 14m"`); only values driving CSS (progress-bar width, pin position,
`sliceSharePercent`) are numbers. Several type-file headers state this as deliberate — those headers
are themselves on the migration list (§12).

---

## 11. The wire-format contract (integration phase)

Backend §1. The server sends **raw integers in explicitly named units** and each client formats.
This replaces the display-string convention above.

| Kind         | Wire field     | Unit                                                        |
| ------------ | -------------- | ----------------------------------------------------------- |
| Money        | `…InCents`     | integer cents, always with an ISO 4217 `currency` alongside |
| Equity       | `…BasisPoints` | integer basis points, `10000` = 100%                        |
| Effort       | `…Minutes`     | integer minutes                                             |
| File size    | `…Bytes`       | integer bytes                                               |
| Score        | `…Points`      | integer, stated range                                       |
| Instant      | `…At`          | ISO-8601 UTC                                                |
| Calendar day | `…Date`        | ISO-8601 date-only `YYYY-MM-DD`                             |

Three reasons it is not negotiable:

1. **Three first-class clients.** Web, native Kotlin/Android, native Swift/iOS. A server-rendered
   `"$6,000"` ships USD and English to every device on earth and cannot be localized downstream.
2. **Sorting and filtering.** `"$1,450"` cannot be compared, summed, or ranked.
3. **Durations are stale on arrival.** `"Locks in 9h 14m"` is wrong the moment it is serialized —
   the server sends `windowClosesAt` and the client counts down.

Two corollaries for this repo specifically:

- **Money past 2^53 crosses the wire as a decimal string** (`bigint` columns: rate cents,
  valuation cents, slice numerators). Parse to `bigint`/`BigInt`, never to `number`.
- **A hash is 64 lowercase hex chars.** Render a short form if you like; never key, cache, or compare
  on it.

> This is **not** the security mechanism. Raw numbers do not stop tampering — the thin-client
> invariant does. The client never sends money back at all, so there is nothing for it to falsify.

---

## 12. Type-shape migration checklist (integration phase)

Backend §15. Not just values — **shapes**. Every row is a compile error the migration works through.

### `project.ts`

| Today                                    | Becomes                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `TeamMember.equityShare: "62%"`          | `equityBasisPoints: 6200`                                                                                    |
| `TeamMember.effortHoursLogged: 148`      | `verifiedEffortMinutes: 8880`                                                                                |
| `TeamMember.joinedDate`                  | `joinedAt` (ISO)                                                                                             |
| `TeamMember.id` (person slug)            | `userId`                                                                                                     |
| `TeamMember.isFounder`                   | **removed** — derived from `projectRole` (`founder`/`admin`/`maintainer`/`contributor`)                      |
| `CompensationComponent.amountLabel`      | a **discriminated union per kind** carrying typed integers                                                   |
| `CompensationComponent.earnedAsLabel`    | `earnedAsPolicy` enum — the two escrow values are retired, never writable                                    |
| `MilestoneVariance` (5 labels)           | six typed integers + two unit nouns; `varianceLabel: "26% behind"` → **signed** `varianceBasisPoints: -2600` |
| `Milestone.escrowReleaseAmount`          | **`plannedPayoutInCents`** — renamed as well as retyped; it no longer instructs a payment rail               |
| `FundingRound.goalAmount`/`raisedAmount` | cents (raised = sum of **committed** pledges)                                                                |
| `FundingRound.percentageFunded`          | **deleted** — computed on read, may exceed 100%                                                              |
| `DailyLog.date`                          | **splits** into `logDate` + `submittedAt`                                                                    |
| `DailyLog.isEffortVerified: boolean`     | the six-value enum: `not_run` `queued` `running` `verified` `flagged_for_review` `unverified`                |
| `ResearchProject.founderId` (slug)       | `founderUserId`                                                                                              |
| `ResearchProject.coverImageSrc`          | absolute URL                                                                                                 |
| `ResearchProject.id`                     | **stays a slug, deliberately** — it is the public URL identity                                               |
| `EscrowLedgerEntry`                      | **deleted outright**                                                                                         |

**New in `project.ts`, no mock ancestor** — the §7A shapes:

- `CompensationPeriod` — `periodStartDate`/`periodEndDate` (date-only), `timeZone`, `status`,
  `statementHash` (full 64), `finalizedAt`/`countersignedAt` (ISO or null), plus `asOf` while open.
- `CompensationPeriodLine` — a **discriminated union on `kind`**: `cash_retainer` and `cash_hourly`
  carry `grossAmountInCents` + `currency` (`cash_hourly` adds `effortMinutes`); `equity_delta`
  carries three basis-point integers and **no money field**. The union is what stops a client summing
  equity into a cash total.
- `CompensationPaymentRecord` — `paidAmountInCents`, `paidOnDate`, `methodKey`,
  `confirmedByMemberAt` nullable. **No account numbers, ever.** Unconfirmed renders as unconfirmed.

### `discovery.ts`

`ProblemReport`: **`mapPosition` deleted entirely** → lat/lng microdegrees · `category: string` →
`{ slug, displayLabel, pinIconKey }` · `reportedDate` → `firstReportedAt` + `lastReportedAt` ·
`reportCount` → `distinctReporterCount`. `MarketInsight.statValue` → `statKind` + `statValueMilli` +
`statUnitKey`; `sourceNote` → three fields. `TalentProfile.skills: string[]` →
`{ slug, displayLabel, isVerified }[]`; `effortHoursLogged` → minutes.

> The skill retype also **fixes a live bug**: `talent-filter-grid.tsx` filters with
> `skills.some((skill) => skill.includes(chipText))` — a substring match, so a "Water" chip matches
> "Water Polo". Slugs fix it by construction.

### `workshop.ts`

`WorkshopFile.fileSizeLabel: "1.8 MB"` → `sizeBytes` (and it is **NULL** for a link-hosted file — the
backend never measures a Drive URL). `WorkshopTask.dueDateLabel` → date-only ISO, and the task
**gains `rank`** (server-derived; the client never computes one). `WorkshopChatMessage.sentAtLabel` →
ISO with microsecond precision, because it is also the keyset cursor.

### `immortal.ts`

Every `*CountLabel` → integer · every `*AtLabel` → ISO · `canvasPosition` → topology (layout is the
client's business, not data) · `marketPotentialLabel` → `bigint` cents · `readinessLabel` → two
month integers · `effortLabel` **splits in two** (it holds two different meanings today) ·
`ProgramStat.statValue` → integer + key.

### `proof-of-effort.ts`

Essentially every field — it is the file most fully composed of pre-rendered strings and equations.

| Today                                       | Becomes                                                                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `timeSliceEquationLabel`                    | `{ verifiedMinutes, lockedRateCentsPerHour, timeSlices }` — **the client composes the sentence**, so the `×` and the currency localize |
| `sliceSharePercent: 5.5` (a **float**)      | `equityBasisPoints: 550`                                                                                                               |
| `timeRemainingToLockLabel`                  | `windowClosesAt` (ISO)                                                                                                                 |
| `entryHashLabel: "a1f9c3"`                  | the full 64-char `entryHash`                                                                                                           |
| `slicesAwardedLabel: "960 slices withheld"` | `{ slicesAwarded: 0, proposedSlices: 960, status }` — one prose string carrying two numbers and a state                                |

### Enums and missing variants

- **Every kebab-case union value becomes `snake_case`**: `"full-time"` → `"full_time"`, `"one-time"`
  → `"one_time"`, `"market-research"` → `"market_research"`. Touches `shared.ts`, `project.ts`,
  `PROJECT_STAGE_LABELS`, and every filter chip keyed off them.
- **Delete from `shared.ts`**: `EscrowDirection`, `EscrowVerificationStatus`.
- **Missing variants to add**: `VerificationStepStatus` has no `failed` or `skipped`;
  `PhysicalReceiptVerdict` has no `pending`; `ImageForensicsCheckResult` has no `not_applicable`;
  `evidenceLabels: string[]` needs identity. There is no `dispute_vote` concept, no project-role
  concept, no `engagementKind`, and no `escrowedSlices`.

> **`escrowedSlices` keeps its name even though escrow is gone.** It means _slices frozen outside
> `totalSlices` while a dispute runs_ — a pool, never money. Comment the type; do not rename the
> shipped backend column.

### Headers to rewrite

Four type-file headers name `src/mocks/research-and-development-mocks.ts` as the sole mock source
(true for `shared`/`project`/`discovery`/`workshop`, but `immortal` and `proof-of-effort` have their
own composers). And two places state the display-string convention as deliberate — the
`proof-of-effort.ts` header ("every figure arrives as a pre-computed display string") and the inline
note on `MemberSliceBreakdown`. Both must be rewritten when §11 lands, not before.

---

## 13. Route → endpoint map (integration phase)

Backend §11. Five of six domains are shipped, so the integration phase can be ordered by what
already exists.

| Frontend route                  | Endpoints                                                                                                                                                                                       | Backend        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `/research-and-development`     | `GET /research-projects` · `GET /discovery/problem-clusters` · `/market-insights` · `GET /open-roles`                                                                                           | ✅ shipped     |
| `/new`                          | `POST /research-projects` (creates a **draft** — an idea _is_ a project) · `POST …/publish` · `GET /research-categories`                                                                        | ✅ shipped     |
| `/project/[id]`                 | `GET /research-projects/:slug` · `/team` · `/milestones` · `/daily-logs` · `/funding-rounds` · `/investor-confidence` · `/compensation-periods`                                                 | ✅ shipped     |
| `/project/[id]/workshop`        | `…/workshop` · `/board` · `/columns` · `/tasks` · `/tasks/:id/move` · `/files` · `/chat` (keyset) · `/chat/read`                                                                                | ✅ shipped     |
| `/project/[id]/proof-of-effort` | `…/proof-of-effort` · `/slice-ledger` · `/equity` · `/equity/snapshots` · `/effort-claims` · `/allocation-proposals` · `/disputes` · `/audit-trail` · `/verify` · `/integrations` · `/pie-bake` | ✅ shipped     |
| `/problem-map`                  | `GET /discovery/problem-clusters[/:id]` · `POST /discovery/problem-reports` → **`202`**                                                                                                         | ✅ shipped     |
| `/knowledge-hub`                | `GET /discovery/market-insights` · `/demand-signals` · `/regions`                                                                                                                               | ✅ shipped     |
| `/talent`                       | `GET /discovery/talent` · `PUT /discovery/talent/me` · `POST …/invites`                                                                                                                         | ✅ shipped     |
| `/funding`                      | `GET /funding/deals` · `POST /funding-rounds/:id/pledges` (`{ amountInCents }`, nothing else) · `GET …/investor-confidence`                                                                     | ✅ shipped     |
| Governance tab (§5.5)           | `…/compensation-agreements` · `…/compensation-periods[/:id]` · `/finalize` · `/countersign` · `/supersede` · `…/payments[/:id]/confirm` · `/export` · `/verify`                                 | ✅ shipped     |
| `/projects/project-immortal`    | `/research-programs/*`                                                                                                                                                                          | ⏳ **pending** |

**404 is the not-authorized answer.** Every project-scoped route re-checks membership and fails
**`404`**, not `403`, so a stranger cannot probe which project ids exist. Treat 404 as "no access or
no such thing" and never render a "you don't have permission" hint that leaks existence.

Client-side rules the contract forces, none of which the surface does today:

- **Keyset pagination everywhere.** `ProjectProofOfEffortLedger` is one flat object of unbounded
  arrays; a two-year-old project has thousands of entries.
- **Async states are real.** Claim submit, log submit, receipt upload and problem report all return
  **`202`**, not a verdict. Pending states plus polling — never an optimistic verdict.
- **Idempotency keys** on claim submit, receipt upload, dispute raise and payment record, or a
  retried request on a flaky mobile connection duplicates.
- **Multiple verification attempts.** `ClaimVerificationRun` models one run; re-verification produces
  attempt 2+ and the UI would show stale results.
- **Server-side filtering replaces client filtering** on every list —
  `?category=&region=&commitment=&skill=&availability=&sort=&page=&limit=`. Heavy work belongs on the
  server (`CLAUDE.md` §Performance).
- **A chip is not a control.** `ENABLED_FUNDING_ROUND_TYPES` is enforced at the API and in SQL;
  hiding equity/venture in `funding-deal-filter-grid.tsx` stays cosmetic.
- **Never fabricate a missing signal.** `investor-confidence` 404s when never computed; render the
  absence.

When the integration phase opens, everything crossing the network is `unknown` → Zod `.strip()` →
tagged result, lifted into the component's state union (`CLAUDE.md` Patterns 1–3). Not this phase.

---

## 14. Missing screens, and the order to build them

Backend §14 — API exists, no UI at all. The first two have **stopped being UX debt and become
compliance gaps**, which is why they lead (backend §16).

1. **Dispute / vote / override UI.** No dispute button, no vote UI, no quorum progress, no "who
   raised it", and no surface for a maintainer to review a flagged step and override it. This is the
   GDPR Art. 22 contestability path and the EU AI Act Art. 14 human-oversight control — **a backend
   that offers human intervention through an endpoint no screen calls does not, in practice, offer
   it.**
2. **Integration consent screen** (connect / scope / revoke). No frontend at all; the single largest
   missing screen, and the lawful-basis + transparency surface for worker monitoring. Proof of Effort
   cannot function without it.
3. **The whole §7A compensation surface.** No agreement proposal or acceptance, no statement view, no
   finalize or countersign, no payment attestation or member confirmation, no export.
   `governance-tab.tsx` renders an escrow ledger the contract no longer describes. This is the
   product's headline output (§5.5).
4. **Rate lock.** No UI to propose, review, lock, or view the history of a fair market rate — the
   foundation of every number on the Proof-of-Effort page.
5. **Workshop writes.** The kanban is not draggable and the chat composer is a decorative `div`. No
   create-task, move-task, add-file or send-message affordance exists.
6. **Everything else**: pie bake (action + pre-bake checklist + frozen cap-table view), chain
   verification ("Verify chain" + hash-input inspector — without it the hash-chain framing is
   decoration), project edit entry point, talent profile editing, paper moderation queue, tiered /
   multi-currency funding.

---

## 15. Decisions — all resolved

1. **Stage taxonomy** — ✅ the 6-stage taxonomy shipped as specced (`market-research`,
   `problem-validation`, `team-building`, `building-mvp`, `raising-funding`, `go-to-market`).
   Integration renames them `snake_case` (§12).
2. **Map rendering** — ✅ static `public/dummy/world_map.svg` + percent-positioned pins, zero
   dependencies. Integration replaces the percentages with projected lat/lng (§6, §12).
3. **Post-idea** — ✅ promoted to the `/new` wizard. Landing hero + bottom CTAs link there;
   `post-idea-sheet.tsx` stays in the repo intentionally unwired as the compact-form donor.
4. **Tabs** — ✅ client-state only, three islands (`project-tabs`, `workshop-tabs`,
   `proof-of-effort-tabs`). No `?tab=` and no nested segments.
5. **Local-mutation storage** — ✅ **page-local `useState`, no context provider anywhere.** The
   report list lives in `problem-map-canvas`; every toggle (`hasBacked`, invite, interest) lives in
   its own island. Nothing survives a refresh, and nothing needs to this phase.
6. **Honest mock interactions** — ✅ resolved as **honest**. "Back this project" flips the trigger to
   "Backed ✓" and the funding bar does **not** move; the `/new` wizard shows a confirmation and
   appends nothing to the featured rail. Only the problem-map report list actually grows.
7. **Relationship to `/studio/pitches` + `/studio/funding`** — ⚠️ still open: the R&D `/funding`
   deal-flow view is standalone; both studio routes remain untouched `h1` stubs and nothing
   cross-links them. Revisit when the studio surfaces get real content.
8. **Sidebar sub-links** — ✅ five items under the **Research and Development** section: Problem Map
   (`flag`), Knowledge Hub (`school`), Talent (`group`), Funding (`paid`), PROJECT IMMORTAL
   (`selfImprovement`). `/new` is navbar-only ("Post an Idea"), not in the sidebar.
9. **Project Immortal** — ✅ lives under `/research-and-development/projects/project-immortal`; the
   old top-level path is a `redirect()` shim, and it is **not** folded into
   `MOCK_RESEARCH_PROJECTS` (it is a research _program_, a different entity — backend §10).
10. **Placeholder imagery** — ✅ dedicated R&D art for the hero, all 6 project covers and all 6 map
    pins; daily-log thumbs and avatars still use the generic dummy sets (§17).
11. **Breadcrumb parent label** — ✅ `"R&D"` (short form), per `navbar.tsx`'s `getSubHeader`.

---

## 16. File inventory

### Routes — `src/app/(home)/research-and-development/`

Ten `page.tsx` + ten `loading.tsx`. The three `[id]` routes each export `generateStaticParams` over
`MOCK_RESEARCH_PROJECTS` and an async `generateMetadata`; the seven static routes export a plain
`metadata` object.

```text
page.tsx                              landing
new/page.tsx                          idea wizard
project/[id]/page.tsx                 detail (5 tabs)            ← generateStaticParams
project/[id]/workshop/page.tsx        workshop (3 tabs)          ← generateStaticParams
project/[id]/proof-of-effort/page.tsx proof of effort (5 tabs)   ← generateStaticParams
problem-map/page.tsx · knowledge-hub/page.tsx · talent/page.tsx · funding/page.tsx
projects/project-immortal/page.tsx
```

Plus `src/app/(home)/project-immortal/page.tsx` — a 6-line `redirect()` shim.

### Data

| File                                                          | Contents                                   |
| ------------------------------------------------------------- | ------------------------------------------ |
| `src/types/research-and-development/*.ts`                     | 6 files, 67 types (§10)                    |
| `src/types/research-and-development.ts`                       | re-export composer — do not delete         |
| `src/mocks/research-and-development-mocks.ts`                 | projects + derived open roles + re-exports |
| `src/mocks/research-and-development-proof-of-effort-mocks.ts` | slice ledgers                              |
| `src/mocks/research-and-development-workshop-mocks.ts`        | workshops                                  |
| `src/mocks/project-immortal-mocks.ts`                         | program composer                           |
| `src/mocks/research-and-development/**`                       | 34 leaf files (§10)                        |

### Components — `src/components/home/research-and-development/`

81 files. Server components unless marked 🏝️ (client island — 21 of them; keep them small per
`CLAUDE.md`).

```text
(root — page bodies)
├── research-and-development-page.tsx  landing composition
├── project-detail.tsx                 header + stats + 5-tab shell
├── workshop-page.tsx                  3-tab shell (boards/files/chat)
├── proof-of-effort-page.tsx           5-tab shell (§5b)
├── problem-map-page.tsx               thin shell over the canvas island
├── knowledge-hub-page.tsx             insight grid + leaderboard + trends
├── talent-page.tsx                    filters + profile grid + open-roles rail
├── funding-page.tsx                   derives FundingDeal views from open rounds
├── project-immortal-page.tsx          moonshot program composition (§4b)
└── loading-skeleton.tsx               shared placeholder for the ten loading.tsx files
rails/
├── projects-rail.tsx · open-roles-rail.tsx · market-insights-rail.tsx
cards/
├── project-card.tsx · open-role-card.tsx · market-insight-card.tsx
├── team-member-card.tsx · problem-report-card.tsx · daily-log-card.tsx
├── talent-profile-card.tsx · funding-deal-card.tsx · compensation-badges.tsx
├── member-slice-breakdown-card.tsx · claim-verification-card.tsx
├── physical-work-receipt-card.tsx
└── dispute-window-entry-card.tsx           🏝️
sections/
├── section-header.tsx                      title + see-all chevron
├── pipeline-hero.tsx · pipeline-stages-strip.tsx · lifecycle-roles-strip.tsx
├── problem-map-preview.tsx · project-immortal-banner.tsx
├── project-header.tsx
├── request-to-join-button.tsx              🏝️
├── project-tabs.tsx                        🏝️  tab state only; panels arrive as ReactNode props
├── overview-tab.tsx · milestone-timeline.tsx
├── daily-logs-tab.tsx
├── daily-logs-feed.tsx                     🏝️  member filter chips
├── team-tab.tsx · funding-tab.tsx · governance-tab.tsx   ← governance is §5.5's rewrite target
├── problem-map-canvas.tsx                  🏝️  pins, selection, category filter, report list state
├── problem-report-list.tsx                     renders only inside that island; no directive
├── trending-demand-signals.tsx
├── talent-filter-grid.tsx                  🏝️  · invite-talent-button.tsx 🏝️
├── funding-deal-filter-grid.tsx            🏝️
├── workshop-tabs.tsx                       🏝️  · workshop-board.tsx · workshop-files.tsx · workshop-chat.tsx
├── proof-of-effort-tabs.tsx                🏝️
├── slice-ledger-tab.tsx · verification-pipeline-tab.tsx · dispute-window-tab.tsx
├── optimization-tab.tsx · project-audit-trail-tab.tsx
├── project-immortal-hero.tsx · project-immortal-products.tsx
├── project-immortal-papers.tsx             🏝️  · project-immortal-informal-posts.tsx 🏝️
├── project-immortal-contributors.tsx       🏝️  · project-immortal-discussion.tsx 🏝️
├── idea-item.tsx                           🏝️  · idea-reply-item.tsx
├── research-branch-map.tsx                 🏝️  hand-rolled svg flowchart
├── research-branch-map.constants.ts · research-branch-map.geometry.ts
└── research-branch-detail-panel.tsx
sheets/                                     🏝️  each self-contained: own trigger + sheet
├── post-idea-sheet.tsx (unwired) · report-problem-sheet.tsx
├── back-project-sheet.tsx · apply-role-sheet.tsx
└── sheet-shared.ts                         shared field options
wizard/                                     🏝️  new-idea-wizard-page.tsx holds the only "use client"
├── new-idea-wizard-page.tsx                step index + draft-patch + stepper
├── wizard-shared.ts                        NewIdeaDraft type + field options
├── idea-basics-step.tsx · problem-and-market-step.tsx
└── roles-needed-step.tsx · review-and-submit-step.tsx
```

### Layout

| File                                                                      | State                                                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [sidebar.tsx](src/components/home/layout/sidebar.tsx)                     | ✅ 6 `ROUTES` keys, top-level R&D entry (+ `COLLAPSED_NAV_CONFIG`), 5-item R&D section      |
| [navbar.tsx](src/components/home/layout/navbar.tsx)                       | ✅ `RESEARCH_AND_DEVELOPMENT_SUBPAGES` (5) + `prettifySlug` fallthrough, parent label "R&D" |
| [mobile-bottom-nav.tsx](src/components/home/layout/mobile-bottom-nav.tsx) | ✅ single R&D tab, sub-path matching                                                        |

---

## 17. Assets

Dedicated R&D art in repo, all under `public/dummy/`:

| Purpose                        | Used by                         | File(s)                                                                        |
| ------------------------------ | ------------------------------- | ------------------------------------------------------------------------------ |
| Pipeline hero background       | `pipeline-hero.tsx` (§4.1)      | `rnd_hero_bg_01.avif`                                                          |
| The six project covers         | `MOCK_RESEARCH_PROJECTS[0..5]`  | `rnd_project_cover_01..06.avif`                                                |
| World map canvas               | `problem-map-canvas.tsx` (§6)   | `world_map.svg`                                                                |
| Problem-map pin category icons | `PIN_ICON_SRC_BY_CATEGORY` (§6) | `icons/rnd_pin_{water,agriculture,health,energy,infrastructure,education}.svg` |

Pin icon mapping: Water & Sanitation → water · Precision Agriculture → agriculture · Healthcare and
Medical Logistics → health · Cold Chain → energy · Housing, E-Waste & Recycling and the fallback →
infrastructure. `rnd_pin_education.svg` is committed but reserved — no current mock category maps to
it. Extend the record if new categories are added.

> All 6 pin SVGs shipped at a 240×240 fixed canvas with no `viewBox` (unresizable without clipping)
> and ~8-decimal path precision (39–178 KB each) — oversized for a ~12–20px pin. Fixed in place:
> `viewBox="0 0 240 240"` added, `width`/`height` shrunk to 32, coordinates rounded to 2 decimals.
> 23–33% smaller with no visible difference at pin scale, and the pins scale instead of clipping.

Still generic dummies, and adequate as such — the mocks reference `thumbnail_image01..12.avif` for
daily-log video thumbnails and `profile_image_01..12.avif` + `profile_photo_girl.avif` for every
avatar. The Project Immortal banner uses a `diamond` icon glyph over a gradient, not a photograph, so
no banner image is needed.

If dedicated art is wanted later, save under `public/dummy/` as `rnd_<purpose>_NN.avif` (zero-padded
2-digit index) — it keeps R&D art `grep`-able and separate from the store/anime dummy sets. The
candidates: daily-log video thumbnails (8–12, in-progress build shots) and optional knowledge-hub
insight accents (6–8, illustrative, not charts).
