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

> **Phase note: integration has started, and it is running surface by surface.** There is no longer
> one global phase — **seven of the fourteen routes read the Express backend today** and the rest are
> still static mocks. §18 is the phase order; §19 is the per-file transport map.
>
> | Phase                                                                                                                   | State                                    |
> | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
> | **0 · foundations** — `src/lib/rnd/`, `src/lib/server-http.ts`, `QueryProvider` in `(home)`                             | ✅ done                                  |
> | **1 · public discovery reads** — landing, knowledge-hub, problem-map, talent, team-building, go-to-market, funding      | ✅ done                                  |
> | **2 · projects & detail** · **3 · workshop & daily logs** · **4 · proof of effort** · **5 · compensation & governance** | ⏳ still mock                            |
> | **6 · Project Immortal**                                                                                                | 🚫 **blocked** — no backend exists (§18) |
>
> **The `TRANSPORT:` banner on line 1 of every component is the authority**, not this doc. Four
> values, a closed set: `server-fetch` · `client-query` · `props-only` · `mock`. So
> `grep -rn "TRANSPORT: mock" src/components/home/research-and-development/` is the live list of
> what is still fabricated, and it cannot drift the way a hand-maintained table does.
>
> §11–§14 were written as a spec for this work. They are now **partly a changelog**: each section
> says which of its rows landed and which are still owed.

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

Everything marked ✅ is built — those rows are an inventory, not a plan. **The four stage routes of
§4c are now built too**; what remains ⏳ is §11–§14, the integration phase.

| Piece                    | Location                                                                                          | State                                                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes                   | [src/app/(home)/research-and-development/](<src/app/(home)/research-and-development/>)            | ✅ **14 page routes** built, each with a sibling `loading.tsx` — the ten originals plus the four stage routes (§4c). No `layout.tsx` / `error.tsx` in the subtree                                                                                          |
| Components               | [src/components/home/research-and-development/](src/components/home/research-and-development/)    | ✅ **121 files** — 14 page bodies, 15 cards, 3 rails, 75 sections, 8 sheets, 6 wizard. **35 client islands** — five stopped being islands in phase 1 when their filtering moved to the URL (§19)                                                           |
| Types                    | [src/types/research-and-development/](src/types/research-and-development/)                        | ✅ 8 files — **the shapes for surfaces still on mocks**. Wired surfaces take their types from `z.infer` over the response schemas in `src/lib/rnd/*.schemas.ts`, so this tree shrinks each phase (§10)                                                     |
| Types re-export composer | [src/types/research-and-development.ts](src/types/research-and-development.ts)                    | ✅ kept deliberately — ~55 importers use the flat specifier and must keep working                                                                                                                                                                          |
| Mocks                    | [src/mocks/research-and-development/](src/mocks/research-and-development/)                        | ◐ **41 leaf files** behind 5 composers — phase 1 deleted seven (§1.6 of the plan: insights, problem reports, trending signals, talent, suppliers + launch readiness, investor confidence, and the stage-label map, which moved to `src/lib/rnd/labels.ts`) |
| Proof-of-Effort surface  | [proof-of-effort-page.tsx](src/components/home/research-and-development/proof-of-effort-page.tsx) | ✅ **its own route with 6 tabs** (§5b) — Integrations joined the original five                                                                                                                                                                             |
| Project Immortal         | [page.tsx](<src/app/(home)/research-and-development/projects/project-immortal/page.tsx>)          | ✅ see §4b; the old `/project-immortal` route is a 6-line `redirect()` shim                                                                                                                                                                                |
| Sidebar nav              | [sidebar.tsx](src/components/home/layout/sidebar.tsx)                                             | ✅ top-level "R&D" (`science`) + a 5-item **Research and Development** section (§15 Q8)                                                                                                                                                                    |
| Mobile bottom nav        | [mobile-bottom-nav.tsx:36](src/components/home/layout/mobile-bottom-nav.tsx#L36)                  | ✅ single R&D tab; sub-path matching works, no sub-links                                                                                                                                                                                                   |
| Navbar breadcrumb        | [navbar.tsx](src/components/home/layout/navbar.tsx)                                               | ✅ `RESEARCH_AND_DEVELOPMENT_SUBPAGES` (9 entries — 5 originals + the 4 stage routes) + a `prettifySlug` fallthrough. The stage entries are explicit because the fallthrough renders "Build log", not "Build & Daily Logs"                                 |
| Network layer            | [src/lib/rnd/](src/lib/rnd/) + [src/lib/server-http.ts](src/lib/server-http.ts)                   | ✅ **built** (§18 phase 0) — five schema/api module pairs plus `format`, `discovery-format`, `map-projection`, `filter-href`, `view-state`, `labels`. `QueryProvider` now mounted in `(home)/layout.tsx`                                                   |
| Transport labelling      | every component's first line                                                                      | ✅ **121/121 labelled** over a closed 4-value set (§19): 7 `server-fetch`, 7 `mock`, the rest `props-only`. No `client-query` yet — phase 3 is the first surface that needs one                                                                            |

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

| #   | Pillar                                               | Carried by                                                                                                               |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Market-demand research & feasibility                 | `/knowledge-hub` + demand chips on project Overview                                                                      |
| 2   | Problem Mapping / "Civic Pulse"                      | `/problem-map`                                                                                                           |
| 3   | Knowledge Hub (market intelligence)                  | `/knowledge-hub`                                                                                                         |
| 4   | Talent matching / Virtual Workshop                   | ✅ `/team-building` (§4c) · `/talent`, open-roles rail, Team tab, `/project/[id]/workshop`                               |
| 5   | Funding (crowd / VC, transparency)                   | ✅ `/governance` (§4c) · Funding tab + `/funding` deal flow. **Records of intent only** — a pledge is a commitment       |
| 6   | Daily Update Protocol (AI logs, Proof of Effort)     | ✅ `/build-log` (§4c) · Daily Logs tab + the whole `/project/[id]/proof-of-effort` route (§5b)                           |
| 7   | Financial governance (compensation, anti-corruption) | ✅ `/governance` (§4c) · Compensation & governance tab (§5.5) — a **month-end statement**, not an escrow ledger          |
| 8   | Go-to-market (suppliers, ODM, shipping, storefront)  | ✅ `/go-to-market` (§4c) — the stage page, whose primary CTA is **`/studio/products`**, where a store listing is created |

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
  COMP --> GTM[Go-to-market<br/>/go-to-market]
  GTM --> LIST[/studio/products<br/>create a store listing]
  LIST --> STORE[/store<br/>live B2B storefront]
```

Each of the six stage cards on the landing strip (§4.2) lands on a **page that explains its
stage** — all six are built (§4c).

---

## 3. Route map

Fourteen page routes built, each with a `loading.tsx`.

`🔌` reads the backend · `🧪` still static mock · `🚫` blocked, no backend exists.

```text
🔌 /research-and-development                             pipeline hub landing
🧪 /research-and-development/new                         4-step idea wizard              — phase 2
🧪 /research-and-development/project/[id]                project detail (5 tabs)         — phase 2
🧪 /research-and-development/project/[id]/workshop       Virtual Workshop                — phase 3
🧪 /research-and-development/project/[id]/proof-of-effort Slicing Pie ledger (6 tabs)    — phase 4, §5b
🔌 /research-and-development/problem-map                 Civic Pulse map                 — stage 02
🔌 /research-and-development/knowledge-hub               market intelligence             — stage 01
🔌 /research-and-development/talent                      people trading skills for equity
🔌 /research-and-development/funding                     investor deal-flow view
🚫 /research-and-development/projects/project-immortal   moonshot research program — §4b, §18
✅ /project-immortal                                     redirect() shim, pre-move links
🔌 /research-and-development/team-building               equity-for-skills entry         — stage 03, §4c.1
🧪 /research-and-development/build-log                   cross-project daily-log feed    — stage 04, phase 3
🧪 /research-and-development/governance                  commitments + statements        — stage 05, phase 5
🔌 /research-and-development/go-to-market                suppliers → store listing       — stage 06, §4c.4
```

**Every wired route reads `searchParams` and is therefore dynamic** (`◐` in the build output), because
its filters are query params the backend applies in SQL. The three still-mock static routes remain
`○` prerendered. That split is visible in `pnpm build` and is the cheapest check that a route is
actually wired.

Route decisions baked in:

- **A stage card lands on a page, never an anchor.** Stages 03/04/05 pointed at `#open-roles` and
  `#featured-projects` — 04 and 05 shared one target — so three of the six cards scrolled the
  landing page instead of teaching the stage. A visitor who has not picked a project yet could not
  reach team building, daily logs or governance at all, because those exist only as tabs _inside_ a
  project. §4c gives each stage a cross-project page. (§15 Q12.)
- **The four stage routes sit beside `/talent` and `/funding`, they do not replace them.**
  `/talent` is people-first browse — profiles, skills, availability; `/team-building` is role-first —
  every open role across every project, plus the equity-for-skills explainer. `/funding` is investor
  deal flow — rounds to back; `/governance` is public accountability — commitments, month-end
  statements, dispute and audit mechanics. Each stage page links to its neighbour rather than
  duplicating it.
- **A stage page is cross-project; the per-project tab stays.** `/build-log` renders every project's
  logs, the Daily Logs tab renders one project's. Neither is deleted, and no panel is shared between
  them beyond the cards (`daily-log-card.tsx`, `open-role-card.tsx`, `project-card.tsx`).
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
| 4.2  | **Pipeline stages strip** (`pipeline-stages-strip`)     | 6 stage cards condensing the 8 pillars, each linking to its stage page (table below)                                                                                                                     | inline `PIPELINE_STAGES`                     |
| 4.2b | **Lifecycle roles strip** (`lifecycle-roles-strip`)     | The five ways to contribute — Researcher, Founder & Director, Venture Capitalist, Supplier, Supporter — with the compensation modes each supports. Stages are _what_ gets built; this is _who_ builds it | inline `LIFECYCLE_ROLES`                     |
| 4.3  | **Featured projects rail** (`projects-rail`)            | `ProjectCard`s: cover, name, tagline, stage badge, funding progress bar, team avatar stack, open-roles count → `/project/[id]`                                                                           | `MOCK_RESEARCH_PROJECTS` (6, all stages)     |
| 4.4  | **Problem map teaser** (`problem-map-preview`)          | Split: stylized map thumbnail with pins; "Top reported gaps" list (location, category, report count, opportunity score). CTA → `/problem-map`                                                            | top slice of `MOCK_PROBLEM_REPORTS`          |
| 4.5  | **Market insights rail** (`market-insights-rail`)       | `MarketInsightCard`s: headline stat, trend arrow, region + category chips. CTA → `/knowledge-hub`                                                                                                        | `MOCK_MARKET_INSIGHTS`                       |
| 4.6  | **Open roles rail** (`open-roles-rail`)                 | "Join a team for equity": role title, project name, skill chips, equity range, commitment tag, **Express interest** (client toggle → "Interest sent")                                                    | `MOCK_OPEN_ROLES` (flatMapped from projects) |
| 4.7  | **Project Immortal banner** (`project-immortal-banner`) | Full-width featured card, teal-gradient moonshot styling → `/research-and-development/projects/project-immortal`                                                                                         | static copy + a `diamond` glyph              |
| 4.8  | **Bottom CTA band**                                     | "Have an idea the world needs? Post it." → `/new`                                                                                                                                                        | none                                         |

The six `href`s in `PIPELINE_STAGES` — every one of them now a route, none an anchor:

| #   | Stage                | Was                  | Now                                          |
| --- | -------------------- | -------------------- | -------------------------------------------- |
| 01  | Market Research      | `/knowledge-hub`     | unchanged                                    |
| 02  | Problem Mapping      | `/problem-map`       | unchanged                                    |
| 03  | Team Building        | `#open-roles`        | ✅ `/research-and-development/team-building` |
| 04  | Build & Daily Logs   | `#featured-projects` | ✅ `/research-and-development/build-log`     |
| 05  | Funding & Governance | `#featured-projects` | ✅ `/research-and-development/governance`    |
| 06  | Go-to-Market         | `/store`             | ✅ `/research-and-development/go-to-market`  |

Stage 05's blurb no longer mentions escrow — it reads commitments and month-end statements, because
**escrow left this surface**. The same rewrite landed on `pipeline-hero.tsx` ("fund every milestone
through transparent escrow") and on `lifecycle-roles-strip.tsx`'s Venture Capitalist blurb, which
were the two other places the retired mechanism was still described as live. Stage 06 keeps its
meaning and changes destination: `/store` is the consumer browse surface, not where a founder lists
a product.

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

## 4c. Stage routes — ✅ all four built

Four pages, one per pipeline stage that had no destination before (§4.2). **All four are on disk**,
composed as specced below; the tables are now an inventory of what each page renders, not a plan.
Everything the section owed the rest of the doc — navbar entries, the stage-strip hrefs, the escrow
copy rewrite — landed with them.

Three rules hold across all four, and they are what keep these pages from becoming a second copy of
the project detail tabs:

- **A stage page is cross-project.** It answers "what is this stage and who is in it right now",
  aggregating all six mock projects. The per-project tab answers "where is _this_ project in the
  stage". Both stay.
- **Reuse the cards, not the panels.** `project-card`, `open-role-card`, `daily-log-card` and
  `compensation-format.ts` are shared; tab panels (`team-tab`, `daily-logs-tab`, `governance-tab`)
  are not lifted or generalized.
- **Mock phase rules still apply** (`CLAUDE.md`): static mock data, no fetch, no Zod, page-local
  `useState` for any interaction, islands kept small. Server component by default; a `"use client"`
  island only where a filter or a toggle needs one.

Each route follows the existing static-route shape: a thin `page.tsx` exporting a plain `metadata`
object plus a sibling `loading.tsx` rendering the shared `loading-skeleton.tsx`.

### 4c.1 Team Building — `/research-and-development/team-building` (stage 03)

The role-first entry to equity for skills. `/talent` browses **people**; this browses **roles**.

| Section                       | Purpose / content                                                                                                                                   | Mock source                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `team-building-hero`          | "Trade your skills for a stake." Two CTAs: jump to the roles grid, and → `/talent` to be found instead                                              | static copy                                                |
| `equity-for-skills-explainer` | How a stake is earned, not granted: verified effort → slices → basis points. Links to `/project/[id]/proof-of-effort` and `PROOF_OF_EFFORT_SPEC.md` | static copy                                                |
| `open-roles-grid` 🏝️          | Every open role, not the 6-card landing rail. Filter chips by `commitment` and skill. Reuses `cards/open-role-card.tsx`; apply via §8.4             | `MOCK_OPEN_ROLES` (full set)                               |
| `teams-forming-rail`          | Projects actively recruiting. Reuses `cards/project-card.tsx`                                                                                       | `MOCK_RESEARCH_PROJECTS` where `stage === "team-building"` |
| `talent-spotlight-strip`      | A few profiles with a see-all → `/talent`. Reuses `cards/talent-profile-card.tsx`                                                                   | top slice of `MOCK_TALENT_PROFILES`                        |

> Equity is **computed, never asserted** (backend §0) — the same rule as §5.3. A role's equity range
> is an _offer_, and the explainer must not let it read as an allocated stake.
>
> Filter by **skill** does **not** inherit the `talent-filter-grid.tsx` substring bug (§12
> `discovery.ts`), where a "Water" chip matches "Water Polo": `open-roles-grid.tsx` builds its chips
> from the roles themselves and matches on equality. Slugs replace both at integration.

### 4c.2 Build & Daily Logs — `/research-and-development/build-log` (stage 04)

The Daily Update Protocol, every project at once.

| Section                    | Purpose / content                                                                                                                                      | Mock source                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `build-log-hero`           | "Effort becomes proof." What a daily log is, what the AI reads, what verification does and does not decide                                             | static copy                                                      |
| `log-legend`               | The four `AiSummaryChipKind`s (`blocker` / `progress` / `velocity` / `suggestion`) with their colors, plus the verified badge, spelled out once        | `AiSummaryChipKind`                                              |
| `global-daily-log-feed` 🏝️ | Every project's logs merged, date-grouped, each card gaining a **project chip**. Filter by project and by chip kind. Reuses `cards/daily-log-card.tsx` | `MOCK_RESEARCH_PROJECTS.flatMap((project) => project.dailyLogs)` |
| `log-streak-leaderboard`   | Projects ranked by `dailyLogStreakDays` — rank, project, streak, log count                                                                             | `MOCK_RESEARCH_PROJECTS`                                         |
| Bottom CTA                 | "See how a log becomes a slice" → a project's `/proof-of-effort`                                                                                       | none                                                             |

> `DailyLog` carries no `projectId` — it is nested under its project — so `build-log-page.tsx`
> attaches `{ projectId, projectName, projectStage }` while flatMapping into the new
> `ProjectAnnotatedDailyLog` type. No card fabricates a project. At integration the cross-project
> feed is **keyset-paginated** (§13) — a merged feed over a two-year-old project set is unbounded.
>
> `isEffortVerified` is a boolean this phase and becomes a **six-value enum** (§12), so `log-legend`
> states all six outcomes rather than presenting verification as a yes/no the enum would contradict.
> Cards still render today's single verified badge.
>
> **The feed is member-scoped, and the page says so.** `GET /daily-logs` is `requireAuth` with a
> `projectId IN (caller's memberships)` subquery; the public part is the streak leaderboard alone.
> With no session in this phase, `global-daily-log-feed.tsx` carries a **member / signed-out viewer
> switch** so the empty signed-out state is real rather than imagined. Like the §5.5 role switch, it
> is a mock-phase affordance and must not survive integration.

### 4c.3 Funding & Governance — `/research-and-development/governance` (stage 05)

Public accountability, cross-project. `/funding` is the investor's view (rounds to back); this is
everyone's view (what was committed, what is owed, how a disagreement is settled).

| Section                    | Purpose / content                                                                                                                                                                                            | Mock source                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `governance-hero`          | "Every rupee and every share, accounted for."                                                                                                                                                                | static copy                                                        |
| `governance-rules-band`    | The **three copy rules** from this doc's header, stated publicly: Qatoto holds no funds and charges nobody · a verification verdict never reduces cash · a statement is **gross only**                       | static copy                                                        |
| `commitments-overview`     | **Aggregates only**: per-project period counts by status, countersigned count, **committed** funding, confidence (or "not computed yet" when null). No person, no per-member amount                          | `MOCK_GOVERNANCE_SUMMARY.rows`                                     |
| `statement-walkthrough`    | One worked month-end statement, **read-only**: period header, a retainer line, an hourly line with its verified minutes, a signed equity delta, payment state. Formats via `sections/compensation-format.ts` | `SAMPLE_STATEMENT_WALKTHROUGH` (authored, not a real member's row) |
| `accountability-explainer` | The 24-hour dispute window, the **three-way** human review, and the audit-trail hash chain — each with a link to the per-project tab that operates it                                                        | static copy + `MOCK_PROJECT_OVERSIGHT` for the examples            |
| Bottom CTA                 | → `/funding` deal flow, and → a project's Governance tab (§5.5) to act                                                                                                                                       | none                                                               |

> **Read-only, deliberately.** Finalize, countersign, record-payment and confirm-receipt stay on the
> per-project tab (§5.5), which owns the mock role switch. A cross-project page has no single actor,
> so putting an actor-scoped action on it would mean a second role switch and two places to reason
> about who may finalize. Export stays there too.
>
> The three copy rules are load-bearing, not decoration — each has a statute behind it (backend
> §7A.6). No section on this page may imply a payment rail, a hold, a charge, or a fee. They render
> from `disclosureKeys`, which travel as **keys rather than server prose** so three native clients
> can each localize them.
>
> **No person appears on this page.** A statement line names someone and what they are owed, which
> is personal data and specially sensitive in several jurisdictions, so the rollup carries counts
> and totals only and the worked example is **authored sample data** with role labels
> ("Engineer · hourly") instead of members. Real lines stay on the per-project tab, behind
> membership.

### 4c.4 Go-to-Market — `/research-and-development/go-to-market` (stage 06)

The last stage and the bridge out of R&D into commerce. Its job is to end on **`/studio/products`**.

| Section                      | Purpose / content                                                                                                                                             | Mock source                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `go-to-market-hero`          | "From verified build to a live listing." Primary CTA → `/studio/products`                                                                                     | static copy                                               |
| `go-to-market-explainer`     | The four steps of the stage: supplier / ODM selection → manufacturing run → logistics and shipping → storefront listing                                       | static copy                                               |
| `launch-readiness-checklist` | Six derived items over `met` / `not_met` / `waived` — three states, never a fourth. Each carries an integer `observedCount`; the client composes the sentence | `MOCK_LAUNCH_READINESS_BY_PROJECT_ID`                     |
| `supplier-directory` 🏝️      | Manufacturing and ODM partners: name, region, capability chips, MOQ, lead time, verification state. Capability chips are multi-select and combine as **AND**  | `MOCK_SUPPLIER_PROFILES` + `MOCK_SUPPLIER_CAPABILITIES`   |
| `launch-ready-projects-rail` | Reuses `cards/project-card.tsx`                                                                                                                               | `MOCK_RESEARCH_PROJECTS` where `stage === "go-to-market"` |
| `create-listing-cta-band`    | Full-width: **"Create your store listing" → `/studio/products`** (the manager; `studio/products/create` is the form behind it). Secondary → `/store`          | none                                                      |

**Why `/studio/products` and not `/store`.** `/store` is the browse surface — it shows a buyer what
exists. `/studio/products` is where the founder of a launch-ready project actually creates and
manages the listing. The stage strip pointed at `/store`, which sent a founder ready to sell into a
shopping view. That is the one link change in this whole spec that fixes a wrong destination rather
than an absent one.

**New data this section added** — the only genuinely new mock in §4c:

| File                                              | Exports                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/mocks/research-and-development/suppliers.ts` | `MOCK_SUPPLIER_CAPABILITIES`, `MOCK_SUPPLIER_PROFILES`, `MOCK_LAUNCH_READINESS_BY_PROJECT_ID`                |
| `src/types/research-and-development/discovery.ts` | `SupplierProfile`, `SupplierCapability`, `LaunchReadinessItem`, `ProjectLaunchReadiness` + their enum unions |

The supplier shape is authored in **§11 wire format from the start** — `leadTimeDays`,
`minimumOrderQuantity`, snake_case enum values — like `compensation.ts` and `oversight.ts` were. It
has no legacy importers, so there is nothing to migrate later and §12 never has to touch it.

**There is deliberately no `…InCents` field on a supplier.** Currency derives from a project and a
supplier belongs to none, so a directory-level price would have to invent one — a quote belongs to an
engagement, priced in that project's currency. The backend has no price column here either.

### What §4c owed the rest of the doc, and settled

- ✅ Four `RESEARCH_AND_DEVELOPMENT_SUBPAGES` entries in `navbar.tsx` — the `prettifySlug`
  fallthrough would render "Build log" and "Go to market", which are not the stage names.
- ✅ **Sidebar stayed at five R&D items** (§15 Q13). The stage routes are reached from the strip and
  from each other; adding them would make a nine-item section that buries Problem Map and Talent.
- ✅ §1's route/component counts, §16's file inventory and §13's endpoint rows all updated.
- ✅ **The escrow copy sweep**, because building the stage pages surfaced copy that contradicts the
  header's non-negotiable rules. Rewritten: the stage-05 blurb, `pipeline-hero.tsx`,
  `lifecycle-roles-strip.tsx`'s Venture Capitalist blurb, `funding-page.tsx`'s "every pledge held in
  milestone-gated escrow" header, `milestone-timeline.tsx`'s chip ("Releases $X from escrow" →
  "Planned payout $X"), the `earnedAsLabel` strings on open roles that `apply-role-sheet` renders,
  and six daily-log / milestone sentences in the project fixtures. **Still on the §12 list, not
  rewritten:** the field names `escrowReleaseAmount` and `EscrowLedgerEntry`, and the
  `escrowLedger` fixture arrays — no built surface renders them, and both are typed migrations
  rather than copy.

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

✅ **Built.** `governance-tab.tsx` no longer renders an escrow ledger; it renders the **month-end
compensation statement** — the pipeline's headline output (backend §7A) — over
`MOCK_PROJECT_COMPENSATION_LEDGERS`. Composition: a `compensation-agreements-panel` 🏝️ (§14.3
propose/accept/decline), then a `compensation-statement-panel` 🏝️ carrying everything below, then
funding **commitments** and planned milestone payouts. All money is integer cents formatted by
`compensation-format.ts` (§11 wire format), not pre-rendered strings.

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
  endpoint that marks a line paid directly. The solar fixture carries a May pair — the original
  superseded, the correction finalized — so the UI for it is real, not hypothetical.

Two mock-phase affordances worth knowing about. There is no session this phase, so the statement
panel carries a **role switch** (founder / second admin / member) — finalize and countersign are
admin powers, confirming that a payment arrived is the member's alone, and without the switch half
the surface would be unreachable. And **export CSV / JSON** builds the file client-side from the raw
integers (cents, basis points, minutes), never the formatted labels, because a payroll provider
needs `198000`, not `"$1,980"`.

> Every figure here is a static mock today and entirely server-owned once integration starts. The
> frontend never computes or enforces any of it — and the three copy rules in the header note
> (no custody, no verdict-gated wages, gross only) each have a statute behind them.

---

## 5b. Proof of Effort — `/research-and-development/project/[id]/proof-of-effort`

The Slicing Pie ledger, and the most numerically dense surface in the app. Body in
`proof-of-effort-page.tsx` (server): resolves the project from `MOCK_RESEARCH_PROJECTS` and the
ledger from `MOCK_PROJECT_PROOF_OF_EFFORT_LEDGERS` and the oversight fixture from
`MOCK_PROJECT_OVERSIGHT`, `notFound()` on any miss, then hands **six** server-rendered panels to 🏝️
`proof-of-effort-tabs` as `ReactNode` props. Only client state is `activeSection`, over a
`ProofOfEffortSection` union with an exhaustive `switch`.

| #   | Section id     | Label        | Panel                        | Also carries                                                                              |
| --- | -------------- | ------------ | ---------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | `slice-ledger` | Slice Ledger | `slice-ledger-tab`           | `member-slice-breakdown-card`, `rate-lock-panel` 🏝️ (§14.4), `pie-bake-panel` 🏝️ (§14.6)  |
| 2   | `verification` | Verification | `verification-pipeline-tab`  | `claim-verification-card`, `physical-work-receipt-card`, `verification-override-panel` 🏝️ |
| 3   | `disputes`     | Disputes     | `dispute-window-tab`         | `dispute-window-entry-card` 🏝️, `dispute-case-card` 🏝️, `raise-dispute-sheet` 🏝️          |
| 4   | `integrations` | Integrations | `integration-consent-tab` 🏝️ | connect / scope / revoke (§14.2)                                                          |
| 5   | `optimization` | Optimization | `optimization-tab`           | —                                                                                         |
| 6   | `audit-trail`  | Audit Trail  | `project-audit-trail-tab`    | `chain-verification-panel` 🏝️ (§14.6)                                                     |

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

> **✅ `mapPosition` is gone, and the projection moved to the client.** It was a CSS offset into one
> specific SVG at one aspect ratio, so MapKit / MapLibre / Google Maps could not render it and both
> native clients were dead on arrival. The backend sends **lat/lng microdegrees** and
> [src/lib/rnd/map-projection.ts](src/lib/rnd/map-projection.ts) projects them.
>
> **A correction this doc had wrong.** The plan for this work assumed `world_map.svg` was plain
> equirectangular. It is **2000 × 857 — 2.33:1, not 2:1** — an equirectangular map with the poles
> cropped (Simplemaps cuts Antarctica). So the projection is linear in longitude across the full
> 360° but linear in latitude only across a **154.26° window**, whose two bounds are named constants
> in that file. They are **calibrated estimates from the aspect ratio, not exact**: the SVG carries no
> `viewBox` and declares no projection, so if a pin sits visibly off its country the fix is one visual
> pass against known coordinates, adjusting those two constants and nothing else.
>
> **✅ The sheet no longer adds a pin.** It used to fabricate `countryCode: ""`,
> `mapPosition: {50, 50}`, `reportCount: 1` and `opportunityScore: 40` client-side and drop the result
> on the map as though it were a clustered finding. All four are server-derived, a submission is not a
> report (`distinctReporterCount: 342` means 342 distinct **people**), and `POST` returns **`202`**
> because clustering is a job. The sheet confirms receipt and says the report is queued.
>
> ⏳ **Still owed:** the submit itself. `POST /discovery/problem-reports` needs
> `requireIdentifiedUser` and lat/lng from a place picker, neither of which exists on this surface.

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

| #   | Sheet                  | Trigger                                                           | Fields                                                                                  | On submit (mock)                                                |
| --- | ---------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 8.1 | `post-idea-sheet`      | **unwired** — kept as the compact-form donor for `/new`           | idea name, one-line pitch, category, problem it solves, roles needed (chips)            | confirmation state only                                         |
| 8.2 | `report-problem-sheet` | Problem-map header                                                | title, category (creatable combobox), location text, description                        | appends to `problem-map-canvas`'s local list                    |
| 8.3 | `back-project-sheet`   | Project header + Funding tab                                      | pledge preset / custom amount, **commitment** explainer copy (no charge, no funds held) | trigger flips to "Backed ✓"; the progress bar does **not** move |
| 8.4 | `apply-role-sheet`     | Open-role cards (landing 4.6 + Team tab + `/team-building` §4c.1) | short pitch, skills (chips), commitment select, equity expectation                      | button flips to "Interest sent"                                 |

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
| Raise a dispute → vote on a case                                                                  | Sheet + vote buttons, quorum bar moves | ✅ Real, client state only              |
| Ask for human review → maintainer decides                                                         | Three-way decision, written rationale  | ✅ Real, client state only              |
| Connect / scope / revoke an integration                                                           | Scope ticks, connect, revoke           | ✅ Real, client state only              |
| Finalize → countersign → record payment → confirm receipt                                         | Via the mock role switch (§5.5)        | ✅ Real, client state only              |
| Export a statement as CSV / JSON                                                                  | Client-side file of raw integers       | ✅ Real, actually downloads             |
| Propose and lock a rate · preview a pie bake                                                      | Form + checklist + frozen cap table    | ✅ Real, client state only              |
| Workshop: add/move a task, attach or link a file, send a message                                  | Local list mutations                   | ✅ Real, lost on refresh                |
| Edit a project · edit your talent profile · moderate a paper                                      | Sheet / queue → confirmation           | ✅ Real; nothing is saved               |
| AI chips, Proof of Effort, slice ledgers, compensation statements, confidence, opportunity scores | Static render                          | 👁️ Visual-only, backend-owned           |
| Landing → stage card → stage page → a project in that stage                                       | Six cards, six destinations (§4.2)     | ✅ Real — all six land on a page        |
| Launch-ready project → `/studio/products` → create a store listing                                | Cross-surface handoff out of R&D       | ✅ Real — link handoff (§4c.4)          |

```mermaid
flowchart LR
  L[Landing] -->|project card| D[Project detail]
  D -->|Team tab| J[Apply for role → Interest sent]
  D -->|Funding tab| B[Back project → Backed]
  D -->|Overview chips| W[Workshop] & P[Proof of Effort]
  L -->|teaser| M[Problem map] -->|sheet| R[Report added locally]
  L -->|hero CTA| I[/new wizard → confirmation]
  L -->|stage card| S[Stage page §4c] --> D
  S -->|go-to-market| SP[/studio/products → create listing]
```

---

## 10. Types & mocks — where they actually live

> **◐ Partly superseded by phase 1.** There are now **three** trees, not two. Wired surfaces take
> their types from `z.infer` over the response schemas in `src/lib/rnd/*.schemas.ts` — one source of
> truth per surface, no hand-maintained copy to drift. The two trees described below are what remains
> for the **unwired** surfaces, and both shrink each phase (§18). Seven mock leaves and the
> stage-label map are already gone.
>
> The fetch layer did **not** slot in on top without moving anything, and could not have: the wire
> shapes differ from the mock shapes deeply enough (§12) that reusing the mock types would have meant
> lying about what arrives. `"use cache"` is also wrong for these reads — they are per-visitor
> projections, so `src/lib/server-http.ts` sets `no-store`; caching one would serve one member's view
> to the next visitor.

Two trees, both split by domain. Neither has a fetch layer, a getter, or a `"use cache"` annotation —
that layer slots in on top at integration without moving anything.

**Types** — `src/types/research-and-development/`, 8 files / 113 exported types, all `export type`,
zero runtime exports:

| File                 | Covers                                                                                                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared.ts`          | cross-cutting unions: `ProjectStage`, `RoleCommitment`, `AiSummaryChip*`, `MilestoneStatus`, `FundingRound*`, `Escrow*`, `TrendDirection`                                                                                                                                                         |
| `project.ts`         | `ResearchProject`, `TeamMember`, `OpenRole`, `DailyLog`, `ProjectAnnotatedDailyLog` (§4c.2), `Milestone*`, `FundingRound`, `CompensationComponent`, `EscrowLedgerEntry`, `MapPosition`                                                                                                            |
| `discovery.ts`       | `ProblemReport`, `MarketInsight`, `TrendingSignal`, `TalentProfile`, `TalentAvailability`, plus the go-to-market family: `SupplierProfile`, `SupplierCapability`, `LaunchReadinessItem*` (§4c.4)                                                                                                  |
| `workshop.ts`        | `ProjectWorkshop`, `WorkshopBoardColumn`, `WorkshopTask*`, `WorkshopFile*`, `WorkshopChatMessage`                                                                                                                                                                                                 |
| `immortal.ts`        | 13 `Immortal*` types — branches, papers, posts, ideas, contributors, product opportunities, program stats                                                                                                                                                                                         |
| `proof-of-effort.ts` | 20 types — `MemberSliceBreakdown`, `VerificationStep*`, `ClaimVerificationRun`, `DisputeWindow*`, `PhysicalWorkReceipt*`, `OptimizationSuggestion*`, `ProjectAuditEntry`, `ProjectProofOfEffortLedger`                                                                                            |
| `compensation.ts`    | §5.5 / §7A — `CompensationAgreement` (union on `engagementKind`), `CompensationPeriod`, `CompensationPeriodLine` (union on `kind`), `CompensationPaymentRecord`, `ProjectCompensationLedger`; plus the §4c.3 rollup: `GovernanceSummary`, `GovernanceProjectRollupRow`, `GovernanceDisclosureKey` |
| `oversight.ts`       | §14.1/2/4/6 — `DisputeCase` + `DisputeVote`, `VerificationOverrideRequest`, `IntegrationConnection` + `IntegrationScope`, `RateLockProposal`, `PieBakeReadiness`, `ProjectChainVerification`                                                                                                      |

> **`compensation.ts`, `oversight.ts` and the §4c additions carry §11 wire-format values** — integer
> cents / basis points / minutes / days with the unit in the field name, snake_case enum values, ISO
> instants and date-only days, full 64-char hashes. They have no legacy importers, so there was
> nothing to migrate; §12 does not apply to them.

[src/types/research-and-development.ts](src/types/research-and-development.ts) is a **re-export
composer** (`export * from "./research-and-development/shared"`, …), kept so ~55 existing importers
of the flat specifier keep working. New code may import either.

**Mocks** — four top-level composers over a leaf tree:

| Composer                                                      | Exports                                                                                                                                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/mocks/research-and-development-mocks.ts`                 | `MOCK_RESEARCH_PROJECTS` (6) + `MOCK_OPEN_ROLES` (flatMapped from them); re-exports insights, problem reports, talent, trending signals, investor confidence, suppliers + launch readiness, `PROJECT_STAGE_LABELS` |
| `src/mocks/research-and-development-proof-of-effort-mocks.ts` | `MOCK_PROJECT_PROOF_OF_EFFORT_LEDGERS`; its header carries the Slicing Pie recipe the mocks were computed with                                                                                                     |
| `src/mocks/research-and-development-workshop-mocks.ts`        | `MOCK_PROJECT_WORKSHOPS`                                                                                                                                                                                           |
| `src/mocks/research-and-development-compensation-mocks.ts`    | `MOCK_PROJECT_COMPENSATION_LEDGERS` — agreements + monthly statements per project (§5.5); re-exports `MOCK_GOVERNANCE_SUMMARY` + `SAMPLE_STATEMENT_WALKTHROUGH` (§4c.3)                                            |
| `src/mocks/research-and-development-oversight-mocks.ts`       | `MOCK_PROJECT_OVERSIGHT` + `INTEGRATION_PROVIDER_LABELS` — disputes, overrides, integrations, rate locks, bake readiness, chain inputs (§14)                                                                       |
| `src/mocks/project-immortal-mocks.ts`                         | re-export-only composer for every `MOCK_IMMORTAL_*` + the four label maps                                                                                                                                          |

Leaf files under `src/mocks/research-and-development/` (48 on disk):

```text
investor-confidence.ts  market-insights.ts  problem-reports.ts
project-stage-labels.ts talent-profiles.ts  trending-signals.ts
suppliers.ts            §4c.4 — supplier/ODM directory + launch-readiness checklist
governance-summary.ts   §4c.3 — cross-project rollup + the authored sample statement
immortal/        branches · contributors · ideas · informal-posts · papers ·
                 paper-moderation · product-opportunities · program-stats · labels
projects/        one file per slug → <SLUG>_PROJECT
proof-of-effort/ one file per slug → <SLUG>_LEDGER
workshop/        one file per slug → <SLUG>_WORKSHOP
compensation/    one file per slug → <SLUG>_COMPENSATION
oversight/       one file per slug → <SLUG>_OVERSIGHT, plus integration-scopes.ts
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

> **✅ Adopted, for wired surfaces.** Rendering lives in
> [src/lib/rnd/format.ts](src/lib/rnd/format.ts) (money, basis points, minutes, bytes, score points,
> ISO dates and instants, open-ended ranges) and
> [src/lib/rnd/discovery-format.ts](src/lib/rnd/discovery-format.ts) (the knowledge-hub statistic,
> composed from `statKind` + `statValueMilli` + `statUnitKey`). Every helper is deterministic and
> locale-pinned so a server render and a client render cannot disagree — no `Date.now()`, no
> `new Date()`, no locale read. Unwired surfaces still carry display strings.

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

### Casing on the wire

Units are half the contract; **casing is the other half**, and it is four different rules depending
on what the string is. Full statement in `CLAUDE.md` § "Naming — wire casing"; the short form:

| Surface                          | Casing         | Example                                                |
| -------------------------------- | -------------- | ------------------------------------------------------ |
| Path segments & directories      | **kebab**      | `/research-and-development/go-to-market`               |
| Slugs (URL identities)           | **kebab**      | `solar-cold-storage` · `east-africa`                   |
| Query keys & JSON fields         | **camelCase**  | `?minOpportunityScorePoints=80`                        |
| Enum values (query **and** body) | **snake_case** | `?stage=team_building` · `{ "stage": "team_building" }` |

**No enum value appears in a path segment anywhere on this surface**, so the URLs are kebab-case
throughout — the visible `snake_case` is confined to query *values*, where it is the `pgEnum` label
being echoed. The same value returns in the response body, which is why kebab-ing only the query
string would put two spellings of one concept inside a single round trip.

The backend contract doc declared this first (§4d: "All enum values are `snake_case`, matching the
existing `product_category` precedent"). This records it on the frontend side so the two agree, and
so nobody "fixes" it back — `z.enum` compares byte-for-byte, and the backend's `.strict()` query
schemas answer **422** rather than ignoring a misspelled value.

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

> **◐ Partly done.** Landed in phase 0/1: **every wire-relevant kebab-case enum → `snake_case`**;
> `EscrowDirection`, `EscrowVerificationStatus` and `EscrowLedgerEntry` **deleted outright** along with
> the `escrowLedger` fixture arrays; the whole `discovery.ts` family re-derived from the response
> schemas (`mapPosition` gone, `reportCount` → `distinctReporterCount`, `category` → a `{ slug,
displayLabel, pinIconKey }` ref, `statValue` → three fields, skills → slug objects, hours →
> minutes).
>
> **Still owed**, and left deliberately untouched because their components are unwired:
> `project.ts` (phase 2), `workshop.ts` (phase 3), `proof-of-effort.ts` (phase 4), `immortal.ts`
> (blocked). `escrowReleaseAmount` → `plannedPayoutInCents` is a phase-2 rename. §18 also lists the
> phase-4/5 enum values still on the old convention.
>
> One row below is **wrong as written** — see §13 on the go-to-market types, which the doc claimed
> needed no migration and which disagreed with three shipped pgEnums.

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

| Frontend route                  | Endpoints                                                                                                                                                                                        | Backend        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `/research-and-development`     | `GET /research-projects` · `GET /discovery/problem-clusters` · `/market-insights` · `GET /open-roles`                                                                                            | ✅ shipped     |
| `/new`                          | `POST /research-projects` (creates a **draft** — an idea _is_ a project) · `POST …/publish` · `GET /research-categories`                                                                         | ✅ shipped     |
| `/project/[id]`                 | `GET /research-projects/:slug` · `/team` · `/milestones` · `/daily-logs` · `/funding-rounds` · `/investor-confidence` · `/compensation-periods`                                                  | ✅ shipped     |
| `/project/[id]/workshop`        | `…/workshop` · `/board` · `/columns` · `/tasks` · `/tasks/:id/move` · `/files` · `/chat` (keyset) · `/chat/read`                                                                                 | ✅ shipped     |
| `/project/[id]/proof-of-effort` | `…/proof-of-effort` · `/slice-ledger` · `/equity` · `/equity/snapshots` · `/effort-claims` · `/allocation-proposals` · `/disputes` · `/audit-trail` · `/verify` · `/integrations` · `/pie-bake`  | ✅ shipped     |
| `/problem-map`                  | `GET /discovery/problem-clusters[/:id]` · `POST /discovery/problem-reports` → **`202`**                                                                                                          | ✅ shipped     |
| `/knowledge-hub`                | `GET /discovery/market-insights` · `/demand-signals` · `/regions`                                                                                                                                | ✅ shipped     |
| `/talent`                       | `GET /discovery/talent` · `PUT /discovery/talent/me` · `POST …/invites`                                                                                                                          | ✅ shipped     |
| `/funding`                      | `GET /funding/deals` · `POST /funding-rounds/:id/pledges` (`{ amountInCents }`, nothing else) · `GET …/investor-confidence`                                                                      | ✅ shipped     |
| Governance tab (§5.5)           | `…/compensation-agreements` · `…/compensation-periods[/:id]` · `/finalize` · `/countersign` · `/supersede` · `…/payments[/:id]/confirm` · `/export` · `/verify`                                  | ✅ shipped     |
| `/projects/project-immortal`    | `/research-programs/*`                                                                                                                                                                           | ⏳ **pending** |
| `/team-building` (§4c.1)        | `GET /open-roles` (unfiltered) · `GET /research-projects?stage=team_building` · `GET /discovery/talent` · `GET /discovery/skills` for the chips                                                  | ✅ shipped     |
| `/build-log` (§4c.2)            | `GET /daily-logs` — root-mounted, **member-scoped**, keyset `(logDate, submittedAt, id)`, project-annotated · `GET /daily-logs/streak-leaderboard` (public)                                      | ✅ shipped     |
| `/governance` (§4c.3)           | `GET /governance/summary` — public aggregates + `disclosureKeys`, plus the caller's own open lines · `GET /funding/deals`. No `/finalize`, `/countersign`, `/payments` or `/export` here         | ✅ shipped     |
| `/go-to-market` (§4c.4)         | `GET /suppliers` (repeated `capability` = AND) · `/suppliers/:slug` · `/supplier-capabilities` · `/launch-ready-projects` · `…/launch-readiness` (member-only). Listing creation is the studio's | ✅ shipped     |

### ⚠️ Three places the backend contract doc is wrong about its own backend

Found by reading the route files rather than the doc, while wiring phase 1. Each would have shipped a
`422` — every backend query schema is `.strict()`, so an unrecognized param is an error, not an
ignored key.

| `R_AND_D_BACKEND_STRUCTURE.md` says                                          | The backend actually accepts                                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /research-projects?…&sort=` (§11a)                                      | **no `sort` at all** — `ListProjectsQuerySchema` is `.strict()` over `category, stage, page, limit` |
| `GET /discovery/problem-clusters?…&minOpportunityScore=` (§11b)              | **`minOpportunityScorePoints`** — renamed to carry its unit                                         |
| §4c.4: the go-to-market types "have no legacy importers, nothing to migrate" | **three of their enums disagreed with the shipped pgEnums** (below)                                 |

That third one is the one that would have bitten hardest, because the claim was that these shapes
needed no migration:

| Frontend type had                                            | Backend pgEnum has                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `SupplierVerificationState` — 3 values                       | **4** — `documents_pending` was missing                                        |
| `SupplierCapabilityKind` — 4 values                          | **8** — `assembly`, `tooling`, `packaging`, `design`, `sourcing` missing       |
| `SupplierContactPolicy` — `open` / `request_only` / `closed` | **`via_platform` / `direct_email` / `no_contact`** — entirely different values |
| `LaunchReadinessItem.observedCount: number`                  | **`number \| null`** — null when the underlying signal was never computed      |

The values now in [src/lib/rnd/suppliers.schemas.ts](src/lib/rnd/suppliers.schemas.ts) are the shipped
ones. **Read `src/db/schema.ts` and the service view interfaces, not the contract doc**, when adding a
schema — the doc is a design record and drifts.

Both gaps the earlier draft named are closed (backend §11h, §11i, Appendix B), and how they closed
constrains the frontend:

- **Cross-project daily logs shipped as the "my projects" feed.** `GET /daily-logs` is `requireAuth`
  and its WHERE clause is `projectId IN (caller's active memberships)`, derived in SQL — there is no
  `?projectIds=`, and sending one is a `422` rather than an ignored parameter. `?projectSlug=` only
  narrows the caller's own set; a slug they do not belong to yields an **empty page, not a 404**.
  A logged-out visitor gets `401` and the page renders explainer, legend and public leaderboard with
  an empty feed — never a fabricated one.
- **The supplier / ODM directory shipped as a new domain.** Read endpoints are public; the write
  side is platform `moderator` only, with no user-submission path and no `pending` state. Launch
  readiness is **derived, never stored**: six items, three states, an integer count each, and
  member-only per project.

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

## 14. Previously-missing screens — all six now built

> **Status after phase 1: still all mock, and still all owed.** None of these six screens was in
> phase 1's scope — they belong to phases 4 and 5 (§18) — so every action on them continues to mutate
> page-local state only. Nothing sends, polls, retries or takes an idempotency key, and none of them
> handles the `202`-then-poll shape the contract specifies. The two mock-phase affordances flagged at
> the end of this section (the statement panel's role switch, and `PaperModerationQueue` showing review
> buttons to everyone) are both still present and must not survive their phase.

Backend §14 listed six surfaces where the API existed and the UI did not. **All six are built as
mock UI.** Each row below says where it lives and what the integration phase still owes it. The
first two were never merely UX debt — they are compliance surfaces (backend §16).

1. **Dispute / vote / override UI** — ✅ `raise-dispute-sheet` 🏝️ (grounds + evidence),
   `dispute-case-card` 🏝️ (who raised it, why, every vote with its rationale, quorum progress,
   cast-your-vote), and `verification-override-panel` 🏝️ on the Verification tab, where a member's
   request for human review gets a maintainer decision in writing. The decision goes **three ways**
   on purpose — reverse the flag, uphold it, or reverse it against the member — because a review
   that can only agree with the person who asked is not a review. This is the GDPR Art. 22
   contestability path and the EU AI Act Art. 14 human-oversight control: _a backend that offers
   human intervention through an endpoint no screen calls does not, in practice, offer it._
2. **Integration consent screen** — ✅ `integration-consent-tab` 🏝️, the sixth Proof-of-Effort tab.
   Per provider: status, every scope with a plain-language **purpose note**, which scopes are
   granted, retention in days, what the connection contributes to a verification run, and connect /
   revoke. Scope catalogues live in `mocks/…/oversight/integration-scopes.ts`. Copy states plainly
   that Qatoto reads **metadata only** — never source, documents, or design contents.
3. **The whole §7A compensation surface** — ✅ see §5.5. Agreements, statements, finalize,
   countersign, payment attestation, member confirmation, supersede, CSV/JSON export.
4. **Rate lock** — ✅ `rate-lock-panel` 🏝️ inside the Slice Ledger tab: propose against a cited
   benchmark band, flag a proposal outside its band, review-and-lock, and a collapsed **history** of
   superseded rates. A locked rate is never editable, only superseded.
5. **Workshop writes** — ✅ all three panels became islands. Add a task, move it between columns,
   attach a file, link a hosted file, send a message. Movement uses explicit ← / → buttons rather
   than drag, so the board is operable by keyboard and announceable by a screen reader.
6. **Everything else** — ✅ `pie-bake-panel` 🏝️ (pre-bake checklist with `met`/`not_met`/`waived`,
   blocked action, full frozen cap-table preview), `chain-verification-panel` 🏝️ ("Verify chain" +
   per-entry inspector showing the exact canonical payload hashed), `edit-project-sheet` 🏝️ on the
   project header, `edit-talent-profile-sheet` 🏝️ on `/talent`, `paper-moderation-queue` 🏝️ on
   Project Immortal, and tiered / multi-currency pledging in `back-project-sheet` (per-currency tier
   ladders, authored not FX-converted).

What the integration phase still owes these screens: every action above mutates **page-local state
only**. None of them send, poll, retry, or take an idempotency key, and none of them handle the
`202`-then-poll shape the contract specifies for claim submit, receipt upload, dispute raise and
problem report. §13's client-side rules — keyset pagination, server-side filtering, never
fabricating a missing signal — apply to all of them unchanged.

Two deliberate mock-phase affordances that must **not** survive integration: the statement panel's
founder / second-admin / member **role switch** (there is no session yet, and without it half the
surface is unreachable), and `PaperModerationQueue` showing review buttons to everyone.

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
7. **Relationship to the studio surfaces** — ◐ **partly resolved.** `/studio/products` is now the
   named go-to-market destination: §4c.4's CTA band sends a launch-ready founder there to create a
   store listing, replacing the stage strip's `/store` link. `/studio/pitches` and `/studio/funding`
   stay open — both are untouched `h1` stubs, and the R&D `/funding` deal-flow view remains
   standalone. Revisit those two when they get real content.
8. **Sidebar sub-links** — ✅ five items under the **Research and Development** section: Problem Map
   (`flag`), Knowledge Hub (`school`), Talent (`group`), Funding (`paid`), PROJECT IMMORTAL
   (`selfImprovement`). `/new` is navbar-only ("Post an Idea"), not in the sidebar.
9. **Project Immortal** — ✅ lives under `/research-and-development/projects/project-immortal`; the
   old top-level path is a `redirect()` shim, and it is **not** folded into
   `MOCK_RESEARCH_PROJECTS` (it is a research _program_, a different entity — backend §10).
10. **Placeholder imagery** — ✅ dedicated R&D art for the hero, all 6 project covers and all 6 map
    pins; daily-log thumbs and avatars still use the generic dummy sets (§17).
11. **Breadcrumb parent label** — ✅ `"R&D"` (short form), per `navbar.tsx`'s `getSubHeader`.
12. **A stage card gets a route, never an anchor** — ✅ built (§4c). Three of the six cards pointed
    at `#open-roles` / `#featured-projects`, two of them at the _same_ anchor, so clicking a stage
    scrolled the page it was already on. Team building, daily logs and governance lived only as tabs
    inside a project, unreachable to anyone who had not picked one. Each stage now gets a
    cross-project page. The alternative — deep-linking a stage card into some arbitrary project's tab
    — was rejected: it picks a project for the visitor and teaches nothing about the stage.
13. **Sidebar stays at five R&D items** — ✅ decided with §4c and held. The four stage routes get navbar
    breadcrumb entries and are reached from the stages strip and from each other, not from the
    sidebar. Nine items would bury Problem Map, Knowledge Hub and Talent, and the strip is already
    the canonical stage entry point on the landing page.
14. **`/team-building` and `/governance` do not absorb `/talent` and `/funding`** — ✅ decided with
    §4c. Folding them in was considered and rejected: `/talent` is a people-first browse with its own
    profile-editing surface, and `/funding` is an investor deal-flow view. The stage pages are
    role-first and accountability-first respectively. Four routes, cross-linked, no redirect shims.

---

## 16. File inventory

### Routes — `src/app/(home)/research-and-development/`

Fourteen `page.tsx` + fourteen `loading.tsx`. The three `[id]` routes each export
`generateStaticParams` over `MOCK_RESEARCH_PROJECTS` and an async `generateMetadata`; the eleven
static routes export a plain `metadata` object.

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

The four §4c stage routes, all static (plain `metadata`, no `generateStaticParams`):

```text
team-building/page.tsx  build-log/page.tsx  governance/page.tsx  go-to-market/page.tsx
```

### Data

| File                                                          | Contents                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| `src/types/research-and-development/*.ts`                     | 8 files, 113 types (§10)                                  |
| `src/types/research-and-development.ts`                       | re-export composer — do not delete                        |
| `src/mocks/research-and-development-mocks.ts`                 | projects + derived open roles + re-exports                |
| `src/mocks/research-and-development-proof-of-effort-mocks.ts` | slice ledgers                                             |
| `src/mocks/research-and-development-workshop-mocks.ts`        | workshops                                                 |
| `src/mocks/research-and-development-compensation-mocks.ts`    | month-end statements (§5.5) + the §4c.3 governance rollup |
| `src/mocks/research-and-development-oversight-mocks.ts`       | disputes / consent / rates / bake (§14)                   |
| `src/mocks/project-immortal-mocks.ts`                         | program composer                                          |
| `src/mocks/research-and-development/**`                       | 48 leaf files (§10)                                       |

### Components — `src/components/home/research-and-development/`

119 files. Server components unless marked 🏝️ (client island — 40 of them; keep them small per
`CLAUDE.md`). The island count grew with §14 and again with §4c: every write surface and every
filter has to hold its own state, and none of them may reach for a context provider (§15 Q5).

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
├── loading-skeleton.tsx               shared placeholder for all fourteen loading.tsx files
├── team-building-page.tsx             stage 03 (§4c.1)
├── build-log-page.tsx                 stage 04 (§4c.2)
├── governance-page.tsx                stage 05 (§4c.3) — cross-project, not the per-project tab
└── go-to-market-page.tsx              stage 06 (§4c.4)
rails/
├── projects-rail.tsx · open-roles-rail.tsx · market-insights-rail.tsx
cards/
├── project-card.tsx · open-role-card.tsx · market-insight-card.tsx
├── team-member-card.tsx · problem-report-card.tsx · daily-log-card.tsx
├── talent-profile-card.tsx · funding-deal-card.tsx · compensation-badges.tsx
├── member-slice-breakdown-card.tsx · claim-verification-card.tsx
├── physical-work-receipt-card.tsx · supplier-card.tsx (§4c.4)
├── dispute-window-entry-card.tsx           🏝️
└── dispute-case-card.tsx                   🏝️  votes, quorum, resolution (§14.1)
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
├── team-tab.tsx · funding-tab.tsx
├── governance-tab.tsx                          §5.5 — month-end statement, not an escrow ledger
├── compensation-format.ts                      cents/basis-points/minutes → labels, timezone-free
├── compensation-agreements-panel.tsx       🏝️  propose / accept / decline (§14.3)
├── compensation-statement-panel.tsx        🏝️  periods, lines, payments, finalize, export
├── verification-override-panel.tsx         🏝️  human review of an automated verdict (§14.1)
├── integration-consent-tab.tsx             🏝️  connect / scope / revoke (§14.2)
├── rate-lock-panel.tsx                     🏝️  propose / review / lock / history (§14.4)
├── pie-bake-panel.tsx                      🏝️  checklist + frozen cap table (§14.6)
├── chain-verification-panel.tsx            🏝️  verify chain + hash-input inspector (§14.6)
├── paper-moderation-queue.tsx              🏝️  formal-track review queue (§14.6)
├── problem-map-canvas.tsx                  🏝️  pins, selection, category filter, report list state
├── problem-report-list.tsx                     renders only inside that island; no directive
├── trending-demand-signals.tsx
├── talent-filter-grid.tsx                  🏝️  · invite-talent-button.tsx 🏝️
├── funding-deal-filter-grid.tsx            🏝️
├── workshop-tabs.tsx                       🏝️
├── workshop-board.tsx 🏝️ · workshop-files.tsx 🏝️ · workshop-chat.tsx 🏝️   ← all three take writes (§14.5)
├── proof-of-effort-tabs.tsx                🏝️
├── slice-ledger-tab.tsx · verification-pipeline-tab.tsx · dispute-window-tab.tsx
├── optimization-tab.tsx · project-audit-trail-tab.tsx
├── project-immortal-hero.tsx · project-immortal-products.tsx
├── project-immortal-papers.tsx             🏝️  · project-immortal-informal-posts.tsx 🏝️
├── project-immortal-contributors.tsx       🏝️  · project-immortal-discussion.tsx 🏝️
├── idea-item.tsx                           🏝️  · idea-reply-item.tsx
├── research-branch-map.tsx                 🏝️  hand-rolled svg flowchart
├── research-branch-map.constants.ts · research-branch-map.geometry.ts
├── research-branch-detail-panel.tsx
│   §4c stage-page sections:
├── team-building-hero.tsx · equity-for-skills-explainer.tsx
├── open-roles-grid.tsx                     🏝️  commitment + skill filters (§4c.1)
├── teams-forming-rail.tsx · talent-spotlight-strip.tsx
├── build-log-hero.tsx · log-legend.tsx · log-streak-leaderboard.tsx
├── global-daily-log-feed.tsx               🏝️  project + chip-kind filters (§4c.2)
├── governance-hero.tsx · governance-rules-band.tsx · commitments-overview.tsx
├── statement-walkthrough.tsx · accountability-explainer.tsx   read-only (§4c.3)
├── go-to-market-hero.tsx · go-to-market-explainer.tsx
├── launch-readiness-checklist.tsx · supplier-directory.tsx 🏝️
└── launch-ready-projects-rail.tsx · create-listing-cta-band.tsx   (§4c.4)
sheets/                                     🏝️  each self-contained: own trigger + sheet
├── post-idea-sheet.tsx (unwired) · report-problem-sheet.tsx
├── back-project-sheet.tsx                  tiered + multi-currency commitments (§14.6)
├── apply-role-sheet.tsx · raise-dispute-sheet.tsx (§14.1)
├── edit-project-sheet.tsx (§14.6) · edit-talent-profile-sheet.tsx (§14.6)
└── sheet-shared.ts                         shared field options
wizard/                                     🏝️  new-idea-wizard-page.tsx holds the only "use client"
├── new-idea-wizard-page.tsx                step index + draft-patch + stepper
├── wizard-shared.ts                        NewIdeaDraft type + field options
├── idea-basics-step.tsx · problem-and-market-step.tsx
└── roles-needed-step.tsx · review-and-submit-step.tsx
```

### Layout

| File                                                                      | State                                                                                                                                                                       |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [sidebar.tsx](src/components/home/layout/sidebar.tsx)                     | ✅ 6 `ROUTES` keys, top-level R&D entry (+ `COLLAPSED_NAV_CONFIG`), 5-item R&D section — **stays at 5** (§15 Q13)                                                           |
| [navbar.tsx](src/components/home/layout/navbar.tsx)                       | ✅ `RESEARCH_AND_DEVELOPMENT_SUBPAGES` (9 — the 5 originals + Team Building, Build & Daily Logs, Governance, Go-to-Market) + `prettifySlug` fallthrough, parent label "R&D" |
| [mobile-bottom-nav.tsx](src/components/home/layout/mobile-bottom-nav.tsx) | ✅ single R&D tab, sub-path matching                                                                                                                                        |

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

---

## 18. Integration phases

Integration runs **surface by surface**, and a mock leaf is **deleted** when its route is wired rather
than kept as a fallback. That is deliberate: a silent fallback masks a broken endpoint, and it forces
every mock to be migrated to the wire format to stay type-compatible. What is left on disk is
therefore exactly what is still fabricated.

| Phase                             | Scope                                                                                                                                                                                                     | State          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **0 · foundations**               | `src/lib/rnd/` (schemas, api, formatters, view state, filter hrefs, map projection, labels) · `src/lib/server-http.ts` · `QueryProvider` in `(home)` · `snake_case` enum migration · `TRANSPORT:` banners | ✅ done        |
| **1 · public discovery reads**    | landing · `/knowledge-hub` · `/problem-map` · `/talent` · `/team-building` · `/go-to-market` · `/funding`                                                                                                 | ✅ done        |
| **2 · projects & detail**         | `/research-projects/slugs` for `generateStaticParams` · detail · team · milestones · funding rounds · investor confidence · `/new` wizard → `POST` + `/publish`                                           | ⏳ next        |
| **3 · workshop & daily logs**     | board / files / chat (keyset cursor) · per-project logs · `/build-log` (member-scoped, `401` signed out)                                                                                                  | ⏳             |
| **4 · proof of effort**           | slice ledger · verification · disputes · integrations · audit trail · rate lock · pie bake                                                                                                                | ⏳             |
| **5 · compensation & governance** | agreements · periods · finalize / countersign / payments / export · `/governance/summary`                                                                                                                 | ⏳             |
| **6 · Project Immortal**          | —                                                                                                                                                                                                         | 🚫 **blocked** |

**Phase 6 is blocked, not merely unscheduled.** `grep -rn "research-programs" src/` in the backend
returns **zero hits** — no route, no controller, no service, no migration, no table. It also needs the
platform `moderator` role, which does not exist either. Nothing about this surface can be wired until
that domain is built.

**Two of the remaining phases carry compliance weight**, and should be read that way when
prioritising: the dispute / override UI and the integration-consent screen (both phase 4) are the GDPR
Art. 22 contestability path and the EU AI Act Art. 14 human-oversight control. A backend that offers
human intervention through an endpoint no screen calls does not, in practice, offer it.

### What phase 1 deliberately left dark

Each of these is a consequence of deleting a mock while a neighbouring surface is still unwired. None
is a regression to fix now; each resolves when its phase lands.

| Surface                                   | What is dark                                                                                                                                                                                                                                                                                            | Resolves in           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Overview tab — demand-evidence chips      | A mock project's `relatedInsightIds` match no real insight id, so the section is length-guarded and hidden. Fabricating a match would be inventing evidence                                                                                                                                             | phase 2               |
| Overview tab — Civic Pulse origin link    | Same, for `originProblemReportId` against real cluster ids                                                                                                                                                                                                                                              | phase 2               |
| Team tab — open-role cards                | `OpenRoleCard` renders typed compensation integers; the mock roles carry pre-formatted strings, and there is no way back from `"$4k–6k/mo"` to the cents it was rendered from. `/open-roles` cannot substitute — its query schema has no `projectSlug` facet. The tab links to `/team-building` instead | phase 2 (`…/roles`)   |
| `/go-to-market` — readiness checklist     | `…/launch-readiness` is member-only and `404`s otherwise, and this page holds no slug. Renders the six derived gates as an explainer with no states or counts                                                                                                                                           | phase 2 (per-project) |
| `/talent` — pay-kind filter chips         | **Removed.** `/discovery/talent` accepts no such param; restoring the filter needs a backend column, not a chip                                                                                                                                                                                         | —                     |
| Supplier directory — region chips         | **Removed.** They were built from `regionSlug` values on the fetched page, which offers only the regions already visible. `?region=` is a real filter; the row returns when it reads `GET /discovery/regions`                                                                                           | —                     |
| Project card — funding bar + avatar stack | **Removed.** `GET /research-projects` returns counts, not rounds or member rows; either would be an N+1 per card                                                                                                                                                                                        | —                     |
| Deal card — investor-confidence meter     | **Removed.** `/funding/deals` carries no confidence, and `…/investor-confidence` `404`s when never computed. The old card defaulted it to `50`, publishing a fabricated finding                                                                                                                         | —                     |

### Phase-4/5 enum values still on the old convention

Phase 0 converted every wire-relevant kebab-case union to `snake_case` (§11 "Casing on the wire").
Left as-is on purpose: `proof-of-effort.ts` and `oversight.ts` still carry `"not-run"`,
`"flagged-for-review"`, `"artifact-grounding"`, `"exif-metadata"`, `"agreements-accepted"` and
friends. Their components are untouched and unwired, so converting them then would have been churn
with no consumer.

**They must land with phase 4/5**, converted to the spelling the backend already ships —
`not_run`, `flagged_for_review`, `artifact_grounding`, `exif_metadata`, `agreements_accepted`. Read
the values off `src/db/schema.ts` in the backend, not off a doc: this doc had three go-to-market
enums wrong (§13), and being wrong here means a silent `z.enum` parse failure rather than a compile
error.

**Do not convert the slugs in the same sweep.** Kebab-case that is correct and stays: region slugs
(`east-africa`), skill slugs, supplier capability slugs (`injection-molding`), and mock entity ids. A
slug is a URL identity and kebab by backend convention; an enum value is a `pgEnum` label and
snake_case. The two live side by side in these files, and the difference is what the string *is*,
not where it appears.

---

## 19. Transport map

`grep -rn "TRANSPORT:" src/components/home/research-and-development/` regenerates the ground truth.
**The banners are the source of truth and this table is the readable summary** — when they disagree,
the banner is right.

Four values, a closed set so a fifth kind cannot appear silently:

| Banner         | Meaning                                                                                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server-fetch` | Server component. Reads the API through `src/lib/rnd/*.api` with the session cookie forwarded by `callerRequestOptions()`. Adding `"use client"` breaks the build — `next/headers` does not resolve in a client bundle |
| `client-query` | `"use client"` island using React Query. Needs `QueryProvider`, mounted in `(home)/layout.tsx`. **None yet** — phase 3 is the first surface that needs one                                                             |
| `props-only`   | Fetches nothing; data arrives as props. Safe on either side of the boundary                                                                                                                                            |
| `mock`         | Not wired. Renders fabricated data                                                                                                                                                                                     |

### The seven `server-fetch` page bodies

| Body                                | Endpoints                                                                                                            | Notes                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `research-and-development-page.tsx` | `/research-projects` · `/discovery/problem-clusters?sort=opportunity` · `/discovery/market-insights` · `/open-roles` | 4 concurrent reads, one view state per rail — a dead endpoint dims one rail |
| `knowledge-hub-page.tsx`            | `/discovery/market-insights` · `/discovery/demand-signals`                                                           | Leaderboard renders `asOf`; empty means no scoring run, not zero demand     |
| `problem-map-page.tsx`              | `/discovery/problem-clusters` · `/research-categories?status=approved`                                               | Category chips are Links; canvas island holds selection only                |
| `talent-page.tsx`                   | `/discovery/talent` **(requireAuth)** · `/discovery/skills` · `/open-roles`                                          | Signed out → sign-in panel + empty grid                                     |
| `team-building-page.tsx`            | `/open-roles` · `/research-projects?stage=team_building` · `/discovery/skills` · `/discovery/talent`                 | Spotlight strip has its own signed-out branch                               |
| `go-to-market-page.tsx`             | `/suppliers` · `/supplier-capabilities` · `/launch-ready-projects`                                                   | Repeated `?capability=` is **AND**ed in SQL                                 |
| `funding-page.tsx`                  | `/funding/deals` **(requireAuth)**                                                                                   | Unpaginated on the wire — plain envelope, no `pagination` sibling           |

### Conventions every wired surface follows

- **Concurrent reads, independent view states.** `Promise.all` per page; each section maps its result
  through `toListViewState` and renders an exhaustive `switch` with a `never` default. A failed
  secondary read (a facet vocabulary) degrades via `rowsOrEmpty`; a failed primary read never
  collapses into "empty".
- **Never fabricate a `null`.** `opportunityScorePoints`, `verifiedEffortMinutes`,
  `projectsCompletedCount`, `observedCount`, `statsComputedAt` and investor confidence are all
  nullable, and null renders as an absence. Zero is a finding; null is the absence of one.
- **Filters live in the URL, and the backend applies them.** Chips are `<Link>`s built by
  `buildFilterHref`; unrecognized values are dropped by `readEnumParam` rather than forwarded, because
  a `.strict()` schema turns a hand-edited URL into a 422. Five islands stopped being islands as a
  result.
- **Money is a decimal string where the column is `bigint`.** Parse with `BigInt`, never `Number`;
  `formatMoneyFromCents` accepts both and falls back to an exact unlocalized label past 2^53 cents
  rather than letting `Intl` round someone's compensation.
- **404 is the not-authorized answer.** Never render a permission hint from one; it leaks which ids
  exist.
