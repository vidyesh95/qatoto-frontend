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
pnpm lint:fix                         # oxlint --fix (type-aware oxlint, see oxlint.config.ts)
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

- **Vitest** — fast unit tests for pure/logic modules (e.g. `src/lib/cms.ts`). Config in `vitest.config.ts`. Test files use the **`.test.ts`** suffix and live **next to the code** under `src/**` (or under `tests/unit/`). Vitest's `include` is scoped to those globs and `exclude`s `tests/specs/**`. Add new unit tests here when the logic is testable without a browser.
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
- **Never trust client-supplied identity, role, permissions, price, quantity, totals, or location/country.** The server derives or re-verifies these. Example in this repo: the browse-location/country selector (`src/components/home/location-menu.tsx`) is a **display preference only** — the backend must not trust a client-claimed country for fraud signals, geo-restriction, tax, or pricing; re-derive server-side (IP, verified account region, payment country).
- **No secrets in the frontend** — no API keys, private tokens, or confidential business logic in client code or the client bundle. Only short-lived, scoped session credentials.
- All mutations: the server validates input schema, ownership, permissions, and rate limits before acting.

### Performance — keep the client light and ultrafast

- Push heavy or expensive work to the Express backend: large-list sorting & filtering, aggregation, ranking, recommendations, search over big datasets, media processing, anything CPU- or data-heavy. The client renders results; it does not compute them.
- This repo is a pure frontend (Next.js) that talks to a **separate Express REST API** — do not introduce Server Actions or Next.js API routes for business logic. All data mutations go through the Express backend via `fetch()`.
- Keep `"use client"` components small and focused on interaction. Ship the minimal client JS needed.
- When adding a feature, ask: _does this logic need to be trusted, or is it heavy?_ If yes to either, it belongs in the Express backend. The frontend gets only render + light interaction.

## Conventions

From `CONTRIBUTING.md`:

- **Commits**: Conventional Commits, imperative mood, **lowercase**. e.g. `feat: add user authentication`, `fix: resolve login bug`.
- **Naming**: PascalCase classes/components, camelCase vars/functions/file names, kebab-case directories.
- Run `pnpm fmt` (oxfmt) before opening a PR.

## Things to know

- TLS dev certs (`localhost.pem`, `localhost-key.pem`) are committed and used by `next dev`. Don't delete or regenerate without reason.
- `pnpm-workspace.yaml` pins `@types/react`/`@types/react-dom` overrides and allows `sharp` + `unrs-resolver` builds. Don't remove these — they prevent React 19 type drift.
- ESLint flat config (`eslint.config.mjs`) ignores `.next/`, `node_modules/`, `out/`, `build/`, `next-env.d.ts`. `lint:fix` uses **oxlint**, not eslint — they are not interchangeable.
