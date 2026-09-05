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

- **Vitest** — unit + component tests. Config in `vitest.config.mts` (the Next.js-recommended setup: `@vitejs/plugin-react`, `vite-tsconfig-paths` for the `@/*` alias, `jsdom` environment, React Testing Library). Test files use the **`.test.ts` / `.test.tsx`** suffix and live **next to the code** under `src/**` (or under `tests/unit/`). Vitest's `include` is scoped to those globs and `exclude`s `tests/specs/**`. Add new unit/component tests here when the logic is testable without a real browser.
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

**The hub is mock and that is a decision, not an oversight.** `src/mocks/blueprints-mocks.ts`
holds 22 invented builds across three arms — 12 teardowns, 5 showcases, 5 case studies.
⚠️ **That is NOT the 70/20/10 split and is not meant to be**: the ratio is a target for real
content, and applied to fixtures it gave two showcases and two case studies, which does not
exercise either design. There are exactly five case studies because there are five
`BLUEPRINT_DISCIPLINES`, and a discipline with no fixture is a card tint nobody ever sees.
The surface inherits the caveat `todo.md` recorded against `/anime`
verbatim — _a vertical you cannot fill should not ship_ — so the surface is **de-indexed**: it is
absent from `src/app/sitemap.ts` AND both routes carry `robots: { index: false, follow: false }`.
Both halves are needed, because the sidebar and mobile nav link the hub, so a sitemap omission
alone stops nothing (`robots.ts` says exactly this at the top). **Restoring both is the launch
step** when real blueprints exist — miss one and the surface either ships invisible or ships
indexed-while-fabricated.

Three rules specific to this surface:

- **Components never import the fixtures.** Everything goes through `src/lib/blueprints/api.ts`,
  whose `"use cache"` getters mirror `src/lib/cms.ts`. `/anime` was wired the other way — its
  components imported `@/mocks/anime-mocks` directly — and that is precisely why swapping it to
  real data was a component rewrite rather than a one-file edit. Do not reintroduce that.
- **`Blueprint` is a DISCRIMINATED UNION on `category`, not one flat shape.** Each arm carries
  what its surface needs — a teardown's `walkthroughVideo`/`documents[]`, a showcase's
  `launchedAt`/`team[]`/`upvoteCount`, a case study's `conceptNumber`/`discipline`/
  `outcomeMetrics[]`. `difficulty`, `cadFormat` and `billOfMaterialsCostRange` stay SHARED
  because a rail card renders them for every category; arms only add. Build every URL with
  `buildBlueprintHref` — never by hand. `upvoteCount` is display-only and no vote button ships:
  a counter a client increments is a business rule on an untrusted layer.
- **Costs are integer cents, never display strings.** `billOfMaterialsCostRange` is
  `{ minimumInCents, maximumInCents, currency } | null`, and the OBJECT is nullable rather than
  its fields — half a range is an unanswerable question. `null` means nobody costed it; it is
  not zero. Render it with `formatCentsRangeLabel` (`src/lib/store/format.ts`), which returns
  `null` rather than inventing a band.
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
`grep -rn "TRANSPORT: mock" src/` now returns NOTHING, which is the check that this section
is still true. See `docs/R_AND_D_STRUCTURE.md` §18 (phase order) and §19 (transport map).

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
