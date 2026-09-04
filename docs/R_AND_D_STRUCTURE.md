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

> **Phase note: integration is finished except for Project Immortal.** Every route on this surface
> reads the Express backend, **every shipped write has a control on a page**, **every long list pages
> past its first screen**, and the five mock sheets that posted nowhere are gone or wired. §18 is the
> phase order; §19 is the per-file transport map.
>
> | Phase                                                                                                              | State                                    |
> | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
> | **0 · foundations** — `src/lib/rnd/`, `src/lib/server-http.ts`, `QueryProvider` in `(home)`                        | ✅ done                                  |
> | **1 · public discovery reads** — landing, knowledge-hub, problem-map, talent, team-building, go-to-market, funding | ✅ done                                  |
> | **2 · projects & detail** · **3 · workshop & daily logs**                                                          | ✅ done                                  |
> | **4 · proof of effort** — ledger, verification, disputes, integrations, audit chain, pie bake                      | ✅ done                                  |
> | **5 · compensation & governance** — agreements, statements, payments, `/governance/summary`                        | ✅ done                                  |
> | **K · keyset paging** — six lists made pageable; the rest of each ledger, feed and index is reachable              | ✅ done                                  |
> | **6 · Project Immortal**                                                                                           | 🚫 **blocked** — no backend exists (§18) |
>
> **The two compliance items are now built.** The dispute/override screen (GDPR Art. 22
> contestability) and the integration-consent screen (EU AI Act Art. 14 human oversight) were the
> two surfaces §18 flagged as legally weighted, and both were endpoints no screen called. They are
> screens now — see `dispute-window-tab.tsx`, `dispute-actions-island.tsx`,
> `claim-detail-disclosure.tsx` and `integration-consent-tab.tsx`.
>
> **The `TRANSPORT:` banner on line 1 of every component is the authority**, not this doc. Four
> values, a closed set: `server-fetch` · `client-query` · `props-only` · `mock`. So
> `grep -rn "TRANSPORT: mock" src/components/home/research-and-development/` is the live list of
> what is still fabricated — **exactly one file now**, `project-immortal-page.tsx` — and it cannot
> drift the way a hand-maintained table does.
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
| Components               | [src/components/home/research-and-development/](src/components/home/research-and-development/)    | ✅ **137 files** — 14 page bodies, 15 cards, 3 rails, sections, sheets, wizard. **34 client islands**; six arrived with keyset paging (§19), eight earlier ones stopped being islands (§19)                                                                |
| Types                    | [src/types/research-and-development/](src/types/research-and-development/)                        | ✅ 7 files — **the shapes for surfaces still on mocks**. Wired surfaces take their types from `z.infer` over the response schemas in `src/lib/rnd/*.schemas.ts`, so this tree shrinks each phase (§10)                                                     |
| Types re-export composer | [src/types/research-and-development.ts](src/types/research-and-development.ts)                    | ✅ kept deliberately — ~55 importers use the flat specifier and must keep working                                                                                                                                                                          |
| Mocks                    | [src/mocks/research-and-development/](src/mocks/research-and-development/)                        | ◐ **16 leaf files** behind 2 composers — phase 1 deleted seven (§1.6 of the plan: insights, problem reports, trending signals, talent, suppliers + launch readiness, investor confidence, and the stage-label map, which moved to `src/lib/rnd/labels.ts`) |
| Proof-of-Effort surface  | [proof-of-effort-page.tsx](src/components/home/research-and-development/proof-of-effort-page.tsx) | ✅ **its own route with 6 tabs** (§5b) — Integrations joined the original five                                                                                                                                                                             |
| Project Immortal         | [page.tsx](<src/app/(home)/research-and-development/projects/project-immortal/page.tsx>)          | ✅ see §4b; the old `/project-immortal` route is a 6-line `redirect()` shim                                                                                                                                                                                |
| Sidebar nav              | [sidebar.tsx](src/components/home/layout/sidebar.tsx)                                             | ✅ top-level "R&D" (`science`) + a 5-item **Research and Development** section (§15 Q8)                                                                                                                                                                    |
| Mobile bottom nav        | [mobile-bottom-nav.tsx:36](src/components/home/layout/mobile-bottom-nav.tsx#L36)                  | ✅ single R&D tab; sub-path matching works, no sub-links                                                                                                                                                                                                   |
| Navbar breadcrumb        | [navbar.tsx](src/components/home/layout/navbar.tsx)                                               | ✅ `RESEARCH_AND_DEVELOPMENT_SUBPAGES` (9 entries — 5 originals + the 4 stage routes) + a `prettifySlug` fallthrough. The stage entries are explicit because the fallthrough renders "Build log", not "Build & Daily Logs"                                 |
| Network layer            | [src/lib/rnd/](src/lib/rnd/) + [src/lib/server-http.ts](src/lib/server-http.ts)                   | ✅ **built** (§18 phase 0) — five schema/api module pairs plus `format`, `discovery-format`, `map-projection`, `filter-href`, `view-state`, `labels`. `QueryProvider` now mounted in `(home)/layout.tsx`                                                   |
| Transport labelling      | every component's first line                                                                      | ✅ **137/137 labelled** over a closed 4-value set (§19): 15 `server-fetch`, 34 `client-query`, 87 `props-only`, 1 `mock`. Recount with the grep in §19 rather than trusting this number                                                                    |

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
🔌 /research-and-development/problem-map                 Civic Pulse map                 — stage 01
🔌 /research-and-development/knowledge-hub               market intelligence             — stage 02
🔌 /research-and-development/talent                      people trading skills for equity
🔌 /research-and-development/funding                     investor deal-flow view
🚫 /research-and-development/projects/project-immortal   moonshot research program — §4b, §18
✅ /project-immortal                                     redirect() shim, pre-move links
🔌 /research-and-development/team-building               equity-for-skills entry         — stage 03, §4c.1
🧪 /research-and-development/build-log                   cross-project daily-log feed    — stage 04, phase 3
🧪 /research-and-development/governance                  commitments + statements        — stage 05, phase 5
🔌 /research-and-development/go-to-market                suppliers → store listing       — stage 06, §4c.4
🔌 /research-and-development/import-intelligence            country import volumes           — §20
🔌 /research-and-development/import-intelligence/[hsCode]   one commodity + its assessment   — §20
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
| 01  | Problem Mapping      | `/problem-map`       | unchanged                                    |
| 02  | Market Research      | `/knowledge-hub`     | unchanged                                    |
| 03  | Team Building        | `#open-roles`        | ✅ `/research-and-development/team-building` |
| 04  | Build & Daily Logs   | `#featured-projects` | ✅ `/research-and-development/build-log`     |
| 05  | Funding & Governance | `#featured-projects` | ✅ `/research-and-development/governance`    |
| 06  | Go-to-Market         | `/store`             | ✅ `/research-and-development/go-to-market`  |

**Problem Mapping is stage 01 and Market Research is stage 02**, which reverses the order these
two shipped in. The dependency runs problem → market and only that way: the knowledge hub's
demand leaderboard (`demand_signal_snapshot`) is a nightly `GROUP BY` over
`problem_cluster ⋈ problem_submission` computed by the backend's `recompute-demand-signals`
job, while nothing anywhere derives a problem score from market data. File no problem reports
and the leaderboard half of the knowledge hub renders empty. §2's mermaid already drew this
arrow correctly (`PM --> KH`) — it was this table and the strip that disagreed with it. Note
that the `project_stage` pgEnum keeps `market_research` before `problem_validation`: that enum
is a per-project lifecycle position whose declaration order implies no rank, not this pipeline.

Stage 05's blurb no longer mentions escrow — it reads commitments and month-end statements, because
**escrow left this surface**. The same rewrite landed on `pipeline-hero.tsx` ("fund every milestone
through transparent escrow") and on `lifecycle-roles-strip.tsx`'s Venture Capitalist blurb, which
were the two other places the retired mechanism was still described as live. Stage 06 keeps its
meaning and changes destination: `/store` is the consumer browse surface, not where a founder lists
a product.

---

## 4b. Research programmes — `/research-and-development/programs`

**A programme is not a project**, and this is now a generic, user-creatable surface rather than
one hardcoded page. Backend §10 argues the split at length: a `research_project` has one
founder, a closed team, a funding round and a Slicing Pie ledger over verified daily logs; a
`research_program` has thousands of open contributors, a branch tree, a public paper library and
contribution tracking that is **not equity at all**. They share the `user` table and the §4d
`compensation_kind` vocabulary, and nothing else.

Project Immortal is one row. Anybody with a full account can propose the next one.

| Route                           | What it is                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/programs`                     | Public index (published + archived), server-side search, plus a signed-in visitor's own submissions and — for a moderator — the review queue |
| `/programs/new`                 | The propose-a-programme wizard. Lands `pending`; the confirmation says so                                                                    |
| `/programs/[programSlug]`       | One programme, eight sections. `generateStaticParams` over `GET /research-programs/slugs`                                                    |
| `/projects/project-immortal`    | `redirect()` — the path the sidebar used before the move                                                                                     |
| `/project-immortal` (top level) | `redirect()` — the original path, pointing straight at the final URL, not through the hop above                                              |

Body in `research-program-page.tsx`; index in `research-programs-index-page.tsx`; wizard in
`wizard/new-program-wizard-page.tsx`. Types are inferred from
`src/lib/rnd/research-programs.schemas.ts` — `src/types/research-and-development/immortal.ts`
and `src/mocks/research-and-development/immortal/**` are **deleted**, per the §18 rule that a
mock leaf goes when its route is wired.

| Section                            | Content                                                                                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `research-program-hero`            | Teal-gradient identity matching the landing banner + four stat tiles from `GET …/stats`, each carrying the snapshot's `asOf`. **404 = "not counted yet"**, never four zeroes                             |
| `research-branch-map` 🏝️           | SVG flowchart of every branch. Positions are **COMPUTED** by `branch-tree-layout.ts` from `parentBranchId` + `siblingOrder`; there is no `canvasPosition` on the wire. Status-coded nodes, claim control |
| `research-program-products`        | Monetizable derivations. `estimatedMarketSizeInCents` (bigint) + `readinessMin/MaxMonths` replace the mock's two label strings, so the rail sorts                                                        |
| `research-program-papers` 🏝️       | **Formal** library + a REAL two-step upload (metadata row, then multipart PDF to Backblaze B2), category picker over the `research_paper_category` table, inline category proposal, presigned download   |
| `paper-moderation-queue` 🏝️        | Moderator only. Paper verdicts (note required on every path, including approval), open reports, and the decision log — this domain's view of the platform audit chain                                    |
| `research-program-discussion` 🏝️   | **ONE component for BOTH tracks**, because the backend serves both from one table. `informal_paper` requires a title; `idea` must not have one and can be filed against a branch                         |
| `research-post-item` 🏝️            | One post with its replies, reactions (`PUT`/`DELETE`, idempotent by verb), report control and moderation. The mock's like/reply buttons had `aria-label`s and **no `onClick` at all**                    |
| `research-program-contributors` 🏝️ | Roster, role filter applied **in SQL** via a link per chip, join/edit form. The mock's `effortLabel` is split into `totalEffortMinutes` and `fundingTrancheIndex`/`Total`                                |
| `program-contributor-tools` 🏝️     | Log effort, record a contribution. Both self-reported, both idempotency-keyed, neither mints anything                                                                                                    |
| `program-owner-tools` 🏝️           | Creator-or-staff: edit the programme (no `slug`, no `status`), add or remove a product opportunity                                                                                                       |

**Three things the wire refuses to carry**, each because the mock got it wrong:

- **The branch map's two signals.** `status` and `overlappingGroupCount` are derived nightly by
  `recompute-branch-signals` and appear in no request body. A contributor able to mark their own
  branch `active`, or a rival's `missing`, would make the map worthless.
- **Money on the hero.** The mock's fourth tile read "$4.2M compensation pool escrowed". Escrow
  left the backend (§7 — nine routes 404) and no programme-scoped money rail exists, so the tile
  is **hours logged**.
- **Layout.** See `research-branch-map` above.

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
  `compensation-format.ts` are shared; tab panels (`team-tab`, `daily-logs-tab`) are not lifted or
  generalized.
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

| File                                                                    | Banner         |
| ----------------------------------------------------------------------- | -------------- |
| `components/home/research-and-development/import-intelligence-page.tsx` | `server-fetch` |
| `components/home/research-and-development/commodity-detail-page.tsx`    | `server-fetch` |
| `sections/localization-leaderboard.tsx`                                 | `props-only`   |
| `sections/commodity-directory.tsx`                                      | `props-only`   |
| `sections/trade-flow-table.tsx`                                         | `props-only`   |
| `sections/substitute-list.tsx`                                          | `props-only`   |
| `sections/feasibility-score-panel.tsx`                                  | `props-only`   |
| `sections/localization-pathway-panel.tsx`                               | `props-only`   |
| `cards/commodity-card.tsx`                                              | `props-only`   |

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
- "Born from Civic Pulse" link chip when `originCluster` is set → `/problem-map`. The target is a
  **cluster**, not one citizen's report — the deduplicated public entity this tree calls
  `ProblemReport` — and it is addressed by id, because clusters carry no slug.
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

🗑️ **The per-project Governance tab was removed in phase 2, and the surface is owed again.** It was
bound to the mock project shape the detail page stopped reading, and its funding half still rendered
`escrowReleaseAmount` — a concept this contract retired, with nine backend routes now answering 404.
Leaving it mounted would have printed fabricated escrow figures beside four wired tabs.

🗑️ **`compensation-statement-panel.tsx` was DELETED**, and the paragraph that used to stand here —
"still on disk and still built, phase 5 remounts them" — was wrong about what phase 5 did. Phase 5
did not remount the mock panel; it shipped `compensation-period-island.tsx` and
`compensation-periods-island.tsx` against the real `…/compensation-periods` reads instead. The panel
was the pre-integration draft of exactly that surface: it imported the mock types from
`@/types/research-and-development`, every one of its four actions mutated `useState` and touched no
network, and its own copy said "every figure here is a static mock this phase". The island covers
finalize, countersign, supersede, the payment attestation and the member's confirmation, and exports
server-side through `buildCompensationExportPath` — in BOTH formats now, since the helper always took
`"csv" | "json"` and only CSV was ever offered.

🗑️ **`compensation-agreements-panel.tsx` was DELETED TOO**, for the same reason and on the same
evidence. It was mounted by nothing, both of its actions were `useState`, and — decisively — it was
typed against a shape the backend has never sent: its status enum was
`proposed|accepted|declined|superseded` where the wire is `proposed|active|superseded|withdrawn`,
and its engagement kinds were `retainer|hourly|equity_only` where the wire is
`employee|independent_contractor|unpaid_founder`. A panel that cannot parse a real response is a
draft, not an unfinished feature.

What replaced it is `compensation-tab.tsx` (which renders the agreements list off
`…/compensation-agreements`) mounting `compensation-agreement-island.tsx` (propose / accept /
decline / withdraw, role-gated, with real error and pending states). That does strictly more than
the panel ever did — the panel had no propose and no withdraw at all. Everything below describes what that tab must render when it returns; the
cross-project mechanics remain live at `/research-and-development/governance` (§4c.3) meanwhile.

All money is integer cents formatted by `compensation-format.ts` (§11 wire format), never
pre-rendered strings.

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
| 1   | `slice-ledger` | Slice Ledger | `slice-ledger-tab`           | `rate-lock-panel` 🏝️ (§14.4), `pie-bake-panel` 🏝️, `equity-snapshot-history-island` 🏝️    |
| 2   | `verification` | Verification | `verification-pipeline-tab`  | `claim-verification-card`, `physical-work-receipt-card`, `verification-override-panel` 🏝️ |
| 3   | `disputes`     | Disputes     | `dispute-window-tab`         | `dispute-window-entry-card` 🏝️, `dispute-case-card` 🏝️, `raise-dispute-sheet` 🏝️          |
| 4   | `integrations` | Integrations | `integration-consent-tab` 🏝️ | connect / scope / revoke (§14.2)                                                          |
| 5   | `optimization` | Optimization | `optimization-tab`           | —                                                                                         |
| 6   | `audit-trail`  | Audit Trail  | `project-audit-trail-tab`    | `audit-trail-entries-island` 🏝️ → `audit-hash-input-inspector` 🏝️ (§14.6)                 |

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

> **◐ Partly superseded by phases 1–3.** There are now **three** trees, not two. Wired surfaces take
> their types from `z.infer` over the response schemas in `src/lib/rnd/*.schemas.ts` — one source of
> truth per surface, no hand-maintained copy to drift. The two trees described below are what remains
> for the **unwired** surfaces, and both shrink each phase (§18).
>
> **Phases 2–3 deleted `types/research-and-development/workshop.ts` outright** (replaced by
> `src/lib/rnd/workshop.schemas.ts`), plus `research-and-development-workshop-mocks.ts`, the six
> `workshop/` leaves and the six `compensation/` leaves. Three new schema modules landed:
> `daily-logs.schemas.ts`, `workshop.schemas.ts` and the detail half of `projects.schemas.ts`.
>
> **`project.ts` and `MOCK_RESEARCH_PROJECTS` survive on one importer only** — the phase-4
> Proof-of-Effort page. The rule that what is left on disk is exactly what is still fabricated still
> holds, but only because that one page still fabricates it.
>
> The fetch layer did **not** slot in on top without moving anything, and could not have: the wire
> shapes differ from the mock shapes deeply enough (§12) that reusing the mock types would have meant
> lying about what arrives. `"use cache"` is also wrong for these reads — they are per-visitor
> projections, so `src/lib/server-http.ts` sets `no-store`; caching one would serve one member's view
> to the next visitor.

Two trees, both split by domain. Neither has a fetch layer, a getter, or a `"use cache"` annotation —
that layer slots in on top at integration without moving anything.

**Types** — `src/types/research-and-development/`, **7** files (was 8; `workshop.ts` is gone), all
`export type`, zero runtime exports:

| File                 | Covers                                                                                                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared.ts`          | cross-cutting unions: `ProjectStage`, `RoleCommitment`, `AiSummaryChip*`, `MilestoneStatus`, `FundingRound*`, `Escrow*`, `TrendDirection`                                                                                                                                                         |
| `project.ts`         | `ResearchProject`, `TeamMember`, `OpenRole`, `DailyLog`, `ProjectAnnotatedDailyLog` (§4c.2), `Milestone*`, `FundingRound`, `CompensationComponent`, `EscrowLedgerEntry`, `MapPosition`                                                                                                            |
| `discovery.ts`       | `ProblemReport`, `MarketInsight`, `TrendingSignal`, `TalentProfile`, `TalentAvailability`, plus the go-to-market family: `SupplierProfile`, `SupplierCapability`, `LaunchReadinessItem*` (§4c.4)                                                                                                  |
| `immortal.ts`        | 13 `Immortal*` types — branches, papers, posts, ideas, contributors, product opportunities, program stats                                                                                                                                                                                         |
| `proof-of-effort.ts` | 20 types — `MemberSliceBreakdown`, `VerificationStep*`, `ClaimVerificationRun`, `DisputeWindow*`, `PhysicalWorkReceipt*`, `OptimizationSuggestion*`, `ProjectAuditEntry`, `ProjectProofOfEffortLedger`                                                                                            |
| `compensation.ts`    | §5.5 / §7A — `CompensationAgreement` (union on `engagementKind`), `CompensationPeriod`, `CompensationPeriodLine` (union on `kind`), `CompensationPaymentRecord`, `ProjectCompensationLedger`; plus the §4c.3 rollup: `GovernanceSummary`, `GovernanceProjectRollupRow`, `GovernanceDisclosureKey` |
| `oversight.ts`       | §14.1/2/4/6 — `DisputeCase` + `DisputeVote`, `VerificationOverrideRequest`, `IntegrationConnection` + `IntegrationScope`, `RateLockProposal`, `PieBakeReadiness`, `ProjectChainVerification`                                                                                                      |

> **`project.ts` has exactly one importer left**, the phase-4 Proof-of-Effort page, and it is the only
> reason the file and `MOCK_RESEARCH_PROJECTS` are still on disk. Nothing wired reads it: phases 2–3
> take the project, its roster, its roles, its rounds, its milestones and its logs from
> `projects.schemas.ts`, `catalog.schemas.ts`, `funding.schemas.ts` and `daily-logs.schemas.ts`.
>
> **`compensation.ts`, `oversight.ts` and the §4c additions carry §11 wire-format values** — integer
> cents / basis points / minutes / days with the unit in the field name, snake_case enum values, ISO
> instants and date-only days, full 64-char hashes. They have no legacy importers, so there was
> nothing to migrate; §12 does not apply to them.

[src/types/research-and-development.ts](src/types/research-and-development.ts) is a **re-export
composer** (`export * from "./research-and-development/shared"`, …), kept so ~55 existing importers
of the flat specifier keep working. New code may import either.

**Mocks** — two top-level composers over a leaf tree:

| Composer                                                      | Exports                                                                                                                                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/mocks/research-and-development-mocks.ts`                 | `MOCK_RESEARCH_PROJECTS` (6) + `MOCK_OPEN_ROLES` (flatMapped from them); re-exports insights, problem reports, talent, trending signals, investor confidence, suppliers + launch readiness, `PROJECT_STAGE_LABELS` |
| `src/mocks/research-and-development-proof-of-effort-mocks.ts` | `MOCK_PROJECT_PROOF_OF_EFFORT_LEDGERS`; its header carries the Slicing Pie recipe the mocks were computed with                                                                                                     |
| `src/mocks/research-and-development-compensation-mocks.ts`    | re-export-only now: `MOCK_GOVERNANCE_SUMMARY` + `SAMPLE_STATEMENT_WALKTHROUGH` (§4c.3). `MOCK_PROJECT_COMPENSATION_LEDGERS` is gone — see below                                                                    |
| `src/mocks/research-and-development-oversight-mocks.ts`       | `MOCK_PROJECT_OVERSIGHT` + `INTEGRATION_PROVIDER_LABELS` — disputes, overrides, integrations, rate locks, bake readiness, chain inputs (§14)                                                                       |
| `src/mocks/project-immortal-mocks.ts`                         | re-export-only composer for every `MOCK_IMMORTAL_*` + the four label maps                                                                                                                                          |

Leaf files under `src/mocks/research-and-development/`:

```text
governance-summary.ts   §4c.3 — cross-project rollup + the authored sample statement
immortal/        branches · contributors · ideas · informal-posts · papers ·
                 paper-moderation · product-opportunities · program-stats · labels
projects/        one file per slug → <SLUG>_PROJECT
proof-of-effort/ one file per slug → <SLUG>_LEDGER
oversight/       one file per slug → <SLUG>_OVERSIGHT, plus integration-scopes.ts
```

**`workshop/` and `compensation/` are gone** (12 files, ~2,200 lines), deleted with the surfaces that
read them. The six slugs remain identical across `projects/`, `proof-of-effort/` and `oversight/`:
`solar-cold-storage`, `modular-water-purification`, `agricultural-drone-kits`,
`prefab-housing-panels`, `e-waste-recycling-line`, `medical-cold-chain-packaging`. There is no barrel
inside the leaf directory — consumers import a composer or a leaf file directly.

**These six slugs no longer exist anywhere real.** The `[id]` routes prerender from
`GET /research-projects/slugs`, so `/project/solar-cold-storage` is now a 404 while
`/project/solar-cold-storage/proof-of-effort` still resolves against the fixture. That divergence is
why phases 2–3 removed every link into the Proof-of-Effort route rather than leaving dead ones.

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

| Surface                          | Casing         | Example                                                 |
| -------------------------------- | -------------- | ------------------------------------------------------- |
| Path segments & directories      | **kebab**      | `/research-and-development/go-to-market`                |
| Slugs (URL identities)           | **kebab**      | `solar-cold-storage` · `east-africa`                    |
| Query keys & JSON fields         | **camelCase**  | `?minOpportunityScorePoints=80`                         |
| Enum values (query **and** body) | **snake_case** | `?stage=team_building` · `{ "stage": "team_building" }` |

**No enum value appears in a path segment anywhere on this surface**, so the URLs are kebab-case
throughout — the visible `snake_case` is confined to query _values_, where it is the `pgEnum` label
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
> **Phases 2–3 closed `workshop.ts` in full and most of `project.ts`.** Both were resolved by
> DELETING the type rather than migrating it: a wired surface reads `z.infer` over the response
> schema, so `workshop.ts` is gone and `project.ts` survives only for the phase-4 Proof-of-Effort
> page.
>
> **Still owed**: `proof-of-effort.ts` (phase 4), `oversight.ts` (phase 4), `compensation.ts`
> (phase 5), `immortal.ts` (blocked). §18 also lists the phase-4/5 enum values still on the old
> convention.
>
> One row below is **wrong as written** — see §13 on the go-to-market types, which the doc claimed
> needed no migration and which disagreed with three shipped pgEnums.

Backend §15. Not just values — **shapes**. Every row is a compile error the migration works through.

### `project.ts` — ✅ resolved for every wired surface

Phase 2 did not migrate this file; it stopped reading it. The detail page's shapes now come from
`ResearchProjectDetailSchema` / `ProjectTeamMemberSchema` / `ProjectStatsSchema`
([projects.schemas.ts](src/lib/rnd/projects.schemas.ts)), `FundingRoundSchema` / `MilestoneSchema` /
`MilestoneVarianceSchema` / `InvestorConfidenceSchema`
([funding.schemas.ts](src/lib/rnd/funding.schemas.ts)) and `DailyLogViewSchema`
([daily-logs.schemas.ts](src/lib/rnd/daily-logs.schemas.ts)). The table below records what the wire
turned out to hold; the file itself still carries the old shapes for the phase-4 page.

**Three rows landed differently than planned, and the difference matters:**

- `TeamMember.equityShare` → `equityBasisPoints` and `effortHoursLogged` → `verifiedEffortMinutes`
  **did not happen.** `ProjectTeamMemberView` carries NEITHER — the backend omits both deliberately,
  because they are derived by the §9 slice ledger and a default would be a fabricated number on a
  Slicing Pie surface. The Team tab's equity-split bar was **deleted** rather than retyped; there is
  no honest source for it until phase 4.
- `DailyLog.isEffortVerified: boolean` → the six-value enum happened, but the boolean **also stays on
  the wire**, derived as `status === "verified"`. Prefer `effortVerificationStatus`.
- `ResearchProject.coverImageSrc` → `coverImageUrl` is **nullable**, which the mock field was not.
  Every render site needs a fallback.

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

### `workshop.ts` — ✅ done, by deletion

The file no longer exists. [workshop.schemas.ts](src/lib/rnd/workshop.schemas.ts) replaced it in
phase 3, and every row on the old list landed: `fileSizeLabel: "1.8 MB"` → `sizeBytes`, **NULL** for
a link-hosted file and rendered as an em dash rather than "0 B"; `dueDateLabel` → date-only ISO;
`WorkshopTask` **gains `rank`** (read-only on the wire — no request body accepts one) plus
`columnId`, `description` and both timestamps; `sentAtLabel` → ISO `sentAt`; `"cad-model"` →
`cad_model`, with `archive` and `other` added because a link can point at anything.

Two shapes were wider than the list expected: `assigneeMemberId` is **nullable**, and the snapshot
carries a fourth field, `readState`.

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

## 13. Route → endpoint map

Every row below is wired **unless its State column says otherwise** — two do. The table is the
READ map; §19 lists the write islands separately, because a write belongs to a control rather
than to a route.

| Frontend route                          | Endpoints                                                                                                                                                                                                                                    | State          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `/research-and-development`             | `GET /research-projects` · `/discovery/problem-clusters` · `/discovery/market-insights` · `/open-roles`                                                                                                                                      | ✅ wired       |
| `/new`                                  | `GET /research-categories?status=approved` → `POST /research-categories` (when new) → `POST /research-projects`. Creates a **DRAFT**; publishing is separate                                                                                 | ✅ wired       |
| `/applications`                         | `GET /applications/mine` · `GET /invites/mine` → invite `accept` / `decline`                                                                                                                                                                 | ✅ wired       |
| `/project/[id]`                         | `GET /research-projects/:slug` **first**, then `…/roles` · `…/milestones` · `…/daily-logs` · `…/funding-rounds` · `…/investor-confidence` · `…/launch-readiness` · `…/compensation-agreements` · `…/compensation-periods` · `…/compensation` | ✅ wired       |
| `/project/[id]/workshop`                | `GET /research-projects/:slug` then `…/workshop` (board, files, chat, read state in one payload)                                                                                                                                             | ✅ wired       |
| `/project/[id]/proof-of-effort`         | `GET /research-projects/:slug` then twelve §9 reads (§19)                                                                                                                                                                                    | ✅ wired       |
| `/problem-map`                          | `GET /discovery/problem-clusters` · `/research-categories` · `/discovery/regions`                                                                                                                                                            | ✅ wired       |
| `/problem-map/cluster/[clusterId]`      | `GET /discovery/problem-clusters/:clusterId`                                                                                                                                                                                                 | ✅ wired       |
| `/knowledge-hub`                        | `GET /discovery/market-insights` · `/discovery/demand-signals`                                                                                                                                                                               | ✅ wired       |
| `/talent`                               | `GET /discovery/talent` · `/discovery/skills` · `/open-roles`                                                                                                                                                                                | ✅ wired       |
| `/talent/[handle]`                      | `GET /discovery/talent/:talentUserIdOrHandle`                                                                                                                                                                                                | ✅ wired       |
| `/funding`                              | `GET /funding/deals` → `GET /funding-rounds/:id/pledge-options` → `POST …/pledges`                                                                                                                                                           | ✅ wired       |
| `/governance`                           | `GET /governance/summary` — public aggregates, `disclosureKeys`, and the caller's own open lines                                                                                                                                             | ✅ wired       |
| `/team-building`                        | `GET /open-roles` · `/research-projects?stage=team_building` · `/discovery/talent` · `/discovery/skills`                                                                                                                                     | ✅ wired       |
| `/build-log`                            | `GET /daily-logs` (member-scoped, keyset) · `/daily-logs/streak-leaderboard` (public)                                                                                                                                                        | ✅ wired       |
| `/go-to-market`                         | `GET /suppliers` · `/supplier-capabilities` · `/launch-ready-projects` · `/discovery/regions`                                                                                                                                                | ✅ wired       |
| `/go-to-market/supplier/[supplierSlug]` | `GET /suppliers/:supplierSlug`                                                                                                                                                                                                               | ✅ wired       |
| `/projects/project-immortal`            | `/research-programs/*`                                                                                                                                                                                                                       | 🚫 **blocked** |
| `/import-intelligence`                  | `GET /localization-assessments` · `/import-commodities` · `/import-commodity-kinds` · `/discovery/regions` · `/research-categories?status=approved`                                                                                          | ✅ wired       |
| `/import-intelligence/[hsCode]`         | `GET /import-commodities/:hsCode` **first**, then `…/trade-flows` · `…/substitutes`                                                                                                                                                          | ✅ wired       |

### ⚠️ Where the backend contract doc is wrong about its own backend

Found by reading the route files rather than the doc, while wiring phases 1–3. Each would have
shipped a `422` or a parse failure — every backend query schema is `.strict()`, so an unrecognized
param is an error, not an ignored key.

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

**Seven more found while wiring phases 2–3**, the same way — by reading `src/routes/` and the service
view interfaces rather than §11. **The first two have since been closed by backend §11j and are struck
through** — they were true when found and are not any more, which is the failure mode this table
exists to catch, pointed the other way:

| The doc implies                                                      | The code has                                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~`GET /research-projects/:slug/disputes` (§13, §11e)~~              | ~~**No such route.**~~ **CLOSED by backend §11j.2.** `GET …/disputes` and `GET …/disputes/:disputeId` both ship. The dispute UI is the GDPR Art. 22 / AI Act Art. 14 path and is now blocked on the FRONTEND only |
| ~~`GET /research-projects/:slug/effort-claims` as a list (§13)~~     | ~~**Detail only.**~~ **CLOSED by backend §11j.2.** The list ships alongside `GET …/effort-claims/:claimId`                                                                                                        |
| A single paginated envelope                                          | **Five shapes**, and which one a read uses is not guessable from its name — see the table under "Five envelope shapes" below                                                                                      |
| `earnedAsLabel` on advertised compensation                           | **`earnedAsPolicy`**, an enum. Server prose was replaced by a key three clients localize themselves                                                                                                               |
| `GET /research-categories` mirrors `/discovery/categories`'s `label` | Both return **`displayLabel` + `pinIconKey`** — it is literally the same controller                                                                                                                               |
| `GET …/daily-logs` accepts the usual list params                     | **`limit` only** on the project-scoped read. No page, no cursor, no `?status=`, no author facet                                                                                                                   |
| `GET …/allocation-proposals` takes `?status=&page=` (backend :2892)  | It also takes **`?cursor=&limit=`** (migration 0027). The §9 matrix was never updated when §11l.2's prose was                                                                                                     |
| `GET …/slice-ledger` takes `?page=&limit=` (backend :2882)           | It also takes **`?fromSequence=`**, which WINS over `page`. Same un-updated matrix                                                                                                                                |
| `GET …/compensation-periods` takes `?status=&page=` (backend :3017)  | **Actively wrong.** The schema is `.strict()` with NO `page` key, so `?page=2` is a **422**. The param is `beforeSequenceNumber`, named correctly elsewhere in that doc                                           |
| A non-member always gets `404`                                       | Signed OUT is **`401`** on `…/workshop` and `/daily-logs`; a signed-in non-member gets `404`. Both must render, and they render differently                                                                       |

The last row is what phases 2–3 were built around. `MemberScopedListViewState` maps `401` and `404`
to the same `restricted` variant but keeps `isSignInRequired` on it, so a stranger gets a sign-in
prompt and a signed-in non-member gets "this is the team's". Neither reveals whether the child
resource exists — and the exemption from the never-explain-a-404 rule is safe **only** because the
public detail read has already resolved the project (see `view-state.ts`).

#### Five envelope shapes

There is no shared list envelope on this surface and there is no naming convention that tells you
which shape a read uses. **Check the route before picking a transport helper** — the shapes are not
interchangeable, and three of the five put their paging token in a different place.

| Shape                                                                           | Reads                                                                      | Helper                   |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| Bare array in `data`                                                            | Most R&D reads — `/funding/deals`, `…/disputes`, `…/compensation-periods`  | `getJson` + `.array()`   |
| `data[]` + a `pagination` SIBLING                                               | `/research-projects`, `/suppliers`, `/discovery/*` — the nine offset lists | `getPaginated`           |
| `data: { logs \| messages \| notifications, nextCursor }` — token INSIDE `data` | `/daily-logs` — the only one of these three read here                      | `getCursorPaginated`     |
| `data[]` + a `nextSequence` SIBLING                                             | `…/slice-ledger`, `…/audit-trail`                                          | `getSequenceSiblingList` |
| `data[]` + a `nextCursor` SIBLING                                               | `…/effort-claims`, `…/allocation-proposals` (backend migration 0027)       | `getCursorSiblingList`   |

The last two exist because **the rows deliberately did not move under an envelope key** when those
reads gained a token — that would have broken every client already parsing `data` as an array. So a
sibling token is the compatible shape, not an inconsistency, and it is why `getCursorPaginated`
cannot serve them: it reads `data` only.

`…/compensation-periods` is the one keyset read with **no server token at all**. It is a bare array,
and the backend intends the client to echo the last row's `sequenceNumber` back as
`?beforeSequenceNumber=`, which it filters with a strict `<`. That is safe in a way constructing a
cursor is not — a sequence number is a plain unique integer the row already carries, with nothing to
encode and no precision to lose. The cost is that "is there another page?" has to be inferred from a
FULL PAGE, so an exactly-full final page costs one extra request that returns nothing.

`…/effort-claims` is the one read whose shape **depends on the request**: send a `cursor` and it
answers keyset, dropping `pagination` rather than reporting a total it deliberately did not count;
send none and it answers offset with `pagination`. `nextCursor` comes back either way, which is what
lets a first request — which has no cursor by definition — enter keyset mode at all.

> **That last sentence is a BACKEND FIX, not a contract we found.** As migration 0027 shipped it,
> `hasMore` was gated on `isKeyset` in `effort-claims.service.ts`, `slice-allocation.service.ts` and
> `slice-ledger.service.ts` — so a cursor-less first request always got `null` and there was no
> `?paging=keyset` opt-in either. Chicken and egg: you could not obtain the token you had to send.
> The keyset-ONLY reads in the same codebase never had that gate (`daily-logs.service.ts`,
> `notifications.service.ts`, `project-audit.service.ts`), which is exactly why the daily-log feed
> could page and these three could not — one bug in three places, and `slice-ledger` had carried it
> since before 0027. Ungating it also gave offset mode a truthful `nextCursor` alongside its
> `pagination`, which is coherent rather than contradictory: offset mode runs the `COUNT`, so both
> fields are honest at once. **Do not "fix" this back.**

#### What changed on the backend that this frontend cannot see

Recorded so nobody re-derives it. Backend §11l.2 and §11l.4 closed four items with **no wire-visible
effect on this repo** — no route, query param or response field was removed:

- **Rate-limit buckets are shared through Postgres** (migration 0028). The `429` envelope is
  unchanged. What actually changed is that the buckets no longer reset on deploy, which had been
  handing a fresh OTP and credential-stuffing budget to anyone watching.
- **Per-route JSON body caps now work** (§11l.4). They had never been in effect — a global
  `express.json({ limit: "10kb" })` and three prefix mounts voided all 77 per-route parsers, so six
  route groups were rejecting bodies their own schemas accept. Caps are now DERIVED from each route's
  own Zod worst case, which is why nothing this frontend can legitimately send can `413`: a body that
  trips a cap is one Zod would have rejected anyway. A `413` arrives in the normal `ApiResponse`
  envelope.
- **The derived OpenAPI document now carries request bodies** for all 71 R&D routes that take one.
- **`window_closes_at` moved to `timestamp(3)`** (migration 0027). Invisible on the wire — the
  frontend types `windowClosesAt` as `z.string()` and `JSON.stringify` already emitted exactly three
  fractional digits. What improved is that the stored value and the wire value now agree, so a
  countdown can no longer read the window as closing a fraction of a millisecond early.

One item is **still open on the backend**: Better Auth's own rate limiter remains per-process
(`src/lib/auth.ts`), because `drizzleAdapter` is built without a `schema` and a missing `rateLimit`
model would throw on the first Better Auth request — a login-path outage rather than a boot failure.

**One backend change IS observable here, and it is not a removal.** `…/allocation-proposals` now
tie-breaks `id DESC` instead of `id ASC`, so proposals sharing a `windowClosesAt` arrive in the
opposite relative order. The mixed directions were the reason no btree could serve that `ORDER BY`,
so every page had been sorting every proposal in the project and discarding the offset.

**These findings had a home on the backend side:
[R_AND_D_BACKEND_STRUCTURE.md](R_AND_D_BACKEND_STRUCTURE.md) §11j**, which enumerated every R&D
endpoint then missing (Project Immortal excluded) and, in §11j.6, every verb that is absent on
purpose. Three rows of §18's dark table turned out to be BACKEND gaps rather than frontend ones —
**and all three have since shipped.** Recorded here rather than deleted, because the mis-attribution
is the lesson:

- The Overview tab's **demand-evidence chips and Civic Pulse origin link** were dark because
  `problem_cluster_project_link` had no write path anywhere in the backend, and no project ↔
  `market_insight` relation existed at all. **Both halves are now built** — the writes with §11j.4,
  and the reads the project detail needed with **§11k**: `ResearchProjectDetailView` carries
  `originCluster: { clusterId, title } | null` and an ordered
  `relatedInsights: { insightId, headline }[]`.
- **`/knowledge-hub` rendered an empty state that read as "no insights yet".** It was actually "no
  insight can be created": `market_insight` had no route, no job and no seed script writing it.
  **Closed by §11j.4's `/discovery/admin/market-insights`.**

**All three are now frontend work**, and §18's "returns when" column has been updated to say so.
The general lesson stands: a dark surface is not automatically a frontend miss, and this section is
where the check belongs — but check it against `src/routes/` and `src/db/schema.ts` in the backend
repo each time, because a gap that was real when written may have closed since.

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

**Findings from wiring phases 4–5 and the writes.** Same method — read `src/routes/` and the
service view interfaces, never §11:

| The doc implies                                          | The code has                                                                                                                                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUT`/`PATCH` are interchangeable for milestone variance | **`PUT /milestones/:id/variance`**, and the verb is the contract: recording the same variance twice must leave one row. `sendJson` gained `PUT` for this one route and no other        |
| `GET …/compensation-periods` is offset-paginated         | **Keyset on `beforeSequenceNumber`**, and the list rows carry NO `lines` — those come with the detail read, alongside `payments`                                                       |
| A dispute always has a `resolution`                      | **Nullable** while it is open. `dispute.resolution` carries no `.notNull()`                                                                                                            |
| `GET …/equity` returns a snapshot                        | **`EquitySnapshotView \| null`** — null is a project with no cap table, which is not a cap table of zeroes                                                                             |
| The compensation agreement status enum has `declined`    | **Four values, and `declined` is not one.** A member declining writes `withdrawn`; the audit kind `compensation_agreement_declined` is what distinguishes it from a founder retraction |
| `?status=` on `/effort-claims` is a claim-specific enum  | It is the SHARED six-value `effort_verification_status`, the same enum the daily log and each run's verdict use                                                                        |

**Client-side rules the contract forces — all now implemented:**

- **Keyset pagination, and it is now WIRED rather than merely available.** Six lists page:
  `/daily-logs` (three-column log cursor), `…/effort-claims` (`<YYYY-MM-DD>_<id>`),
  `…/allocation-proposals` (`<epochMs>_<id>`), `…/slice-ledger` and `…/audit-trail`
  (`?fromSequence=`), and `…/compensation-periods` (`?beforeSequenceNumber=`). Each is a
  `client-query` island seeded with the page its server component already read, accumulating through
  `useKeysetList` (`src/hooks/rnd/keyset-list.ts`) and advancing via `LoadMoreControl`. Four rules
  hold on every one of them:
    - **A cursor is ECHOED, NEVER BUILT.** `src/lib/http.ts` says so and it is not stylistic: the claim
      cursor carries a calendar date the backend keeps as a string end to end precisely so it never
      passes through a `Date`, and the proposal cursor's epoch half depends on a column precision the
      backend owns — `window_closes_at` was microseconds until backend migration 0027 moved it to
      `timestamp(3)`. A cursor coarser than its column steps over rows it can neither match nor pass.
      The one exception is `?beforeSequenceNumber=`, which is not a cursor but a plain unique integer
      the row itself carries, and which the backend intends the client to derive.
    - **Never send `page` and a token together.** The backend drops `page` silently, and on
      `…/effort-claims` the `pagination` block goes with it — no error, just a missing block.
    - **A malformed token is `422`, and it must SURFACE.** Never a silent restart: a feed that restarts
      itself shows duplicate rows and gets reported as a backend bug. `LoadMoreControl` keeps the rows
      already on screen and shows the backend's message beside the button.
    - **The token's absence is the end of the list.** `null` means no more rows, so the control renders
      nothing — a permanently visible button that returns nothing reads as a broken feed.
- **Async states are real.** Claim submit, re-verify, receipt upload and problem report all return
  **`202`**, and `claim-detail-disclosure.tsx` polls the detail read until the status turns terminal
  rather than rendering a verdict nobody computed.
- **Idempotency keys** on claim submit, receipt upload, dispute raise and payment record, minted once
  per attempt in component state.
- **Multiple verification attempts.** `ClaimDetailSchema.runs` is a LIST and every attempt renders;
  showing only the latest would display a stale verdict the moment anyone asks for a re-check.
- **Server-side filtering** on every list, through `buildFilterHref` and `readEnumParam`.
- **A chip is not a control.** `ENABLED_FUNDING_ROUND_TYPES` is enforced at the API and in SQL.
- **Never fabricate a missing signal.** `investor-confidence` 404s when never computed, `…/pie-bake`
  404s before the bake, `equity` is null before the first snapshot — all render as absences.

Everything crossing the network is `unknown` → Zod `.strip()` → tagged result, lifted into the
component's state union (`CLAUDE.md` Patterns 1–3). That now covers the writes too: a mutation's
response is parsed exactly like a read's, so a backend that starts returning a different shape fails
the parse instead of quietly rendering.

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
| `src/types/research-and-development/*.ts`                     | 7 files (§10) — `workshop.ts` deleted in phase 3          |
| `src/types/research-and-development.ts`                       | re-export composer — do not delete                        |
| `src/mocks/research-and-development-mocks.ts`                 | projects + derived open roles + re-exports                |
| `src/mocks/research-and-development-proof-of-effort-mocks.ts` | slice ledgers                                             |
| `src/mocks/research-and-development-compensation-mocks.ts`    | the §4c.3 governance rollup only; the ledgers are deleted |
| `src/mocks/research-and-development-oversight-mocks.ts`       | disputes / consent / rates / bake (§14)                   |
| `src/mocks/project-immortal-mocks.ts`                         | program composer                                          |
| `src/mocks/research-and-development/**`                       | leaf files (§10) — `workshop/` and `compensation/` gone   |

### Components — `src/components/home/research-and-development/`

137 files. Server components unless marked 🏝️ (client island — 34 of them; keep them small per
`CLAUDE.md`). The island count grew with §14 and again with §4c: every write surface and every
filter has to hold its own state, and none of them may reach for a context provider (§15 Q5).

```text
(root — page bodies)
├── research-and-development-page.tsx  landing composition
├── project-detail.tsx                 header + stats + 6-tab shell
├── workshop-page.tsx                  3-tab shell (boards/files/chat)
├── proof-of-effort-page.tsx           6-tab shell (§5b)
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
├── daily-logs-feed.tsx                         renders the wired page's logs; the member filter is gone (§18)
├── team-tab.tsx · funding-tab.tsx
├── compensation-format.ts                      cents/basis-points/minutes → labels, timezone-free
├── compensation-agreement-island.tsx       🏝️  propose / accept / decline / withdraw (§14.3)
├── verification-override-panel.tsx         🏝️  human review of an automated verdict (§14.1)
├── integration-consent-tab.tsx             🏝️  connect / scope / revoke (§14.2)
├── rate-lock-panel.tsx                     🏝️  propose / review / lock / history (§14.4)
├── pie-bake-panel.tsx                      🏝️  checklist + frozen cap table (§14.6)
├── audit-hash-input-inspector.tsx          🏝️  per-entry RFC 8785 bytes, RE-HASHED IN THE BROWSER
├── round-backers-island.tsx                🏝️  who backed a round; collapsed, one request per round
├── equity-snapshot-history-island.tsx      🏝️  the nightly recalculations behind the current pie
├── workshop-chat-message-island.tsx        🏝️  one message row; the author's own edit / delete
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

| Phase                             | Scope                                                                                                                                                                                                                                                                                                 | State   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **0 · foundations**               | `src/lib/rnd/` (schemas, api, formatters, view state, filter hrefs, map projection, labels) · `src/lib/server-http.ts` · `QueryProvider` in `(home)` · `snake_case` enum migration · `TRANSPORT:` banners                                                                                             | ✅ done |
| **1 · public discovery reads**    | landing · `/knowledge-hub` · `/problem-map` · `/talent` · `/team-building` · `/go-to-market` · `/funding`                                                                                                                                                                                             | ✅ done |
| **2 · projects & detail**         | `/research-projects/slugs` for `generateStaticParams` · detail · team · roles · milestones · funding rounds · investor confidence                                                                                                                                                                     | ✅ done |
| **3 · workshop & daily logs**     | board / files / chat in one `…/workshop` read · per-project logs · `/build-log` (member-scoped, `401` signed out)                                                                                                                                                                                     | ✅ done |
| **4 · proof of effort**           | slice ledger · verification · disputes · integrations · audit trail · rate lock · pie bake                                                                                                                                                                                                            | ✅ done |
| **5 · compensation & governance** | agreements · periods · finalize / countersign / payments / export · `/governance/summary`                                                                                                                                                                                                             | ✅ done |
| **W · writes**                    | the whole mutation surface — PoE, compensation, funding pledges, project create/publish, applications & invites, workshop board / files / chat                                                                                                                                                        | ✅ done |
| **W2 · write UI**                 | a control for every one of them: the rate lifecycle, claim + receipt, founder round/milestone/role/member management, the application inbox, daily-log authoring, board editing, talent profile, problem reports                                                                                      | ✅ done |
| **K · keyset paging**             | six lists made pageable — the daily-log feed, the claim index, allocation proposals, the slice ledger, the project audit trail, compensation statements                                                                                                                                               | ✅ done |
| **6 · research programmes**       | the whole `/research-programs` domain — index, detail, branch tree, paper library with real PDF upload, both post tracks, reactions, reports, moderation, contributors, effort and contribution records, the propose-a-programme wizard                                                               | ✅ done |
| **7 · import intelligence**       | §20 — the HS6 commodity index, country import volumes in both directions, domestic substitute mappings, the five-component feasibility score and its LLM pathway narrative. Backend first (`R_AND_D_BACKEND_STRUCTURE.md` §10A / §11m), then two `server-fetch` bodies and five `props-only` sections | ✅ done |

**Phase W is the one that was not in the original plan**, and it is the larger half of what
landed. Until it, `rg 'sendJson|sendForm' src/lib/rnd/` returned NOTHING: every control on this
surface that looked like it did something wrote to `useState`. That is worse than a missing feature
— "Request sent ✓" on a button that sent nothing tells someone their application is with a team it
never reached. The mutation wrappers now live beside their reads in `src/lib/rnd/*.api.ts`, the
React Query hooks in `src/hooks/rnd/`, and every write control is a `client-query` island.

**Phase K came last and was not in the plan either.** Every list on this surface had been
FIRST-PAGE-ONLY: `filter-href.ts` strips `page` from every URL patch, no component ever set one, and
`build-log-page.tsx` was computing a `nextCursor` and throwing it away. So a project with two years
of daily logs, or a ledger with thousands of entries, showed its first page and silently ended — the
rest of the audit surface was unreachable through the UI that exists to show it.

Wiring it needed a BACKEND FIX FIRST, and that is the part worth remembering: three services gated
`hasMore` on `isKeyset`, so a cursor-less first request could never obtain the cursor it had to send
(§13). The keyset-only reads had no such gate, which is precisely why the daily-log feed could page
and the other three could not. Six `client-query` islands now sit inside the same `server-fetch`
pages, seeded with the page the server already read so nothing is fetched twice on mount.

**Phase 6 shipped, and it was blocked on the backend rather than on this repo.** The domain now
exists: 15 tables, 30 routes, 11 services, two nightly jobs and migrations 0029–0031. Project
Immortal stopped being a hardcoded page and became one row in it, which is what makes "and
programmes like it" true — the propose-a-programme wizard is the feature, not the flagship.

**What the backend had to grow for it**, beyond the domain itself, because each was a real gap:

| Gap                                           | What shipped                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No non-image object storage                   | `src/lib/object-storage.ts` over Backblaze B2's S3 API. The credentials were already in `.env` and read by NOTHING — no config entry, no `.env.example`, no SDK. Cloudinary could not serve it: all five of its families hardcode `resource_type: "image"` and `lib/image.ts` answers NOT_AN_IMAGE for a PDF |
| No branch gap/overlap detection               | `recompute-branch-signals`, using the existing integer-Jaccard `lib/text-similarity.ts`. There is no pgvector, no embedding call and no cosine anywhere in the backend, and adding one to compute a nightly integer was not worth it                                                                         |
| No `recompute-program-stats` job              | Shipped, and it runs AFTER the signals pass — the stat tiles count gaps and overlap flags from the statuses that job derives, so the cron order (03:20 then 03:35) is load-bearing                                                                                                                           |
| No reaction, threading or reporting primitive | All three. Reactions are idempotent by verb; threading is depth-capped at one reply; a report is one per user per target                                                                                                                                                                                     |
| No effort tracking outside a project          | `research_effort_log` + `research_contribution_ledger_entry`, both append-only by trigger, neither minting equity                                                                                                                                                                                            |
| `authorLocation` had no backing column        | `user.locationLabel` — a self-set claim, geocoded by nothing and read by nothing but the discussion feed                                                                                                                                                                                                     |
| Paper categories were a frontend-only union   | `research_paper_category`, a table on the `research_category` pattern: user-mintable, moderator-approved                                                                                                                                                                                                     |
| Contributor roles were kebab-case             | A `snake_case` pgEnum. `founder-director` → `founder_director`                                                                                                                                                                                                                                               |

**One §11l.2 item turned out to be stale.** It says no moderation service writes an audit row;
`appendPlatformAuditEntry` already existed with three callers, so §10's moderation joined that
convention rather than inventing a log.

**The two compliance items are built**, and this paragraph is kept because the reasoning is why
they were prioritised. The dispute / override UI and the integration-consent screen are the GDPR
Art. 22 contestability path and the EU AI Act Art. 14 human-oversight control. A backend that offers
human intervention through an endpoint no screen calls does not, in practice, offer it — which was
the situation until phase 4. They are now:

- **Contest an automated decision** — `raise-dispute-island.tsx` (`POST …/allocation-proposals/:id/dispute`)
  and `dispute-actions-island.tsx` (vote / withdraw / resolve), rendered by `dispute-window-tab.tsx`.
- **Override an automated judgement** — `claim-detail-disclosure.tsx`
  (`PATCH …/effort-claims/:claimId/steps/:stepId/override`). It edits a STEP STATUS and carries no
  minutes field, so a human corrects the judgement and the formula recomputes the number.
- **Withdraw consent** — `integration-consent-tab.tsx` (`DELETE …/integrations/:provider`), which
  destroys the token and purges the payloads while the hashes survive.

**Both are now blocked on this repo alone.** The dispute row was previously "blocked on both sides" —
there was no `GET …/disputes` to read. Backend §11j.2 shipped it along with `GET …/disputes/:disputeId`,
so neither compliance item is waiting on backend work. They are screens.

### Every write has a control — and the audit that proves it

The previous pass shipped the write LAYER and left about twenty writes with a wrapper, a hook and a
parsed response but **no control on a page**. That table is gone because it is empty.

A wrapper with no caller is not coverage, it is UNVERIFIED CODE — and this pass proved the point
twice by finding two wrappers that could never have worked:

- **`createProblemReport` sent a body the backend rejects.** It posted
  `latitudeMicrodegrees` / `longitudeMicrodegrees` / `locationLabel`, all three of which
  `CreateProblemReportSchema.strict()` refuses with a `422`, and it omitted the required
  `locationText` entirely. Wiring the report sheet is what found it.
- **`markWorkshopChatRead` sent `lastReadMessageId`.** The field is `throughMessageId` — the same
  name the read state comes back with, which is the convention the whole wire follows.

Both are recorded in `R_AND_D_BACKEND_STRUCTURE.md` Appendix D, because the general lesson is the
useful part: an uncalled wrapper has never been checked against the schema it claims to match.

**The audit that keeps this true**, and the one to run before claiming coverage again:

```bash
# NOTE `--no-filename`. Without it rg prefixes each hook name with its path, every `rg -q`
# misses, and the loop reports ALL ~90 hooks as uncalled — which is how this check quietly
# stopped checking anything.
for h in $(rg --no-filename -o 'export function (use\w+)' -r '$1' src/hooks/rnd/ | sort -u); do
  rg -q "\b$h\b" src/components || echo "UNCALLED $h"
done
```

It currently prints nothing. Getting there also **deleted four query hooks** —
`useCompensationAgreementsQuery`, `useCompensationPeriodsQuery`, `useDisputesQuery` and
`useEffortClaimsQuery` — rather than finding callers for them: each duplicated a read the server
component already makes, so they were two ways to fetch one thing and the unused one would have
drifted. What survives is the reads that are genuinely on demand: a claim's detail (it fans out to
runs, steps and evidence), a statement's detail, and one member's rate history.

### What the wired phases left dark, and what came back

Cumulative across phases 1–5 and the write phase. Each row is a consequence of refusing to
fabricate a value the backend does not serve. **Most of them have now returned**, and the ones that
have not are listed with the reason they still cannot.

**Returned:**

| Surface                                            | What came back, and how                                                                                                                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Overview tab — demand-evidence chips               | `relatedInsights: { insightId, headline }[]` on `ResearchProjectDetailSchema`. Rendered as NON-LINKING chips: there is no `GET /discovery/market-insights/:insightId`, so there is no page to open (Appendix D)                            |
| Overview tab — Civic Pulse origin link             | `originCluster: { clusterId, title } \| null`, linking to the new `/problem-map/cluster/[clusterId]` route by ID — clusters have no slug                                                                                                   |
| Team tab — equity split bar & member equity footer | Replaced rather than restored. The real cap table is the Proof-of-Effort equity snapshot, and it now renders on `/project/[id]/proof-of-effort` off `GET …/equity` — not reconstructed from a roster row that still carries neither figure |
| Project detail — Governance tab                    | Returned as the **Compensation** tab, off §7A rather than the retired escrow ledger it used to draw: agreements, statements, lines, payments and the two totals                                                                            |
| Links into `/proof-of-effort`                      | The route stopped prerendering six hardcoded mock slugs and now uses `GET /research-projects/slugs`, so a real slug resolves                                                                                                               |
| Workshop — add task / upload / send                | Returned as three `client-query` islands: `workshop-task-composer.tsx`, `workshop-file-linker.tsx`, `workshop-chat-composer.tsx`. The file control is a LINK form, not a picker — object storage is deferred (Appendix A2)                 |
| Supplier directory — region chips                  | Built from `GET /discovery/regions` instead of from the fetched page, and applied by the backend in SQL. The same row now exists on `/problem-map`                                                                                         |
| `/go-to-market` — readiness checklist              | The cross-project page still renders the explainer, because `…/launch-readiness` is member-only. The REAL checklist, with states and counts, is now the project detail page's Go-to-market tab                                             |

**Still dark, and why:**

| Surface                                         | What is dark                                                                                                                                                           | Returns when                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Daily-log card — AI summary chips               | `DailyLogView` carries none; chips live on `GET …/daily-logs/:logId` alone, so a feed would be one request per card                                                    | the feed row carries chips (Appendix D) |
| `/build-log` — log-legend AI-tag half           | Removed with the chips. A legend for symbols the page never renders teaches a vocabulary it does not speak                                                             | same                                    |
| `/build-log` — project + chip-kind filter chips | `?projectSlug=` and `?chipKind=` are real server filters, but the project chips could only offer projects already on the page                                          | the page reads memberships              |
| Daily Logs tab — member filter                  | `GET …/daily-logs` takes `limit` and nothing else                                                                                                                      | a backend author facet                  |
| Funding tab — backer avatar stack               | `GET /funding-rounds/:roundId/backers` now has a wrapper, but rendering it is one request per round on a list page                                                     | a per-round detail surface              |
| `/talent` — pay-kind filter chips               | `/discovery/talent` accepts no such param; restoring the filter needs a backend column, not a chip                                                                     | —                                       |
| Project card — funding bar + avatar stack       | `GET /research-projects` returns counts, not rounds or member rows; either would be an N+1 per card                                                                    | —                                       |
| Deal card — investor-confidence meter           | The old card defaulted a missing score to `50`, publishing a fabricated finding                                                                                        | —                                       |
| Cluster detail — projects born from it          | `ProblemClusterView` exposes no linked-project list, though the link table exists and the reverse direction ships                                                      | Appendix D                              |
| `/governance` — worked example statement        | Authored sample data, LABELLED as an example. Backend §11h declines to serve a real one, and a real member's row on a public page is what the design exists to prevent | never, by design (Appendix D)           |

### Phase-4/5 enum values — ✅ resolved, by deletion

Phase 0 converted every wire-relevant kebab-case union to `snake_case` (§11 "Casing on the wire").
Phase 3 finished `workshop.ts`'s `"cad-model"` → `cad_model` by deleting the file, and **phase 4
closed `proof-of-effort.ts` and `oversight.ts` the same way**. Both carried `"not-run"`,
`"flagged-for-review"`, `"artifact-grounding"`, `"exif-metadata"` and `"agreements-accepted"`;
neither was converted, because both were replaced outright by
`src/lib/rnd/proof-of-effort.schemas.ts`, whose enums are transcribed from the backend's
`src/db/schema.ts` — `not_run`, `flagged_for_review`, `artifact_grounding`, `exif_present`,
`capture_time_consistency` and the rest.

**Converting would have been the worse option**, and this is worth keeping as the rule: a hand-edited
kebab→snake sweep produces values that LOOK right and fail at runtime, because a `z.enum` mismatch is
a silent parse failure rather than a compile error. Reading them off `schema.ts` while writing the
schema file makes the same mistake impossible. This doc had three go-to-market enums wrong (§13)
precisely because they were copied from prose.

**Do not convert the slugs in the same sweep.** Kebab-case that is correct and stays: region slugs
(`east-africa`), skill slugs, supplier capability slugs (`injection-molding`), and mock entity ids. A
slug is a URL identity and kebab by backend convention; an enum value is a `pgEnum` label and
snake_case. The two live side by side in these files, and the difference is what the string _is_,
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
| `client-query` | `"use client"` island using React Query. Needs `QueryProvider`, mounted in `(home)/layout.tsx`. **Thirty-four of them.** Recount rather than trusting that number — the grep below is the authority                    |
| `props-only`   | Fetches nothing; data arrives as props. Safe on either side of the boundary                                                                                                                                            |
| `mock`         | Not wired. Renders fabricated data                                                                                                                                                                                     |

**Every count in this doc is derived, so re-derive it rather than trusting it.** These numbers have
drifted before — one section claimed "120 files, still no `client-query`" while §19 listed
twenty-eight of them:

```bash
cd src/components/home/research-and-development
find . -name '*.tsx' | wc -l
for kind in server-fetch client-query props-only mock; do
  echo "$kind: $(grep -rl "TRANSPORT: $kind" --include='*.tsx' . | wc -l)"
done
find . -name '*.tsx' -exec grep -L 'TRANSPORT:' {} \; | wc -l   # must be 0
```

The four kinds must sum to the file total, and the unlabelled count must be zero. At the time of
writing: **159 files — 22 `server-fetch`, 52 `client-query`, 85 `props-only`, 0 `mock`.**

⚠️ **THOSE NUMBERS REPLACED 137/15/34/87/1, AND THE GAP IS BIGGER THAN THE WORK THAT
CLOSED IT.** §20 added seven files; the rest had drifted unnoticed between revisions, which
is exactly why the block above says to re-derive rather than to trust. Note also that
`mock` has reached ZERO — the last fabricated leaf on this surface is gone.

### The `server-fetch` page bodies

| Body                                | Endpoints                                                                                                                                                                                                                                                                                                      | Notes                                                                                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `research-and-development-page.tsx` | `/research-projects` · `/discovery/problem-clusters?sort=opportunity` · `/discovery/market-insights` · `/open-roles`                                                                                                                                                                                           | 4 concurrent reads, one view state per rail — a dead endpoint dims one rail                                                                                       |
| `knowledge-hub-page.tsx`            | `/discovery/market-insights` · `/discovery/demand-signals`                                                                                                                                                                                                                                                     | Leaderboard renders `asOf`; empty means no scoring run, not zero demand                                                                                           |
| `problem-map-page.tsx`              | `/discovery/problem-clusters` · `/research-categories?status=approved` · `/discovery/regions`                                                                                                                                                                                                                  | Category AND region chips are Links; canvas island holds selection only                                                                                           |
| `cluster-detail-page.tsx`           | `/discovery/problem-clusters/:clusterId`                                                                                                                                                                                                                                                                       | Addressed by ID — clusters have no slug. A merged cluster links on to the one it merged into                                                                      |
| `talent-page.tsx`                   | `/discovery/talent` **(requireAuth)** · `/discovery/skills` · `/open-roles`                                                                                                                                                                                                                                    | Signed out → sign-in panel + empty grid                                                                                                                           |
| `talent-detail-page.tsx`            | `/discovery/talent/:handle` **(requireAuth)**                                                                                                                                                                                                                                                                  | Unpublished → `404` → `notFound()`, identical to a person who does not exist                                                                                      |
| `team-building-page.tsx`            | `/open-roles` · `/research-projects?stage=team_building` · `/discovery/skills` · `/discovery/talent`                                                                                                                                                                                                           | Spotlight strip has its own signed-out branch                                                                                                                     |
| `go-to-market-page.tsx`             | `/suppliers` · `/supplier-capabilities` · `/launch-ready-projects` · `/discovery/regions`                                                                                                                                                                                                                      | Repeated `?capability=` is **AND**ed in SQL                                                                                                                       |
| `supplier-detail-page.tsx`          | `/suppliers/:supplierSlug`                                                                                                                                                                                                                                                                                     | An INACTIVE supplier is a 404 — never rendered as "withdrawn"                                                                                                     |
| `import-intelligence-page.tsx`      | `/localization-assessments` · `/import-commodities` · `/import-commodity-kinds`                                                                                                                                                                                                                                | The leaderboard and the catalogue use SEPARATE filter keys (`commodityKind`, `catalogueKind`) — a shared one would make a chip in one answer the other's question |
| `commodity-detail-page.tsx`         | `/import-commodities/:hsCode` **then** `…/trade-flows` · `…/substitutes`                                                                                                                                                                                                                                       | A NULL `assessment` inside a 200 is "not scored yet"; only the commodity read's 404 is `notFound()`                                                               |
| `funding-page.tsx`                  | `/funding/deals` **(requireAuth)**                                                                                                                                                                                                                                                                             | Unpaginated on the wire. Each deal card carries the pledge island                                                                                                 |
| `governance-page.tsx`               | `/governance/summary` **(attachOptionalUser)**                                                                                                                                                                                                                                                                 | Renders signed out. Caller's own lines only; the worked example is authored and labelled                                                                          |
| `project-detail.tsx`                | `/research-projects/:slug` (public) **then** `…/roles` · `…/milestones` · `…/daily-logs` · `…/funding-rounds` · `…/investor-confidence` · `…/launch-readiness` · the three §7A reads                                                                                                                           | The public read runs FIRST and alone; its 404 is `notFound()`. Nine member-scoped reads then run concurrently                                                     |
| `proof-of-effort-page.tsx`          | `/research-projects/:slug` **then** `…/proof-of-effort` · `…/slice-ledger` · `…/equity/open-role-projection` · `…/pie-bake` · `…/effort-claims` · `…/physical-receipts` · `…/allocation-proposals` · `…/disputes` · `…/integrations` · `…/optimization-suggestions` · `…/audit-trail` · `…/audit-trail/verify` | Same ordering rule. `…/pie-bake` 404s before the bake, and that is an ABSENCE rather than a failure                                                               |
| `workshop-page.tsx`                 | `/research-projects/:slug` (public, for the header + roster) · `…/workshop` (member-only)                                                                                                                                                                                                                      | Two reads total; three write islands nested inside the tabs                                                                                                       |
| `build-log-page.tsx`                | `/daily-logs` **(requireAuth, keyset)** · `/daily-logs/streak-leaderboard` (public)                                                                                                                                                                                                                            | Its feed is now a keyset island (§13). Signed out → hero + legend + public leaderboard + **empty** feed                                                           |

### The thirty-four `client-query` islands

`client-query` was an empty category until phase 4. Every island is small and sits inside a
`server-fetch` page or a sheet. Most hold interaction state plus one or more mutations; the six in
the keyset block hold **accumulated pages and no mutation at all** — they are the one kind of island
here that exists purely to read further.

| Island                              | Writes — or, in the keyset block, the read it pages                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Proof of Effort**                 |                                                                                                 |
| `rate-lock-panel.tsx`               | propose → **member accepts** → lock, rendered as three steps because the split is the safeguard |
| `claim-submit-island.tsx`           | file a claim (`202`) · upload a receipt (`202`, multipart) · delete one. **No minutes field**   |
| `claim-detail-disclosure.tsx`       | step override (**AI Act Art. 14**) · re-verify (`202`). Polls the claim while a verdict is out  |
| `raise-dispute-island.tsx`          | raise a dispute (**GDPR Art. 22**), with a per-attempt idempotency key                          |
| `dispute-actions-island.tsx`        | vote · withdraw · resolve (`re_verified` answers `202`)                                         |
| `integration-consent-tab.tsx`       | authorize-url → provider redirect · revoke (self-only)                                          |
| `optimization-tab.tsx`              | accept · dismiss a suggestion                                                                   |
| `pie-bake-panel.tsx`                | bake the pie — irreversible, once ever, `expectedSnapshotId` echoed                             |
| **Keyset paging** (§13)             | Six lists. Each is seeded with its server page and appends — no write                           |
| `global-daily-log-feed.tsx`         | `/daily-logs` — was props-only and DROPPED the cursor it fetched                                |
| `claim-index-island.tsx`            | `…/effort-claims` — `<YYYY-MM-DD>_<id>`, keyset mode drops `pagination`                         |
| `allocation-proposals-island.tsx`   | `…/allocation-proposals` — `<epochMs>_<id>`; nests the raise-dispute island                     |
| `slice-ledger-rows-island.tsx`      | `…/slice-ledger` — `?fromSequence=`. Append-only, so OFFSET would skip equity                   |
| `audit-trail-entries-island.tsx`    | `…/audit-trail` — `?fromSequence=` over a gapless chain                                         |
| `compensation-periods-island.tsx`   | `…/compensation-periods` — `?beforeSequenceNumber=`, the one token the client derives           |
| **Compensation**                    |                                                                                                 |
| `compensation-agreement-island.tsx` | propose (founder) · accept / decline (the member) · withdraw (the proposer)                     |
| `compensation-period-island.tsx`    | finalize · countersign · supersede · record a payment · confirm receipt · export                |
| **Funding**                         |                                                                                                 |
| `pledge-island.tsx`                 | record a COMMITMENT. No card, no hold, no fee                                                   |
| `my-pledges-panel.tsx`              | the caller's own commitments, and withdrawing one                                               |
| `funding-management-island.tsx`     | round create / open / close / discard · milestone create / complete                             |
| **Projects, team, discovery**       |                                                                                                 |
| `new-idea-wizard-page.tsx`          | propose a category → create the project as a DRAFT                                              |
| `edit-project-sheet.tsx`            | edit · cover upload · publish / unpublish · stage change (its own audited route)                |
| `watch-project-button.tsx`          | follow / unfollow, idempotent by verb                                                           |
| `request-to-join-button.tsx`        | an OPEN application                                                                             |
| `apply-role-sheet.tsx`              | an application **with `openRoleId`**                                                            |
| `team-management-island.tsx`        | application inbox · invite · role CRUD + close/reopen · member role / removal · leave           |
| `application-inbox-page.tsx`        | accept / decline an invite, off `/applications/mine` and `/invites/mine`                        |
| `report-problem-sheet.tsx`          | submit a problem report (`202`)                                                                 |
| `my-problem-reports-panel.tsx`      | the reporter's own submissions, polled while any is queued — the other half of that `202`       |
| `edit-talent-profile-sheet.tsx`     | save the profile · publish / unpublish. Skills chosen from the vocabulary, never typed          |
| **Workshop**                        |                                                                                                 |
| `daily-log-composer.tsx`            | create → edit → submit a daily log (`202`), then polls the analysis                             |
| `workshop-task-composer.tsx`        | create a board task                                                                             |
| `workshop-board-controls.tsx`       | column create / rename / delete / **reorder (whole order)** · task move · task delete           |
| `workshop-file-linker.tsx`          | link a file — a URL, never bytes                                                                |
| `workshop-chat-composer.tsx`        | send a message, and mark the transcript read (guarded against a re-render loop)                 |

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
  a `.strict()` schema turns a hand-edited URL into a 422. **A filter the server cannot apply is not
  shipped at all** — phases 2–3 deleted the daily-log member filter and the build-log project/chip
  chips rather than filtering a fetched page, which lies the moment the page is capped. Eight islands
  have now stopped being islands.
- **A read behind membership needs its own view state.** `MemberScopedListViewState` /
  `MemberScopedItemViewState` add a `restricted` variant, and it is the ONE place a `404` may become a
  visible "members only" — legitimate only because the public detail read already resolved the
  project. `401` and `404` share the variant but `isSignInRequired` separates the render: a stranger
  gets a sign-in prompt, a signed-in non-member gets "this is the team's".
- **The parent read runs before its children.** On `/project/[id]` and its workshop the public detail
  read is awaited alone, so its 404 becomes `notFound()` before any member-scoped read can mistake an
  absent project for a permission problem.
- **Stored counters render their freshness.** `statsComputedAt`, `asOf` and the streak leaderboard's
  per-row `statsComputedAt` are all shown. A streak decays at midnight in the project's time zone with
  no write, so a number presented as live would be lying about its age.
- **Money is a decimal string where the column is `bigint`.** Parse with `BigInt`, never `Number`;
  `formatMoneyFromCents` accepts both and falls back to an exact unlocalized label past 2^53 cents
  rather than letting `Intl` round someone's compensation.
- **404 is the not-authorized answer.** Never render a permission hint from one; it leaks which ids
  exist.
- **A write is a `client-query` island, never a server action.** This repo talks to a separate
  Express API; there are no Server Actions and no Next API routes for business logic. Each island
  calls a wrapper in `src/lib/rnd/*.api.ts` through a hook in `src/hooks/rnd/`, which `unwrap`s the
  tagged result into the exception React Query needs and invalidates keys from the ONE factory in
  `src/hooks/rnd/keys.ts`.
- **A `202` is never rendered as a result.** Claim submit, re-verify, receipt upload, problem-report
  submit and a `re_verified` dispute resolution all answer 202: the row exists, the verdict does
  not. The UI says "we have it, we are checking" and polls the detail read — on this surface an
  optimistic verdict is an optimistic equity split.
- **An idempotency key is minted once per ATTEMPT, in state.** Claim submit, receipt upload, dispute
  raise and payment record all take one. A key regenerated inside the submit handler defeats the
  mechanism, because the retry that duplicates the row is the same click.
- **No mutation is optimistic.** Every one of these writes is an attestation about money, equity or
  consent. Showing one as done before the server agreed puts a claim in front of someone that nobody
  has actually made.
- **A `409` is usually a finding, not a retry.** `RATE_NOT_LOCKED`, `SNAPSHOT_STALE`,
  `UNSETTLED_ALLOCATIONS`, `RECEIPT_CITED`, `CHAIN_BROKEN` and `STATEMENT_CHAIN_BROKEN` each mean
  something specific the user can act on, so `MutationErrorNotice` shows the backend's own message
  and code rather than paraphrasing it into "something went wrong".
- **Every dynamic route declares `generateStaticParams`, and never an empty one.**
  `cacheComponents` fails the build on an empty list, while every read here returns `[]` rather than
  throwing so an unreachable backend cannot break CI. `withSentinelValues`
  (`src/lib/rnd/static-params.ts`) reconciles the two: no rows means one unresolvable param, which
  the route renders as `notFound()`.

---

## 20. Import Intelligence & AI-Driven Localization

**✅ Built, both sides.** The backend is `R_AND_D_BACKEND_STRUCTURE.md` §10A (six tables,
ten enums, migrations 0162–0163, three jobs) and §11m (six reads, three moderator writes),
with 251 tests. This side is two `server-fetch` bodies, five `props-only` sections, one
card, a schema module, an api module and a formatter.

That ordering was deliberate. Building this side against a contract nobody had run would have meant
negotiating it twice — and it would have missed the two things only a live API call established:
that Comtrade's `partnerCode=0` alone returns a partner breakdown rather than one row per commodity,
and that a country's import bill in cents (14,038,629,964,550 for India's largest line) is far past
what a JSON number carries without rounding.

### What it is

The pipeline ends at `/go-to-market`, where a founder picks a supplier and lists a product. Nothing
upstream of it answers the question that decides whether a venture is worth starting: **what does
this country already buy from abroad, and could it be made here instead?**

Three layers, and the surface renders them as three:

1. **Import volumes** — country-level, per HS6 commodity, every figure carrying its own source.
2. **Domestic substitutes** — the material or component that could replace the import, and the
   `supplier_capability` that would make it, which is the join into the §4c.4 directory.
3. **A feasibility assessment** — a deterministic 0–100 score with its four component sub-scores,
   plus an LLM-written pathway narrative over a score the model did not compute.

### Routes

```text
⏳ /research-and-development/import-intelligence            commodity index + feasibility leaderboard
⏳ /research-and-development/import-intelligence/[hsCode]   one commodity: flows, substitutes, assessment
```

**A sibling of `/knowledge-hub` and `/problem-map`, not a seventh pipeline stage.** It is not a step
a founder walks through — it is a reference surface consulted before and during the early stages, in
the same way the knowledge hub is. Making it stage 07 would also mean extending
`pipeline-stages-strip.tsx`'s `STAGE_BACKGROUND_TINT_CLASSES` ramp and renumbering a sequence three
other files cite, and it would put a lookup tool inside a sequence.

**It is not folded into `/go-to-market` either.** That page already carries a hero, an explainer, a
readiness checklist, a filtered supplier directory and a launch-ready rail; adding a second
filterable dataset to it makes an already-dense surface unreadable, and the two are consulted at
opposite ends of the pipeline.

**`[hsCode]`, and it stays six digits.** An HS code is issued by the World Customs Organization and
is already a stable public identity. It is not slugified — not in the path, not in a query key, not
on the wire. §11's kebab-case rule covers identities this platform mints, and this is not one.

### Endpoints, per route

| Frontend route                  | Endpoints                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/import-intelligence`          | `GET /localization-assessments` · `/import-commodities` · `/import-commodity-kinds` · `/discovery/regions` · `/research-categories?status=approved`          |
| `/import-intelligence/[hsCode]` | `GET /import-commodities/:hsCode?reporterCountryCode=` **first** — its `404` is `notFound()` — then `…/trade-flows?flowKind=` · `…/substitutes` concurrently |

All public (`attachOptionalUser` on the backend). The same ordering rule every detail page on this
surface follows: the read that decides whether the page exists at all runs first and alone.

### Planned files and their `TRANSPORT:` banners

The two page bodies now carry rows in §19; the `props-only` sections do not, because §19
lists page bodies and write islands rather than every leaf.

| File                                                                    | Planned banner |
| ----------------------------------------------------------------------- | -------------- |
| `components/home/research-and-development/import-intelligence-page.tsx` | `server-fetch` |
| `components/home/research-and-development/commodity-detail-page.tsx`    | `server-fetch` |
| `sections/localization-leaderboard.tsx`                                 | `props-only`   |
| `sections/commodity-directory.tsx`                                      | `props-only`   |
| `sections/trade-flow-table.tsx`                                         | `props-only`   |
| `sections/substitute-list.tsx`                                          | `props-only`   |
| `sections/feasibility-score-panel.tsx`                                  | `props-only`   |
| `sections/localization-pathway-panel.tsx`                               | `props-only`   |
| `cards/commodity-card.tsx`                                              | `props-only`   |
| `rails/import-intelligence-rail.tsx`                                    | `props-only`   |

**No `client-query` island and no `src/hooks/rnd/import-intelligence.ts` in this phase.** The three
writes §11m defines are all `moderate_taxonomy` — they belong to an admin surface, not to this one.
A hook with no caller is unverified code, and the audit in the phase note above exists to catch
exactly that; the rule is to wire it to a control or not write it.

**Every filter is a `Link`, because the backend applies it.** `commodityKind`, `categoryId`,
`reporterCountryCode` and `periodKind` all live in the query string and are read with the existing
helpers — `readEnumParam`, `readSingleParam`, and `readPatternParam(sp, "reporterCountryCode",
/^[A-Z]{2}$/)`, which `src/lib/filter-href.ts:66` already carries for exactly this ISO-2 shape. A
filter the server cannot apply is not shipped at all.

### Data shapes

`src/lib/rnd/import-intelligence.schemas.ts` and `.api.ts`, beside the others, following
`suppliers.*` exactly: enum tuples `as const` → `z.enum` → type, every object `.strip()`, filter
interfaces as plain `readonly` TS rather than Zod. Reads go through `getPaginated` / `getJson` from
`src/lib/http.ts` with `callerRequestOptions()` forwarded from the page body.

Units, per §11 — none of these is negotiable and all of them are on the wire already agreed:

| Field                                                                                                                                                                                                       | Shape                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `importValueInCents` + `currency`                                                                                                                                                                           | **decimal string** over a `bigint` column. Parse with `BigInt`, never `Number`                                                                           |
| `quantityMilli` + `quantityUnit`                                                                                                                                                                            | integer milli-units + a unit enum. The client composes the label, exactly as `formatMarketInsightStat` does for `statValueMilli` (`discovery-format.ts`) |
| `feasibilityScorePoints`, and `importDependencyPoints` (0–35) · `exportCapabilityPoints` (0–25) · `substituteAvailabilityPoints` (0–20) · `supplierCapacityPoints` (0–12) · `leadTimeAdvantagePoints` (0–8) | integer. **FIVE** components, and a database CHECK guarantees they sum to the total — so the UI renders "27 of 35" without re-deriving anything          |
| `confidenceBps`                                                                                                                                                                                             | integer basis points, `10000` = 100%, **nullable**                                                                                                       |
| `medianSupplierLeadTimeDays`                                                                                                                                                                                | integer, **nullable**                                                                                                                                    |
| `asOf`, `decidedAt`                                                                                                                                                                                         | ISO-8601 UTC                                                                                                                                             |
| `periodStartsDate`, `periodEndsDate`, `sourcePublishedDate`                                                                                                                                                 | ISO-8601 date-only `YYYY-MM-DD`                                                                                                                          |
| `commodityKind`, `substituteKind`, `maturityLevel`, `periodKind`, `dataOrigin`, `status`                                                                                                                    | `snake_case`, byte-identical to the backend `pgEnum` labels                                                                                              |
| `hsCode`                                                                                                                                                                                                    | six digits                                                                                                                                               |

New `Record<Enum, string>` maps go in `src/lib/rnd/labels.ts`. A unit suffix map and the
milli-composition go in a new `src/lib/rnd/import-format.ts`, modelled on `discovery-format.ts` —
`format.ts` stays free of domain-specific composition.

### Rules this surface adds, and one it inherits loudly

- **Null is not zero, and here it is the whole point.** A commodity with no `commodity_trade_flow` row
  has **no import data recorded** — it is not a commodity nobody imports. A null
  `medianSupplierLeadTimeDays` means no supplier published one. A null `confidenceBps` means no
  confidence was recorded, not zero confidence. `formatScorePoints` already renders "Not computed
  yet" for a null score and is the precedent for all four.
- **Every figure renders its source.** `sourceName` and `sourcePublishedDate` ride on every trade
  flow row and are shown beside the number, not in a footnote. A country-level import figure with no
  visible provenance reads as a platform assertion.
- **The assessment renders `asOf`, and an empty leaderboard means no scoring run.** Same rule the
  knowledge hub's demand leaderboard follows: a stored counter renders its freshness, and an absent
  one is an absence rather than a finding of zero.
- **The narrative always shows its provenance** — `modelName`, `promptVersion`, `confidenceBps` —
  and always beside the deterministic score it is describing. The house rule is `optimization-tab.tsx`'s
  and it is unchanged here: **a machine opinion whose origin is hidden reads as a platform ruling.**
  The score is arithmetic and the prose is advisory, and the UI must not let a reader confuse which
  is which.
- **`narrativeStatus: "skipped_unconfigured"` renders as a state, not an error.** It means this
  environment has no model key. The panel says the score stands and the narrative was not generated;
  it does not show a failure a founder cannot act on.
- **Money is a decimal string.** `importValueInCents` comes off a `bigint` column and an import bill
  for a country overflows `Number.MAX_SAFE_INTEGER` in cents faster than anything else on this
  surface. `BigInt`, then `formatMoneyFromCents`, which already accepts one.

### Registration, when the routes land

| Where                                | What                                                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/home/layout/navbar.tsx`  | `RESEARCH_AND_DEVELOPMENT_SUBPAGES` — otherwise the breadcrumb reads "Import intelligence" from `prettifySlug`, which is close but not the title                                                 |
| `app/sitemap.ts`                     | `STATIC_PUBLIC_PATHS`, the R&D block                                                                                                                                                             |
| `lib/sitemap-sources.ts`             | a `"use cache"` commodity enumerator beside `getSupplierSitemapEntries`, appended to `SITEMAP_SOURCES` — **which runs sequentially**, never `Promise.all`, on the backend's 20-connection budget |
| `lib/roadmap/site-roadmap.ts`        | `kind: "planned"` until the page exists, then `kind: "route"` + a `kind: "dynamic"` child                                                                                                        |
| `components/home/layout/sidebar.tsx` | **not added.** The four stage routes are deliberately absent from the sidebar and this is a sibling of them, reached from the landing rail                                                       |

### Deliberately not built

- **No tariff or duty display.** Rates are jurisdictional and dated; a stale one is worse than none.
- **No landed-cost figure.** It needs a per-supplier price, and §4c.4 refuses to invent one — a
  supplier belongs to no project, so a directory-level price would have to invent a currency too.
- **No commodity↔project pin.** `research_project_commodity_link` is what turns this dataset into
  per-project advice, and it is the phase after this one.
- **No moderator UI.** §11m's three writes are `moderate_taxonomy` and belong to the admin console.
