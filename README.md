# [Qatoto](https://qatoto.com/) : Qatoto is a B2B pipeline that carries a physical product from an idea to a shipped unit

pitch, form a team, raise, build under a daily-update protocol, ship through the platform's
store and logistics. One identity, one ledger, one audience across all five stages.

## Qatoto Frontend

### Prerequisites

- Node.js >= 24.13.1
- pnpm >= 10.29.3

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## E2E Tests

Inside that directory, you can run several commands:

pnpm exec playwright test
Runs the end-to-end tests.

pnpm exec playwright test --ui
Starts the interactive UI mode.

pnpm exec playwright test --project=chromium
Runs the tests only on Desktop Chrome.

pnpm exec playwright test example
Runs the tests in a specific file.

pnpm exec playwright test --debug
Runs the tests in debug mode.

pnpm exec playwright codegen
Auto generate tests with Codegen.

We suggest that you begin by typing:

```bash
pnpm exec playwright test
```

And check out the following files:

- ./tests/example.spec.ts - Example end-to-end test
- ./playwright.config.ts - Playwright Test configuration
