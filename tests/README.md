# E2E Tests

Playwright suite covering the Qatoto frontend. Auto-starts no dev server — boot it yourself first.

## Run

```bash
pnpm dev                                              # terminal 1
pnpm exec playwright test                             # terminal 2 (all browsers)
pnpm exec playwright test --project=chromium         # single browser
pnpm exec playwright test specs/auth-flow.spec.ts    # single file
pnpm exec playwright test --ui                        # interactive
```

`baseURL` is `http://localhost:3000` (see `playwright.config.ts`). All `page.goto()` calls use root-relative paths.

## Layout

```
tests/
  fixtures/test-base.ts        extended test with POM fixtures (navbar, sidebar, auth)
  pages/                       Page Objects — selectors live here, NOT in specs
    navbar.po.ts
    sidebar.po.ts
    auth.po.ts
  specs/                       one file per concern
    smoke.spec.ts              root + 404
    home-shell.spec.ts         navbar brand, sidebar toggle, sign-in link
    sidebar-navigation.spec.ts each sidebar + footer link reaches its route
    search.spec.ts             search form GET /search?query=…
    auth-flow.spec.ts          sign-in ↔ password ↔ forgot ↔ sign-up nav
    sign-up.spec.ts            3-step sign-up state machine
    information-pages.spec.ts  /about, /blogs, /careers, …
    disclaimers-pages.spec.ts  /terms-and-conditions, /privacy-policy, …
```

## Adding a test

1. Pick the matching spec file, or create a new one in `specs/` per concern.
2. Reuse the extended `test` from `fixtures/test-base.ts` (gives you `navbar`, `sidebar`, `auth`).
3. Put new selectors in the relevant Page Object, not inline in the spec.
