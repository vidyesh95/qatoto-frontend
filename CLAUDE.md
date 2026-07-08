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
pnpm lint                             # eslint (next/core-web-vitals + next/typescript)
pnpm lint:fix                         # oxlint --fix (type-aware oxlint, see .oxlintrc.json)
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
- `(home)` — the main app shell. `(home)/layout.tsx` wraps children in `SidebarProvider` + `Navbar` + `Sidebar`. All top-level product surfaces (`/ai`, `/anime`, `/cart`, `/create`, `/library`, `/store`, `/settings`, `/history`, `/your-videos`, `/your-account`, `/your-sales`, etc.) live here and inherit that chrome.
- `(disclaimers)` — legal/policy pages with their own layout.
- `(information)` — marketing pages (about, blogs, careers, contact-us, creator, developers, how-qatoto-works, press). Blogs and press have `[slug]` dynamic routes.

`src/app/layout.tsx` is the root — sets up Geist Sans/Mono + Roboto Serif via `next/font/google` and injects `react-grab` + `react-scan` `<Script>` tags **only when `NODE_ENV === "development"`**. Do not touch those gates without intent — they must never ship to production.

### Components mirror routes

`src/components/{auth,disclaimers,home,information}/*.tsx` hold the page bodies. `src/app/.../page.tsx` files are typically thin shells that import the matching component. When adding a new route, follow this split: keep the `page.tsx` minimal and put the markup in `src/components/<group>/`.

### Shared state

`src/state/sidebar-context.tsx` is the single piece of cross-component state — a client-only `SidebarProvider` exposing `{ isCollapsed, toggleSidebar }` via `useSidebar()`. Mounted by `(home)/layout.tsx` only, so `useSidebar` is **not** available outside the `(home)` group.

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

### Tests — do not write unless explicitly asked

**Do not write, add, or modify tests unless the user explicitly asks for them.** This applies to unit tests (Vitest), E2E tests (Playwright), and any other test files. Do not create test files as part of a feature implementation, bug fix, or refactor. Do not suggest writing tests unless the user requests it.

## Current phase: UI + mock data only

**We are in a UI-building phase. Do not do anything complex.**

- Use inline mock/static data — no real API calls, no fetch, no backend integration
- No Zod parsing, no error state handling, no loading states beyond simple placeholders
- No new abstractions, no utility layers, no data fetching hooks
- Build the UI shape: layout, components, styles, interactions — that's it
- When the backend integration phase starts, this section will be removed

## Things to know

- TLS dev certs (`localhost.pem`, `localhost-key.pem`) are committed and used by `next dev`. Don't delete or regenerate without reason.
- `pnpm-workspace.yaml` pins `@types/react`/`@types/react-dom` overrides and allows `sharp` + `unrs-resolver` builds. Don't remove these — they prevent React 19 type drift.
- ESLint flat config (`eslint.config.mjs`) ignores `.next/`, `node_modules/`, `out/`, `build/`, `next-env.d.ts`. `lint:fix` uses **oxlint**, not eslint — they are not interchangeable.
