import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Next.js-recommended Vitest setup (https://nextjs.org/docs/app/guides/testing/vitest):
// `resolve.tsconfigPaths` wires up the `@/*` alias from tsconfig, react() handles JSX, jsdom
// gives component tests a DOM. The include/exclude and TZ pin below are ours — the
// minimal Next example omits them:
//   - Playwright owns `tests/specs/**/*.spec.ts` and runs them itself. Vitest's default
//     `include` would also match those; scoping include to `.test.{ts,tsx}` + excluding
//     `tests/specs/**` keeps the two runners from ever loading each other's files.
//   - TZ=UTC makes `formatDate` (toLocaleDateString) assertions deterministic everywhere.
export default defineConfig({
  plugins: [react()],
  // Replaces the `vite-tsconfig-paths` plugin — native as of Vite 8 (`ResolveOptions.tsconfigPaths`),
  // which is what Vitest 4's startup warning points at. Defaults to false, so it must be explicit.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    exclude: [
      "tests/specs/**",
      "node_modules/**",
      ".next/**",
      "playwright-report/**",
      "test-results/**",
    ],
    env: { TZ: "UTC" },
  },
});
