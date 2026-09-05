# AGENTS.md

Cross-vendor instructions for AI coding agents (Claude, Gemini, Cursor, Copilot, etc.) working in this repository. Claude also reads `CLAUDE.md`; Gemini also reads `GEMINI.md`. The core principle below is mirrored in all three — keep them in sync.

For full project context (stack, commands, architecture, conventions), read `CLAUDE.md`.

## Core principle: thin client, untrusted frontend (NON-NEGOTIABLE)

This is a frontend repository. It is a **thin, untrusted presentation layer**. The backend is the single source of truth and does all heavy and all security-sensitive work.

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

Goals: UI predictability, no illegal visual states, safe parsing of API responses without blindly trusting the network. Mirrored in `CLAUDE.md` and `GEMINI.md` — keep all three in sync.

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

## The Blueprints hub replaced /anime (mock, deliberately)

`/anime` was RETIRED. It is now `/blueprints` — engineering teardowns (70%), working
prototypes (20%) and manufacturing case studies (10%) — and `next.config.ts` 308s `/anime`
and `/anime/:path*` at the routing layer.

**The hub is mock and that is a decision, not an oversight.** `src/mocks/blueprints-mocks.ts`
holds twelve invented builds. It inherits the caveat `todo.md` recorded against `/anime`
verbatim — _a vertical you cannot fill should not ship_ — and `src/app/sitemap.ts` announces
these routes anyway, which is flagged there as the thing to revisit before production.

Three rules specific to this surface:

- **Components never import the fixtures.** Everything goes through `src/lib/blueprints/api.ts`,
  whose `"use cache"` getters mirror `src/lib/cms.ts`. `/anime` was wired the other way — its
  components imported `@/mocks/anime-mocks` directly — and that is precisely why swapping it to
  real data was a component rewrite rather than a one-file edit. Do not reintroduce that.
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

## Conventions

From `CONTRIBUTING.md`:

- **Commits**: Conventional Commits, imperative mood, **lowercase**. e.g. `feat: add user authentication`, `fix: resolve login bug`.
- **Naming**: PascalCase classes/components, camelCase vars/functions/file names, kebab-case directories.
- Run `pnpm fmt` (oxfmt) before opening a PR.

### Naming — descriptive, self-documenting (NON-NEGOTIABLE)

Names are the primary documentation. A reader (human or agent) must understand what a thing is from its name alone, without tracing where it came from. Mirrored in `CLAUDE.md` and `GEMINI.md` — keep all three in sync if you change them.

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

## Things to know

- TLS dev certs (`localhost.pem`, `localhost-key.pem`) are committed and used by `next dev`. Don't delete or regenerate without reason.
- `pnpm-workspace.yaml` pins `@types/react`/`@types/react-dom` overrides and allows `sharp` + `unrs-resolver` builds. Don't remove these — they prevent React 19 type drift.
- `pnpm lint` and `pnpm lint:fix` both run **oxlint** (`.oxlintrc.json`), not ESLint. There is no separate eslint script — an `eslint.config.mjs` may still exist but is not wired to any package.json script.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
