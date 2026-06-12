# GEMINI.md

Instructions for Gemini working in this repository. The core principle below is mirrored in `CLAUDE.md` and `AGENTS.md` — keep all three in sync. For full project context (stack, commands, architecture, conventions), read `CLAUDE.md`.

## Core principle: thin client, untrusted frontend (NON-NEGOTIABLE)

This is a frontend repository. It is a **thin, untrusted presentation layer**. The backend is the single source of truth and does all heavy and all security-sensitive work.

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

## Frontend architecture rules (Rust-inspired)

Goals: UI predictability, no illegal visual states, safe parsing of API responses without blindly trusting the network. Mirrored in `CLAUDE.md` and `AGENTS.md` — keep all three in sync.

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
    | { success: true; data: T }
    | { success: false; error: { code: string; message: string } };
```

Combine with Pattern 1: lift `ActionResponse<T>` into the component's `DashboardState`-style union so the UI for each error code is explicit and exhaustive.

## Conventions

From `CONTRIBUTING.md`:

- **Commits**: Conventional Commits, imperative mood, **lowercase**. e.g. `feat: add user authentication`, `fix: resolve login bug`.
- **Naming**: PascalCase classes/components, camelCase vars/functions/file names, kebab-case directories.
- Run `pnpm fmt` (oxfmt) before opening a PR.

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
