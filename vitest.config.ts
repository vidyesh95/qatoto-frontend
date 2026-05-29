import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests live next to the code they cover and use the `.test.ts` suffix.
// Playwright owns `tests/specs/**/*.spec.ts` and runs them itself — keep the two
// runners from ever scanning each other's files (Playwright's `testDir` already
// scopes it to `tests/specs`; the include/exclude below scope Vitest the other way).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    exclude: [
      "tests/specs/**",
      "node_modules/**",
      ".next/**",
      "playwright-report/**",
      "test-results/**",
    ],
    // Pin the timezone so `formatDate` assertions are deterministic across machines.
    env: { TZ: "UTC" },
  },
});
