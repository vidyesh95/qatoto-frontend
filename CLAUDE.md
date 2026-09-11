# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Next.js 16 (App Router) on React 19 with the React Compiler. Turbopack is used for both `dev` and `build`. Tailwind v4 via `@tailwindcss/postcss`. TypeScript strict. Package manager is **pnpm** (Node >= 24.13.1, pnpm >= 10.29.3).

`next.config.ts` enables `reactCompiler: true` and `cacheComponents: true`, plus `experimental.turbopackFileSystemCacheForDev`. `cacheComponents` is what makes the `"use cache"` directive (see `src/lib/cms.ts`) valid — do not strip it.

## Commands

```bash
pnpm dev                              # next dev --turbopack (https via localhost.pem)
pnpm build                            # next build --turbopack
pnpm start                            # production server
pnpm lint                             # oxlint (type-aware, see .oxlintrc.json)
pnpm lint:fix                         # oxlint --fix
pnpm fmt                              # oxfmt write
pnpm fmt:check                        # oxfmt check (CI)
pnpm test                             # vitest run (unit tests, run once)
pnpm test:watch                       # vitest (watch mode)
pnpm exec vitest run src/lib/cms.test.ts   # single unit-test file
pnpm exec playwright test             # all E2E (chromium + firefox + webkit)
pnpm exec playwright test --project=chromium
pnpm exec playwright test tests/navigation-and-signin.spec.ts   # single file
pnpm exec playwright test --ui        # interactive
```

Two test runners, kept strictly apart:

- **Vitest** — unit + component tests. Config in `vitest.config.mts` (the Next.js-recommended setup: `@vitejs/plugin-react`, `resolve.tsconfigPaths` for the `@/*` alias — Vite's native replacement for the `vite-tsconfig-paths` plugin, which is **not** a dependency here — `jsdom` environment, React Testing Library). Test files use the **`.test.ts` / `.test.tsx`** suffix and live **next to the code** under `src/**` (or under `tests/unit/`). Vitest's `include` is scoped to those globs and `exclude`s `tests/specs/**`. Add new unit/component tests here when the logic is testable without a real browser.
- **Playwright** — E2E in `tests/specs/**/*.spec.ts` (the **`.spec.ts`** suffix; Playwright's `testDir` only scans `tests/specs`, never `src/`). It does **not** auto-start a dev server (`webServer` is commented out in `playwright.config.ts`); run `pnpm dev` separately before `playwright test`.

The two suffixes (`.test.ts` for Vitest, `.spec.ts` for Playwright) are load-bearing — they keep each runner from picking up the other's files. Don't name a Vitest file `*.spec.ts` or put it under `tests/specs/`.

Note `package.json` script is `fmt`, but `CONTRIBUTING.md` references `pnpm run format` — the working command is `pnpm fmt`.

## Architecture

### Route groups under `src/app/`

The App Router is organized into four parenthesized **route groups** — these do not appear in URLs, they exist only to scope layouts:

- `(auth)` — sign-in, sign-up, forgot-password, sign-in-with-password. No shared chrome.
- `(home)` — the main app shell. `(home)/layout.tsx` wraps children in `SidebarProvider` + `Navbar` + `Sidebar`. All top-level product surfaces (`/blueprints`, `/cart`, `/library`, `/store`, `/history`, `/listings`, `/sales`, `/research-and-development`, etc.) live here and inherit that chrome.
- `(disclaimers)` — legal/policy pages with their own layout.
- `(information)` — marketing pages (about, blogs, careers, contact-us, creator, developers, how-qatoto-works, press). Blogs and press have `[slug]` dynamic routes.

`src/app/layout.tsx` is the root — sets up Geist Sans/Mono + Roboto Serif via `next/font/google` and injects `react-grab` + `react-scan` `<Script>` tags **only when `NODE_ENV === "development"`**. Do not touch those gates without intent — they must never ship to production.

### Components mirror routes

`src/components/{auth,disclaimers,home,information}/*.tsx` hold the page bodies. `src/app/.../page.tsx` files are typically thin shells that import the matching component. When adding a new route, follow this split: keep the `page.tsx` minimal and put the markup in `src/components/<group>/`.

### Shared state

`src/state/` holds **four** cross-component client contexts. This section used to claim there was one; that stopped being true some time ago and is corrected here rather than left to mislead:

| Context                                                  | Mounted by          | Scope                                                                  |
| -------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------- |
| `sidebar-context.tsx` — `{ isCollapsed, toggleSidebar }` | `(home)/layout.tsx` | `(home)` only, so `useSidebar` is **not** available outside that group |
| `browser-preferences-context.tsx`                        | `app/layout.tsx`    | App-wide. The **only** context that persists — see below               |
| `queue-context.tsx` — the play queue                     | `(home)/layout.tsx` | `(home)` only. In-memory, dies with the tab                            |
| `admin-audit-log-context.tsx`                            | `(admin)`           | Admin console only                                                     |

Two rules that go with them:

- **A client provider in a layout does NOT make `{children}` client.** `app/layout.tsx` records this for `BrowserPreferencesProvider`, and it is why these can be composed in a server layout.
- **`browser-preferences-context` is the only one that may touch storage**, through `src/lib/browser-preferences.ts` and its single key `qatoto.browser-preferences`. That "one key" is a claim `privacy-policy.tsx` makes to readers and `data-and-privacy-panel.tsx` offers erasure of, so a second key makes both wrong. A new context that wants persistence folds into that blob or does without — the queue does without, deliberately.

### CMS layer

`src/lib/cms.ts` is the only data-fetching module. It reads `QATOTO_CMS_URL` from env; if unset or the upstream fetch fails, every function falls back to the in-file `MOCK_BLOGS` / `MOCK_PRESS` arrays. All getters are annotated with the `"use cache"` directive — they rely on `cacheComponents` in `next.config.ts`. Keep new CMS getters in this file and follow the same fallback pattern; don't introduce parallel fetchers elsewhere.

### Path alias

`@/*` → `src/*` (see `tsconfig.json`). Always import via `@/...`, not relative `../../`.

### MCP

`.mcp.json` registers the `next-devtools` MCP server (`pnpm dlx next-devtools-mcp@latest`). Use it for Next-specific introspection when available.

## Core principle: thin client, untrusted frontend (NON-NEGOTIABLE)

This frontend is a **thin, untrusted presentation layer**. The backend is the single source of truth and does all heavy and all security-sensitive work. Every agent (Claude, Gemini, etc.) and every contributor must hold this invariant. The same rules live in `AGENTS.md` and `GEMINI.md` — keep all three in sync if you change them.

### Trust boundary — the client is hostile

- The shipped frontend is fully visible and editable by anyone: users can read all client JS, edit it in DevTools, and forge, replay, or tamper with any request to the backend. **Treat every byte that arrives from a client as attacker-controlled.**
- **Never** enforce authentication, authorization, validation, pricing, inventory, rate limits, or any business rule on the frontend _alone_. Client-side checks exist only for fast UX feedback. The backend **must independently re-validate and re-authorize every request** and is the only authority.
- **Never trust client-supplied identity, role, permissions, price, quantity, totals, or location/country.** The server derives or re-verifies these. Example in this repo: the browse-location/country selector (`src/components/home/account/menus/location-menu.tsx`) is a **display preference only** — the backend must not trust a client-claimed country for fraud signals, geo-restriction, tax, or pricing; re-derive server-side (IP, verified account region, payment country).
- **No secrets in the frontend** — no API keys, private tokens, or confidential business logic in client code or the client bundle. Only short-lived, scoped session credentials.
- All mutations: the server validates input schema, ownership, permissions, and rate limits before acting.

### Performance — keep the client light and ultrafast

- Push heavy or expensive work to the Express backend: large-list sorting & filtering, aggregation, ranking, recommendations, search over big datasets, media processing, anything CPU- or data-heavy. The client renders results; it does not compute them.
- This repo is a pure frontend (Next.js) that talks to a **separate Express REST API** — do not introduce Server Actions or Next.js API routes for business logic. All data mutations go through the Express backend via `fetch()`.
- Keep `"use client"` components small and focused on interaction. Ship the minimal client JS needed.
- When adding a feature, ask: _does this logic need to be trusted, or is it heavy?_ If yes to either, it belongs in the Express backend. The frontend gets only render + light interaction.

## Frontend architecture rules (Rust-inspired)

Goals: UI predictability, no illegal visual states, safe parsing of API responses without blindly trusting the network. Mirrored in `AGENTS.md` and `GEMINI.md` — keep all three in sync.

### Pattern 1: No loose UI states (discriminated unions)

Never model page/component state with a bag of optional fields + loose booleans (`isLoading`, `isError`, `data?`, `errorMessage?`). That allows impossible combinations (loader + error simultaneously). Model UI state as a **discriminated union** and render with an **exhaustive `switch`** that has a `never` default — adding a new variant becomes a compile error until the UI handles it.

❌ Bad — flaky state machine:

```typescript
interface DashboardProps {
    isLoading: boolean;
    isError: boolean;
    data?: ProjectData[];
    errorMessage?: string;
}
```

✅ Good — deterministic states + exhaustive render:

```typescript
type DashboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; data: ProjectData[] };

export default function Dashboard({ state }: { state: DashboardState }) {
  switch (state.status) {
    case "loading":
      return <Spinner />;
    case "error":
      return <ErrorBanner message={state.message} />;
    case "empty":
      return <EmptyState />;
    case "success":
      return <DataGrid items={state.data} />;
    default: {
      const _exhaustiveCheck: never = state;
      return _exhaustiveCheck;
    }
  }
}
```

### Pattern 2: Defensive boundary parsing (Zod, no `as`, no `any`)

The Express backend owns data truth, but the network is untrusted. **Never** use type assertions (`as MyType`) or `any` on response payloads. Treat every network payload as `unknown` and parse with Zod. Use `.strip()` so the frontend silently ignores unknown fields added by a backend minor release instead of crashing.

```typescript
import { z } from "zod";

const UserProfileSchema = z
    .object({
        id: z.string(),
        email: z.string().email(),
    })
    .strip(); // ignore unknown fields — forward-compatible with backend additions

async function fetchUserProfile(userId: string) {
    const response = await fetch(`/api/users/${userId}`);
    const rawData = await response.json();

    const parsed = UserProfileSchema.safeParse(rawData);
    if (!parsed.success) {
        return { success: false, error: "Client-side contract validation failed" };
    }

    return { success: true, data: parsed.data };
}
```

### Pattern 3: Treat server failures as values

Do not rely on implicit success or component-level `try/catch` to model failure from the Express API. Failures are **data**, returned as a tagged result. Component code branches on `success` and never needs to guess whether an error was swallowed upstream.

```typescript
type ActionResponse<T> =
    { success: true; data: T } | { success: false; error: { code: string; message: string } };
```

Combine with Pattern 1: lift `ActionResponse<T>` into the component's `DashboardState`-style union so the UI for each error code is explicit and exhaustive.

## Conventions

From `CONTRIBUTING.md`:

- **Commits**: Conventional Commits, imperative mood, **lowercase**. e.g. `feat: add user authentication`, `fix: resolve login bug`.
- **Naming**: PascalCase classes/components, camelCase vars/functions/file names, kebab-case directories.
- Run `pnpm fmt` (oxfmt) before opening a PR.

### Naming — descriptive, self-documenting (NON-NEGOTIABLE)

Names are the primary documentation. A reader (human or agent) must understand what a thing is from its name alone, without tracing where it came from. Mirrored in `AGENTS.md` and `GEMINI.md` — keep all three in sync if you change them.

- **No single-letter or cryptic names.** Never `a`, `b`, `c`, `x`, `tmp`, `data`, `val`, `arr`, `obj`, `fn`, `el`, `res`, `req`. The only exceptions: a math/coordinate context where `x`/`y` are the domain term, and the index `i` in a trivial counting loop (prefer `index` even there).
- **Variables are nouns that name the contents**, not the type or shape. `selectedProductIds` not `ids`; `cartSubtotalInCents` not `total`; `isCheckoutDisabled` not `flag`. Include the unit when it matters (`delayMs`, `priceInCents`, `widthPx`).
- **Booleans read as a yes/no question** — prefix `is`/`has`/`should`/`can`: `isLoading`, `hasNextPage`, `shouldShowBanner`, `canEditProfile`. Never a bare noun for a boolean.
- **Functions are verb phrases** that say what they do and return: `fetchUserProfile`, `formatPriceLabel`, `buildBreadcrumbTrail`. Event handlers: `handle<Thing><Event>` (e.g. `handleAddToCartClick`). Boolean helpers read as predicates: `isEmailValid`, `hasActiveSubscription`.
- **No unexplained abbreviations.** Spell it out: `button` not `btn`, `image` not `img`, `description` not `desc`, `category` not `cat`, `quantity` not `qty`, `response` not `res`. Only universal acronyms stay (`id`, `url`, `html`, `api`, `cms`).
- **Callback params get real names** — `.map((product) => …)` not `.map((p) => …)`; `.filter((order) => …)` not `.filter((o) => …)`.
- **React specifics**: components are PascalCase nouns naming the rendered thing (`ProductCarousel`, `CheckoutSummary`); props mirror these rules; custom hooks start with `use` + what they return (`useCartTotals`, `useSidebar`).
- **Length scales with scope.** A 2-line block can use a short local; anything crossing a function boundary or exported must be fully descriptive. When unsure, choose the longer, clearer name — verbosity costs nothing, ambiguity costs debugging time.

If a name needs a comment to explain what it holds, the name is wrong — rename it instead of commenting.

### Naming — wire casing (NON-NEGOTIABLE)

Four different casings coexist, on purpose. Which one applies depends on **what the string is**, not
on where it appears. Mirrored in `AGENTS.md` and `GEMINI.md` — keep all three in sync.

| Surface                          | Casing         | Example                                                    | Why                                                                                                            |
| -------------------------------- | -------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Path segments & directories      | **kebab**      | `/research-and-development/go-to-market`                   | The one place kebab is a genuine web convention — URL tokenizers treat `-` as a word break and `_` as a joiner |
| Slugs (URL identities)           | **kebab**      | `solar-cold-storage` · `east-africa` · `injection-molding` | Server-generated and public. A slug is linked to the moment it exists, so it is unwritable after creation      |
| Query keys & JSON fields         | **camelCase**  | `?minOpportunityScorePoints=80`                            | Matches the response body field names — one spelling across request and response                               |
| Enum values (query **and** body) | **snake_case** | `?stage=team_building` · `{ "stage": "team_building" }`    | They are Postgres `pgEnum` labels, sent verbatim in both directions                                            |

The rule underneath all four: **one spelling per concept, in both directions of the exchange.**

> **Do not "correct" a `snake_case` enum value to kebab-case.** These are not identifiers — they are
> data that must byte-match the backend's `pgEnum` labels. `z.enum(["full_time"]).safeParse("full-time")`
> fails, `stage === "team_building"` is `false` against `"team-building"`, and `?stage=team-building`
> is a **422** from the backend's `.strict()` query schema rather than an ignored value.
>
> The authority is `src/db/schema.ts` in the backend repo and the service view interfaces beside it —
> **never a doc**, which drifts. `src/lib/rnd/shared.schemas.ts` holds the frontend's copy of these
> tuples, and `src/lib/products/schemas.ts` is the older precedent (`home_kitchen`,
> `anime_collectibles`).

Kebab-case is still correct for **file names, directory names, path segments and slugs** — none of
which changed. A file called `discovery.schemas.ts` exporting `"team_building"` is following both
rules at once, not contradicting itself.

### Tests — do not write unless explicitly asked

**Do not write, add, or modify tests unless the user explicitly asks for them.** This applies to unit tests (Vitest), E2E tests (Playwright), and any other test files. Do not create test files as part of a feature implementation, bug fix, or refactor. Do not suggest writing tests unless the user requests it.

## The Blueprints hub replaced /anime (mock, deliberately)

`/anime` was RETIRED. It is now `/blueprints` — engineering teardowns (70%), working
prototypes (20%) and manufacturing case studies (10%) — and `next.config.ts` 308s `/anime`
and `/anime/:path*` at the routing layer.

**THE SURFACE IS SEVEN READING ROUTES PLUS A RESOLVER, not two, with forms beside them.** Each of
the three kinds has its own index and its own detail layout, because a teardown, a launch and a
manufacturing lesson are not browsed the same way. The forms (`teardowns/new`, `showcase/new` and a
teardown's `report`) are covered by the rules below the table:

| Route                                  | Design                                                                                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/blueprints`                          | Hub — header, hero, then three lanes in three DIFFERENT shapes, each with its question and one **See all**                                                                                              |
| `/blueprints/teardowns` + `/[slug]`    | Thumbnail grid of DECISION-SET cards; detail carries provenance, composition, the market signal, the media, the files, the exploded-view engine and the handoff. `?view=business\|engineering\|factory` |
| `/blueprints/showcase` + `/[slug]`     | Launch feed — `?sort=newest\|top`, newest `launchedAt` by default; sort in `listShowcases`; TWO reserved inert slots                                                                                    |
| `/blueprints/showcase/new`             | Post a launch: one page of sections, a square heading image checked in the browser and never uploaded, two statements. Mock-backed, see the rehearsal rule                                              |
| `/blueprints/case-studies` + `/[slug]` | Hairline lesson list, each row an expandable `<details>`; detail is a fixed-order report                                                                                                                |
| `/blueprints/[slug]`                   | **Redirect resolver only** — no content, no metadata                                                                                                                                                    |

⚠️ **The resolver CANNOT move to `next.config.ts`.** Its destination depends on the row's
`category`, which a static rewrite rule cannot know — `/anime` got its redirects there precisely
because that mapping _was_ static. And note what it actually costs: under `cacheComponents` a
redirect from a page component does **not** emit a 308 header. The static shell has already
flushed, so Next sends `<meta http-equiv="refresh">` and the browser lands correctly after a
visible pause. This is measured and written up at `src/app/(home)/store/[...slug]/page.tsx:25-30`.

**The hub is mock and that is a decision, not an oversight.** `src/mocks/blueprints-mocks.ts`
holds 32 invented builds across three arms — 12 teardowns, 10 showcases, 10 case studies. The ten
showcases are dated into the three weeks before 2026-09-08 so that Newest and Top visibly differ and
both orders page; the literals drift into the past and that is accepted.
⚠️ **That is NOT the 70/20/10 split and is not meant to be**: the ratio is a target for real
content, and applied to fixtures it gave two showcases and two case studies, which does not
exercise either design. ⚠️ **There are TEN case studies, two per discipline, and that count replaced
an older rule.** It used to be exactly five, one per `BLUEPRINT_DISCIPLINES` entry, because each card
carried a discipline TINT and a discipline with no fixture was a colour nobody ever saw. The tint is
gone — see the case-study row below — so the count is set by the list instead: two per discipline is
what makes a filtered view show more than one row, and ten against a page limit of six is what makes
the paging control render.
The surface inherits the caveat `todo.md` recorded against `/anime`
verbatim — _a vertical you cannot fill should not ship_ — so the surface is **de-indexed**: it is
absent from `src/app/sitemap.ts` AND both routes carry `robots: { index: false, follow: false }`.
Both halves are needed, because the sidebar and mobile nav link the hub, so a sitemap omission
alone stops nothing (`robots.ts` says exactly this at the top). **Restoring both is the launch
step** when real blueprints exist — miss one and the surface either ships invisible or ships
indexed-while-fabricated.

Rules specific to this surface — it says "three" nowhere any more because there are seven, and a
count in a heading is a thing that goes stale the first time somebody adds one:

- **Components never import the fixtures.** Everything goes through `src/lib/blueprints/api.ts`,
  whose `"use cache"` getters mirror `src/lib/cms.ts`. `/anime` was wired the other way — its
  components imported `@/mocks/anime-mocks` directly — and that is precisely why swapping it to
  real data was a component rewrite rather than a one-file edit. Do not reintroduce that.
- **`Blueprint` is a DISCRIMINATED UNION on `category`, not one flat shape.** Each arm carries
  what its surface needs — a teardown's `walkthroughVideo`/`documents[]`, a showcase's
  `launchedAt`/`team[]`/`upvoteCount`, a case study's `oneLineAction`/`problem`/`actionSteps[]`/
  `pitfalls[]`/`sources[]`/`outcomeMetrics[]`. `difficulty`, `cadFormat` and `billOfMaterialsCostRange` stay SHARED
  because a rail card renders them for every category; arms only add. Build every URL with
  `buildBlueprintHref` — never by hand. `upvoteCount` is display-only and no vote button ships:
  a counter a client increments is a business rule on an untrusted layer. It renders as
  `ShowcaseVoteBox`, a bare stacked caret-over-count `<span>` in a fixed 40×44 gutter.
  ⚠️ **THE TEARDOWN ARM CARRIES TWO MORE OF THESE**, `commentCount` and `saveCount`, and they are
  display-only for the same reason — every engagement table in the backend is hard-FK'd to
  `video.id` or `product.id`, every route param is `z.uuid()`-gated so a kebab slug 422s before a
  query runs, and no blueprints content table exists for a row to reference. With `likeCount` they
  render in `TeardownEngagementBar` as `BlueprintStatReadout` spans — three inert counts beside
  ONE real control, Share, which navigates and writes nothing. **Do not assume they are wired**,
  and do not turn any of the three into a `<button>` before the tables exist (todo.md §Blueprint
  engagement). Share opens `ShareSheet` with `onShared` OMITTED: that callback exists to move
  `video_share.videoId`, which a blueprint has no row for.
- **THE HUB RENDERS THREE ARMS THREE WAYS, AND NEVER AGAIN AS THREE RAILS.** It used to be an icon
  row (`CategoryLinks`, three identical icon-and-heading cells) over three `BlueprintRail`s of
  identical `BlueprintCard`s — the two shapes `docs/Design.md` §6 bans by name, one after the other.
  All three components are DELETED. A teardown previews as a thumbnail grid because "what is it" is
  a picture, a case study as a line of text because "what did they learn" is a sentence, a showcase
  as a dated row because "what's new" is a chronology; `BlueprintLane` carries the heading, the
  question that arm answers (`BLUEPRINT_CATEGORY_QUESTIONS`) and the single way through.
  ⚠️ **The lanes read the THREE TYPED GETTERS, never `listBlueprints` plus a group-by.** That is a
  correctness rule, not a preference: the old hub sorted every arm by `createdAt`, so its showcase
  rail was in a different order from the feed it linked to, which sorts by `launchedAt`. One arm in
  two orders, and the hub had the wrong one.
  ⚠️ **The hub ships no client JavaScript of its own** now that the rail's `useRef` scroller is
  gone. Only the hero is a client component. Do not reintroduce a horizontal scroller here.
  **The hero was NOT demoted.** It is 328x184 from `md` up and was never a banner there; it is
  also the only real network read on the surface. It comes AFTER the header in source order and
  has a mobile height cap (`h-44`, since `aspect-video w-full` is 225px of rotating image above the
  fold on a phone). From `lg` up the header and hero share ONE MASTHEAD ROW, hero on the right,
  because left-aligned under the header it had ~870px of empty ground beside it at 1440.
  `anime_hero_slide` carries no dimensions, so that is CSS only.
  **Each lane opens on an inset hairline and owns the gutter**, so lane children carry no `px`.
  From `xl` the case-study and showcase lanes share a row, but only when BOTH have rows. The hub's
  launch rows are `ShowcaseLaunchLink`, a compact sibling of `ShowcaseFeedRow` on the
  `CaseStudyLessonLink` precedent; it keeps both reserved engagement positions unchanged.
  ⚠️ **`loading-skeleton.tsx` mirrors this order and must move with it** — it drew four circles for
  the deleted icon row, which is a skeleton promising a control that no longer exists.
- **THE SHOWCASE ROW RESERVES TWO ENGAGEMENT POSITIONS AND BUILDS NEITHER.** The vote is a fixed
  40x44 gutter holding a `<span>`; the comment count is a fixed slot in the meta line, sitting
  immediately after the date because everything below it on that line ("built from a teardown", the
  tags) is CONDITIONAL — a slot that lands somewhere different on every row is not a reserved slot.
  Neither is a control and no endpoint exists for either.
  ⚠️ **"Wiring is a swap, not a rebuild" is MEASURED, not assumed**: exchanging the vote `<span>`
  for a `<button>` with the same classes leaves the box at an identical rect, because Tailwind's
  preflight already strips a button's border, background and font. Do not turn either into a
  `<button>` before the tables exist (todo.md §Blueprint engagement).
  **Zero renders nothing**, not "0 comments" — seven of the ten fixture launches have no discussion
  and that is the ordinary state of a new launch.
  ⚠️ **DO NOT ADD COPY SAYING COMMENTS ARE CLOSED.** They are not: `BlueprintCommentThread` renders
  a real one-level thread and the launch byline counts it, as a link to `#discussion`. The missing affordance is a
  COMPOSER, and that is disclosed ONCE, above the thread on the detail page, never per row.
- **THE TEARDOWN ARM IS A CLEAN-ROOM RECORD, AND THE CONTRACT IS THE GUARANTEE.** A teardown is an
  EMPIRICAL SURVEY OF A LEGALLY ACQUIRED, OFF-THE-SHELF COMMERCIAL UNIT. There is no field for a
  vendor's drawing, an internal document or a file handed over under an NDA — a shape that cannot
  express a leak is stronger than a policy page asking for one not to be uploaded.
  ⚠️ **THE APPROVED VOCABULARY IS `Independent dimensional survey`, `Empirical teardown analysis`
  and `Material spectroscopy & alloy analysis`, and `OEM CAD`, `Original blueprints`,
  `Factory drawings` and `Proprietary specs` ARE BANNED STRINGS.** Each names material this pipeline
  must never carry, and a label is what a reader believes.
  **The origin block renders ABOVE the bill of materials and above every file**, in all three views:
  the files are what a reader takes away, and a provenance claim after them is a disclaimer, which
  is a thing readers have already scrolled past. **Nothing in it says Qatoto checked anything** — no
  patent search, no clearance opinion, no verification of the publisher's account of their own bench.
  ⚠️ **THE ORIGIN BLOCK IS TWO COMPONENTS AND THE ORDER BETWEEN THEM IS LOAD-BEARING.**
  `TeardownSubjectStrip` carries the FACTS — subject, acquisition, survey date, methods, the
  permission's name — and sits ABOVE `TeardownDecisionRow`, whose first cell is "Parts cost", which
  IS the BOM band. Everything the strip holds used to live only in `TeardownProvenanceBlock` below
  that row, which broke the rule while appearing to follow it. `TeardownProvenanceBlock` keeps what
  needs SENTENCES: the limit of the permission, the publisher's notes, the attestation, the standing
  line and a report control. **Neither may print the other's facts** — two sections repeating each
  other is how a reader learns to skip both. Do not reorder the strip below the decision row.
  ⚠️ **THE PROVENANCE CHIP IS DERIVED FROM `(provenance.kind, moderationState)` BY
  `resolveTeardownProvenanceChip`, NEVER STORED.** Two fields that can contradict each other is the
  bag of loose flags Pattern 1 rules out. ⚠️ **IT IS NOT A TRAFFIC LIGHT.** Green and amber are two
  new hues against the One Hue Rule, and `docs/Design.md` §6 forbids colour-alone signalling, so the
  two ordinary states differ by FILL and only the reported state takes `Destructive`. Every chip
  carries a word and a glyph and **the text label is canonical**.
  ⚠️ **THERE ARE THREE PROVENANCE KINDS AND ONLY THREE CHIPS, AND THAT MISMATCH IS DELIBERATE.**
  `licensed_open_source` and `authorized_by_manufacturer` both wear "Authorized / open source"
  (`PROVENANCE_CHIP_BY_KIND`). They were ONE kind for a day and that was wrong: a licence is a
  PUBLIC DOCUMENT a founder can read and rely on, an authorisation is a PRIVATE ARRANGEMENT they can
  neither verify nor inherit, and the merged contract also FORCED a manufacturer-authorised row to
  name a licence it may not hold. The data now distinguishes them; the chip does not, because a
  fourth badge is a fourth thing to learn before an index is legible and the distinction is only
  actionable on the detail page. **Each kind has exactly one legal shape** —
  `licensed_open_source` carries `licence` and no `authorizationNote`, `authorized_by_manufacturer`
  the reverse, `community_reverse_engineered` neither — enforced by a `Record` in the refinement so
  a fourth kind is a compile error. `TEARDOWN_PROVENANCE_KIND_NOTES` is where the difference is
  stated, and the manufacturer sentence **must never promise inheritance**.
  ⚠️ **`subjectKind` IS `z.literal("existing_physical_product")` ON THE PUBLIC ARM**, which makes a
  `proposed_design` teardown unconstructible rather than merely discouraged. It is the ONE
  teardown-arm field with no renderer and that is correct — a literal with one inhabitant carries no
  information to display — which is why the sweep below excludes it by name. If it ever widens to
  the enum it needs a renderer that same day. Do not grow a proposed-design blueprint type off it.
- **MODERATION IS ENFORCED IN THE GETTERS, AND A LIST AND A DETAIL READ DISAGREE ON PURPOSE.**
  `BLUEPRINT_MODERATION_STATES` is `draft`, `pending_review`, `published`, `rejected`, `flagged`,
  `quarantined`, `removed`. ⚠️ **`rejected` IS NOT `draft`** — a draft was never submitted, a
  rejected submission was reviewed and turned down and carries the moderator's reason. It is
  never-public like the first two, so the public gates did not change when it was added. Lists carry `published` + `flagged`; a detail read adds `quarantined`. An index is a
  RECOMMENDATION, so a quarantined row is absent from every one of them; a detail read is a DIRECT
  REQUEST, and a reader who followed an existing link is owed the reason rather than a 404 that reads
  as a broken bookmark. `draft` and `pending_review` are in neither — that is "moderator approval
  before public display", enforced in the one place every read passes through — and `removed` 404s,
  indistinguishable from a slug that never existed. ⚠️ **`listBlueprintSlugsByCategory` USES THE
  READABLE GATE** so a quarantined slug is still prerendered; filtering it there loses the notice on
  the one URL that needs it.
  ⚠️ **`flagged` CHANGES NOTHING BUT ADDS A NOTICE.** Delisting on an unexamined report would make
  the report control a takedown control. `quarantined` withholds the files, the model, the
  composition, the fastener BOM, the telemetry, the steps, the video and the cost band, through
  `canRenderTeardownPayload` — **but NOT the market signal**, because a quarantine is a claim about
  the publisher's FILES and says nothing about whether a market exists.
- **⚠️ DECLARED DATA NEVER RENDERS AS MEASURED DATA.** "6063-T5" off a supplier's invoice and
  "6063-T5" off an OES burn are the same eleven characters and completely different claims.
  `TEARDOWN_DESIGNATION_SOURCE_IS_MEASURED` and `TEARDOWN_COMPOSITION_ANALYSIS_METHOD_IS_MEASURED`
  are `Record`s so a new value must declare which it is; the source prints on EVERY material row,
  never behind a disclosure. Composition hangs off the TEARDOWN, not off `assembly.parts`, because
  most teardowns publish no model. Required: `designation`, `designationSource`, `materialClass`;
  `process` and `finish` are NULLABLE INSIDE that required set.
  ⚠️ **THAT NULLABILITY IS A STATED DEVIATION FROM THE SPEC, NOT AN OVERSIGHT.** The implementation
  brief listed all five as Required. A publisher who read an alloy off a moulding mark usually knows
  neither how the part was made nor its surface treatment, and requiring a value there produces a
  guess carrying the same type as a measured fact — the exact failure `designationSource` exists to
  prevent. Four fixtures hold `null` on both; that is the state being modelled, not missing data. **Element percentages are never
  required** — `elements: []` is ordinary and renders a row with no disclosure control.
  `weightPercentRange: null` means IDENTIFIED BUT NOT QUANTIFIED, which is not zero.
  ⚠️ **`synthetic_example` IS A WIRE VALUE, NOT A FIXTURE HACK**, and every element figure in the
  mocks carries it. A table containing one renders a stated banner, because a grid of element
  symbols and weight percents is the most measurement-shaped thing on the surface.
- **THE MARKET SIGNAL IS THE ONLY DEMAND EVIDENCE, AND ATTENTION IS NOT DEMAND.** Primary: live
  store listings in the same `storeProductClass`. Secondary: showcases whose
  `builtFromBlueprintSlug` matches. `viewCount`, `likeCount` and `saveCount` are excluded by name.
  ⚠️ **NO SIGNAL SUPPRESSES THE WHOLE BLOCK** — `getTeardownMarketSignal` returns `null` rather than
  an empty pair, so no component can render "No builds yet", "No listings" or an empty zero-state
  card. An empty state here would read as a VERDICT on the product.
- **THE PUBLISH FLOW IS A REHEARSAL AND SAYS SO ONCE.** `/blueprints/teardowns/new` is a real
  five-step wizard — real Zod validation, a real four-clause attestation gate, a real idempotency key
  minted per attempt — over `authoring.api.ts`, which **stores nothing**, because there is no
  `blueprint` table. ⚠️ **THE DISCLOSURE IS NOT OPTIONAL COPY AND LIVES IN EXACTLY ONE PLACE**:
  `submission-receipt.tsx`, after a submit. A banner on every step is a warning nobody finishes
  reading; no banner at all is a ghost control.
  ⚠️ **DO NOT ADD A POLL.** The R&D surfaces poll a 202 to a verdict (`refetchInterval` as a function
  of `query.state.data`); against a mock that re-reads the same fixture forever while implying a
  moderator is working. There is no queue and the receipt says so.
  ⚠️ **THE MOCK ENFORCES ONE REAL RULE ON PURPOSE** — a duplicate `subjectProductName` answers 409 —
  because without it the failure branch of every caller is unreachable, which is unverified code by
  the same standard the uncalled-hook audit applies.
  **Uploads do not exist**, so every teardown file is a pasted https URL and the walkthrough is a
  YouTube link through `extractYoutubeVideoId`; there is no dropzone and the step says why. The
  launch form's image picker is not an exception: it checks a file and uploads nothing (below). **There is no
  element-table editor and there must not be one** until a file from an analyser can be attached: a
  free-text percent field invites somebody to type a datasheet figure, which the composition table
  then renders looking exactly like a measurement.
  **`/studio/blueprints` is management only** — the wizard is mounted once, in `(home)`, and studio
  links to it. The two do not join, because `submitTeardownForReview` persists nothing; joining them
  would need fake in-memory persistence that loses work on reload, or a second `localStorage` key,
  which is forbidden.
  **`/blueprints/showcase/new` IS THE SAME REHEARSAL FOR A LAUNCH**, over `showcase-authoring.api.ts`:
  one page, two statements, a 409 on a launch name that already exists, and the disclosure once, in
  `showcase-launch-receipt.tsx`. ⚠️ **ITS HEADING IMAGE IS CHECKED AND PREVIEWED, NEVER UPLOADED.**
  `use-heading-image-pick.ts` decodes the file in the browser (type, 5 MB, square within 1%, at
  least 256px, through `src/lib/image-file-check.ts`, which the admin hero picker shares) and the
  `File` rides beside the draft into a mock that drops it. That check is UX only; the upload route
  must repeat every rule. **`/studio/launches` is management only** for the `/studio/blueprints`
  reason, and its rows are a fixture set that never includes a launch posted this session.
- **THE RIGHTS-CLAIM ROUTE PREPARES A NOTICE; IT DOES NOT FILE ONE.**
  `/blueprints/teardowns/[slug]/report` collects the claim kind, the target, the claimant and three
  sworn statements, then hands over a finished notice addressed to `SUPPORT_CONTACT_EMAIL` as a
  `mailto:` plus copy-to-clipboard. ⚠️ **IT DELIBERATELY DOES NOT REPEAT THE WIZARD'S MOCK-WRITE
  SHAPE.** A publisher rehearsing a submission loses their own draft; a rights holder who believes
  they gave legal notice and did not may miss a deadline or think the platform is on notice when it
  is not. So there is **no submit, no 202 and no receipt**, and that absence is the feature — no
  state on the route claims Qatoto holds anything. A side effect worth keeping: the claimant's name
  and email never reach a Qatoto server.
  ⚠️ **NO COPY MAY IMPLY A STATUTORY FILING.** Qatoto has designated no DMCA agent; `todo.md`'s
  video-copyright section lists the five things a safe-harbour process lacks and the three sworn
  clauses close exactly one. The route and `/copyright-policy` both say this reaches a person.
  ⚠️ **FILING CHANGES NOTHING ON THE SURFACE**, and must not be made to. Moving the row to `flagged`
  is the backend's job; faking it would show the claimant a state change that reverts on reload.
  **A QUARANTINED TEARDOWN STILL ACCEPTS A CLAIM** — a second rights holder may have a different
  objection, and refusing them would be this surface deciding one claim settles a row.
  **`RightsClaimTargetSchema` is a DISCRIMINATED UNION** over `whole_teardown` / `document` /
  `manufacturing_file` / `part`, and the picker lists the teardown's REAL payload: a free-text
  "which file" against a survey that published six is the one vague answer that makes a notice
  unactionable. No option is pre-selected, so the broadest claim cannot be sent by scrolling past.
- **THE DENSITY SWITCH IS A QUERY PARAM, NOT CLIENT STATE.** `?view=business|engineering|factory`,
  default `business`, and the default is written OUT of the URL so the canonical path stays
  canonical. `?view=factory` is a URL a founder sends to the shop that will make the thing.
  ⚠️ **NO VIEW HIDES A FACT THE OTHERS SHOW.** It reorders two blocks and decides whether the
  composition disclosures start open, and that is all — a view that withheld something would turn a
  reading preference into an access control. It also seeds the explorer's `initialTab`, an INITIAL
  value only: a controlled tab would make the tab bar rewrite a URL that already means something
  else. Reading `searchParams` is why `[slug]/page.tsx` carries `instant = false`.
- **THE TEARDOWN CARD IS A DECISION SET, NOT A VIDEO CARD.** It rendered `BlueprintCardBody` —
  thumbnail, category pill, title, author avatar, difficulty — which is the YouTube shape, and a
  founder asking "can I make this, and what will it cost" cannot answer either question from it.
  It now leads with the BOM band, the part count, which fabrication formats were published and the
  difficulty. `BlueprintCardBody` is DELETED (its stated reason was "so the rail and the grid cannot
  diverge", and the rail went with the hub redesign), and the category pill and author byline went
  with it — both callers show teardowns only, and four facts about the build plus one about the
  builder do not fit a 12px grid cell.
  ⚠️ **THE FLOOR IS A TITLE AND A DIFFICULTY.** `thermal-camera-module-teardown` has a null BOM, a
  null `partCount` and no media, so its card is exactly that, and the title carries it. Do not
  invent a number to fill the space and do not print "$0" or a dash — `formatCentsRangeLabel`
  returns `null` and `null` renders NO LINE.
  **The card uses `TEARDOWN_MANUFACTURING_FILE_KIND_SHORT_LABELS`**, a second record on the
  `FACTORY_CAPABILITY_SHORT_LABELS` precedent. The long labels head a download bundle on the detail
  page; on a card the four electronics kinds ran to 56 characters and wrapped the grid row taller
  than its neighbours. Formats are deduped and emitted in ENUM order, never publish order, and
  capped at four with a `+N` — six files can be three formats, and "STEP · STEP · DXF" would be
  counting files while appearing to list formats.
- **THE TEARDOWN DETAIL PAGE HANDS OFF TO `/store/factories`.** `TeardownFactoryHandoff` sits after
  `ManufacturingFileBundles` and renders on EVERY teardown, including one that published nothing —
  the handoff is about the pipeline, not this row's payload (PRODUCT.md Principle 5, continuity over
  polish; the directory and its inquiry flow are live and wired).
  ⚠️ **It links with NO DERIVED QUERY, and that is not laziness.** `TEARDOWN_MANUFACTURING_METHODS`
  (`cnc_milled`, `injection_molded`, `pcb_assembly`, …) and `FACTORY_CAPABILITY_KINDS` (`odm`,
  `oem`, `tooling_and_moulds`, …) look adjacent and answer different questions — one is the process
  a PART was made by, the other the commercial relationship a FACTORY offers. `injection_molded` is
  not `tooling_and_moulds`; the shop that cuts the mould and the shop that runs it are frequently
  different businesses. A derived filter would be wrong and would read as authoritative.
  **The copy promises nothing Qatoto does not do** — no quote, no price, no timeline, and no
  suggestion that this teardown's files can be sent onward. They are somebody else's drawings.
- **THE CASE-STUDY ARM IS A RECORD, AND IT CARRIES NO VERDICT.** The index was a grid of
  discipline-tinted, serif-titled, numbered cards on the lawsofux.com model, and that was three
  `docs/Design.md` violations standing together — §6's identical-card-grid ban, §3's Serif Boundary
  ("a serif heading inside `(home)` is a bug"), and §2's One Hue Rule against a tint map carrying
  five hues. It is now a hairline list of `<details>` rows, each led by an IMPERATIVE `title` the
  reader can act on. `conceptNumber` and the tint maps were DELETED rather than kept as legacy — a
  field nothing renders is what the sweep below exists to catch.
  ⚠️ **There is no outcome enum and there must not be one.** A `scaled | failed | pivoted` badge was
  specified and rejected: `cofounders.schemas.ts:186-188` already records why for the identical
  field — "a renderer that requires one invites people to invent one" — and a three-value verdict is
  an unattributed JUDGMENT, which PRODUCT.md bans harder than an unattributed number.
  `outcomeSummary` is a nullable free clause and `null` renders NOTHING, not "Unknown".
  **Every company name in the fixtures is invented and must stay invented**, and `sources[]` URLs
  stay on `example.com`: the de-index covers a fabricated teardown, not a fabricated failure pinned
  to a real business. Empty `sources[]` is the ONE absence on this surface that renders copy ("No
  public source for this one") — a knowing departure from Principle 2, because silence would let a
  page of specific figures read as sourced.
- **Costs are integer cents, never display strings.** `billOfMaterialsCostRange` is
  `{ minimumInCents, maximumInCents, currency } | null`, and the OBJECT is nullable rather than
  its fields — half a range is an unanswerable question. `null` means nobody costed it; it is
  not zero. Render it with `formatCentsRangeLabel` (`src/lib/store/format.ts`), which returns
  `null` rather than inventing a band.
- **The three indexes are KEYSET-PAGED, and filtering lives in the getters.** `listTeardowns`,
  `listShowcases` and `listCaseStudies` (`src/lib/blueprints/api.ts`) each take a filter object
  and return `BlueprintPage<T>`, whose footer is `CursorPage` imported from
  `src/lib/store/shared.schemas.ts` rather than redefined. A page cannot page a list it has not
  finished filtering, so no list component filters its own results. ⚠️ The page limits (8 / 6 / 6)
  are **fixture-sized on purpose** — a house-sized 24 would mean the paging control never
  rendered — and rise with real inventory. The cursor is opaque by contract; an unresolvable one
  is dropped and the first page served.
- **Media is nullable, and an absence renders NOTHING.** A teardown's `walkthroughVideo` is
  `null` when nobody filmed it and `documents` is `[]` when nothing was published — both are the
  common case, and both render no section at all rather than an empty box. PDFs open in a
  `ModalSheet` over `<embed type="application/pdf">` with a download fallback, because a browser
  with its PDF viewer off renders `<embed>` as a silent blank rectangle.
- **A BLUEPRINT VIDEO IS A YOUTUBE ID. THERE IS NO OTHER KIND.** `BlueprintVideoSchema` is a
  ONE-ARM discriminated union — the `source` literal is the seam Appendix A would widen, kept for
  the reason `feed/schemas.ts` keeps both pgEnum labels, and it byte-matches that enum. It carried a
  `hosted` arm with a served `url` and WebVTT captions for two days; that was a mistake, because
  `video-card-menu.tsx` states the platform rule it broke: _"Every video on the platform today is a
  YouTube link. The bytes sit on youtube.com, Qatoto never holds them and has no right to serve
  them."_ Self-hosted video is Studio Appendix A, "⛔ DO NOT BUILD THIS NOW", and the studio's file
  dropzone is `inert` today because `POST /videos` takes a `youtubeUrl` and no upload route exists.
  ⚠️ **Do not re-add a `<video>` element to this surface.** The poster is derived from the id with
  no network call (`i.ytimg.com/vi/<id>/hqdefault.jpg`, `hqdefault` because `maxresdefault` 404s on
  non-HD uploads), playback is the IFrame API on `youtube-nocookie`, and a blocked script renders an
  in-place panel with a "Watch on YouTube" link. **Never `watch/video-player.tsx`** — it reports
  watch progress against a feed row id a blueprint does not have.
- **A LAUNCH WRITE-UP IS GITHUB-STYLE MARKDOWN, AND ITS RENDERER IS THE SECURITY BOUNDARY.**
  `ShowcaseWriteUp` renders it with `react-markdown` + `remark-gfm`, `skipHtml`, an element
  allowlist and a URL transform that keeps only http(s), site-relative and anchor addresses.
  ⚠️ **No `rehype-raw` and no `dangerouslySetInnerHTML` on that path, ever.** A YouTube link alone
  on a line becomes `BlueprintVideoBlock`, the same click-to-load player, so a launch still holds no
  video bytes; the separate `demoVideo` field is gone. Images render only from site-relative paths
  or `res.cloudinary.com`, where uploads land; an image hosted anywhere else shows a one-line note,
  because every reader's browser would otherwise call that host. The launch page's upvote is
  `ShowcaseVoteBox` in a 40px gutter beside the head, the comment count is a byline link, and Share
  ends the byline; there is no showcase engagement row.
- **`durationSeconds` IS NULLABLE, AND `null` IS THE ORDINARY CASE.** The badge is its only reader.
  oEmbed — the one outbound YouTube call either repo makes — returns a title and a thumbnail and no
  duration, which is why the backend's own `duration_seconds` is NULL on every YouTube row. A typed
  runtime is a guess, so `null` renders no badge rather than a wrong one.
- **CAPTIONS AND CHAPTERS ARE YOUTUBE'S, AND SO ARE STEP TIMESTAMPS.** A `TeardownAssemblyStep`
  carries `stepNumber`, `title`, `description` and `focusedPartId` — and deliberately no timestamp.
  A step row is therefore ONE control, the part it focuses, and a step on an unmodelled teardown
  renders as prose. This is the boundary `/studio/subtitles` records: Qatoto does not reach inside
  somebody else's player, and what looks like a missing feature is that player's feature.
- **The 3D viewer is a SECOND 3D stack, on WebGL2, and it stays lazy.** The teardown engine
  (`src/components/home/blueprints/teardowns/engine/`, R3F + drei over the stock
  `WebGLRenderer`) sits beside the store's `@google/model-viewer`; both load through
  `await import()` inside an effect and never share a page's chunk graph. `three` stays pinned
  at model-viewer's peer range and NOTHING imports `three/webgpu` or `three/tsl` — WebGPU was
  considered and rejected (`todo.md` §1a). It renders as a TABBED LIGHT STAGE — Design,
  Exploded view, Components, Specifications — whose backdrop is CSS behind a transparent canvas,
  never a `gridHelper`: three's `Raycaster.params.Line.threshold` is a metre against a scene
  centimetres across, so any full-stage plane silently swallows every callout pin's occlusion ray.
  `assembly` is a discriminated union: one composite `.glb` addressed by node name, or one `.glb`
  PER PART, which is the shape an upload takes. Explosion is radial by default and LAYERED when
  the author names an `explosionAxis`, all-or-nothing across the parts. Telemetry is
  author-reported; the heat map is a vertex-colour bake of an authored rating, and no copy may
  call either a simulation this page ran.
- **EVERY teardown-arm field has a renderer, and that is a checked property, not a habit.** A
  field carrying data nothing displays is the same unverified code the R&D hook audit exists to
  catch. The equivalent sweep, which must print nothing:

    ```bash
    # `subjectKind` IS DELIBERATELY ABSENT FROM THIS LIST. It is a `z.literal` with one inhabitant,
    # so there is nothing for a renderer to display; if it ever widens to `TEARDOWN_SUBJECT_KINDS`,
    # add it back here on the same day.
    for field in assembly fasteners manufacturingFiles assemblySteps repairabilityIndex \
                 simulationTelemetry commentCount saveCount provenance materials \
                 moderationState storeProductClass; do
      rg -q "teardown\.$field\b" src/components/home/blueprints || echo "UNRENDERED $field"
    done

    # The provenance object's own fields, which the loop above cannot see through.
    for field in kind subjectProductName unitAcquisition surveyMethods surveyedAt licence \
                 authorizationNote attestationAcceptedAt notes; do
      rg -q "provenance\.$field\b" src/components/home/blueprints || echo "UNRENDERED provenance.$field"
    done

    # The case-study arm has the same property, and it is why `conceptNumber` was deleted rather
    # than kept as a legacy field with a TODO beside it.
    for field in oneLineAction outcomeSummary sector discipline evidenceCompanies problem context \
                 actionSteps pitfalls timelineLabel capitalRaised outcomeMetrics sources \
                 relatedLessonSlugs; do
      rg -q "caseStudy\.$field\b" src/components/home/blueprints || echo "UNRENDERED $field"
    done

    # And the Serif Boundary, which this surface broke in three places before the redesign.
    rg -n "font-serif" src/components/home/blueprints
    ```

- **The hero is real.** `GET /blueprints/hero-slides` and the admin console at
  `/admin/blueprints-hero` are live, backed by four rows. The `anime_hero_slide` TABLE and the
  five `anime_hero_slide_*` audit pgEnum labels KEEP THEIR NAMES — renaming them costs a
  migration — and the Cloudinary folder is still `qatoto/anime-hero-slides` because that is the
  address of the existing images, not a label. A URL is public identity; a table name is not.

`anime_episode` survives in `VIDEO_TYPES` because it is a backend pgEnum label. The studio
STOPPED OFFERING it (`details-step.tsx`) but `videos-list.tsx` still LABELS it, and
`studio-view.ts` still round-trips an existing anime block so editing a legacy row does not
erase it. Do not "finish the cleanup" by deleting either — one is a `Record` over the enum, the
other is data preservation.

## Current phase: R&D is wired end to end, reads and writes — nothing is mock

**Integration happened surface by surface and is now COMPLETE.** Every route under
`/research-and-development` reads the Express backend, and the domain has a full write
surface. The store/studio `/products` flow is wired too. The full discipline applies
everywhere here:

- `unknown` → Zod `.strip()` → tagged result, lifted into a discriminated-union view state
  with an exhaustive `switch` (Patterns 1–3 above).
- Server-side filtering and pagination, never client-side over a fetched page.
- Never fabricate a value the server returned as `null`. Zero is a finding; null is the
  absence of one.

**Writes are `client-query` islands.** A mutation lives in `src/lib/rnd/*.api.ts` beside
its reads, is wrapped by a hook in `src/hooks/rnd/`, and is called from a small
`"use client"` component. Four rules that are not negotiable on this surface:

- **A `202` is not a result.** Claim submit, re-verify, receipt upload, problem report and
  a `re_verified` dispute resolution all answer 202 — the row exists, the verdict does
  not. Render "we are checking" and poll; an optimistic verdict here is an optimistic
  equity split.
- **Idempotency keys are minted once per attempt**, in component state, on claim submit,
  receipt upload, dispute raise and payment record.
- **Nothing is optimistic.** These writes are attestations about money, equity and consent.
- **A `409` is usually a finding, not a retry** — surface the backend's own code and
  message.

**Nothing on this surface is mock any more.** `/research-programs` shipped — 15 tables, 30
routes, two nightly jobs — and Project Immortal became ONE ROW in it rather than a hardcoded
page. Programmes are user-creatable: anyone with a full account may propose one at
`/research-and-development/programs/new`, it lands `pending`, and a `moderate_content` holder
publishes it. Three rules specific to §10:

- **The branch map's two signals are DERIVED, never submitted.** `status` (`missing` = a gap
  nobody is working on) and `overlappingGroupCount` (>= 2 = duplicated effort) are computed
  nightly by `recompute-branch-signals` from claims, approved-paper coverage and integer
  Jaccard similarity over branch wording. They appear in no request body, and a contributor
  able to set them would make the map worthless.
- **Programme contribution is NOT equity.** `research_effort_log` and
  `research_contribution_ledger_entry` are self-reported records that mint nothing. A
  `cash_commitment` is a commitment — escrow left this codebase (§7) and no programme-scoped
  money rail exists, so no copy here may say "paid", "collected" or "escrowed".
- **Layout is not data.** The branch tree carries `parentBranchId` + `siblingOrder`, and
  `src/lib/rnd/branch-tree-layout.ts` runs a tidy layered layout at render time. There is no
  `canvasPosition` on the wire.

The one remaining piece of authored data on the surface is `/governance`'s worked-example
statement, which is a deliberate decision (backend §11h) and is labelled as an example.

**How to tell which one you are in:** every file under
`src/components/home/research-and-development/` carries a `TRANSPORT:` banner on its
first line — `server-fetch`, `client-query` or `props-only`. That banner is the answer, and
`grep -rn "TRANSPORT: mock" src/components/home/research-and-development/` now returns
NOTHING, which is the check that this section is still true.

⚠️ **The path in that grep is load-bearing.** It used to read `src/`, which made it a whole-repo
claim that was already false when written: `src/components/home/blueprints/**` is mock-backed on
purpose and every async file in it is `TRANSPORT: mock`. Scoped to R&D it is a real check; scoped
to `src/` it fails the first day anyone runs it. See `docs/R_AND_D_STRUCTURE.md` §18 (phase order) and §19 (transport map).

**The audit that keeps the write surface honest**, and note the flag — the version of this
loop that shipped in `docs/R_AND_D_STRUCTURE.md` omitted `--no-filename`, so `rg` prefixed
every hook name with its path and the loop reported all 90 hooks as uncalled:

```bash
for h in $(rg --no-filename -o 'export function (use\w+)' -r '$1' src/hooks/rnd/ | sort -u); do
  rg -q "\b$h\b" src/components || echo "UNCALLED $h"
done
```

It currently prints nothing. An uncalled hook is UNVERIFIED CODE — wire it to a control or
delete it, never leave it.

## Things to know

- TLS dev certs (`localhost.pem`, `localhost-key.pem`) are committed and used by `next dev`. Don't delete or regenerate without reason.
- `pnpm-workspace.yaml` pins `@types/react`/`@types/react-dom` overrides and allows `sharp` + `unrs-resolver` builds. Don't remove these — they prevent React 19 type drift.
- `pnpm lint` and `pnpm lint:fix` both run **oxlint** (`.oxlintrc.json`), not ESLint. There is no separate eslint script — an `eslint.config.mjs` may still exist but is not wired to any package.json script.
