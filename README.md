# [Qatoto](https://qatoto.com/) : Qatoto is a B2B pipeline that carries a physical product from an idea to a shipped unit

[![CodSpeed](https://img.shields.io/endpoint?url=https://codspeed.io/badge.json)](https://app.codspeed.io/vidyesh95/qatoto-frontend?utm_source=badge)

pitch, form a team, raise, build under a daily-update protocol, ship through the platform's
store and logistics. One identity, one ledger, one audience across all five stages.

## Qatoto Frontend

### Prerequisites

- Node.js >= 24.21.0
- pnpm >= 12.3.4

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

```bash
pnpm dev
```

Open [https://localhost:3000](https://localhost:3000) with your browser to see the result (local HTTPS dev certificates are committed in repository).

The home landing page lives at `src/app/(home)/page.tsx`.

## Architecture & Guidance

Detailed architecture rules, trust boundaries, and conventions are documented in:

- `CLAUDE.md` / `AGENTS.md` / `GEMINI.md`: Core invariants, naming, Rust-inspired UI states, and wire casing rules.
- `docs/`: Vertical architecture guides for Store, R&D, Admin, Feed, and Blueprints.

## Commands

```bash
pnpm dev          # Run Next.js Turbopack dev server with HTTPS
pnpm build        # Production build
pnpm lint         # Run oxlint
pnpm lint:fix     # Run oxlint --fix
pnpm fmt          # Format code with oxfmt
pnpm fmt:check    # Check code formatting with oxfmt
pnpm test         # Run unit tests with Vitest
pnpm bench        # Run the performance benchmarks with tinybench
```

## Benchmarks

Benchmarks live in `bench/` and cover the pure logic on the hot paths — the feed boundary
schemas, the feed view models, watch-history grouping, the blueprint explosion geometry and the
chart scales. They run locally with `pnpm bench` and in CI on every pull request through
[CodSpeed](https://app.codspeed.io/vidyesh95/qatoto-frontend), which measures them in CPU
simulation mode so the numbers are comparable between commits.

## E2E Tests

Playwright tests live in `tests/specs/` and can be run using:

```bash
pnpm exec playwright test
pnpm exec playwright test --ui
pnpm exec playwright test --project=chromium
```
