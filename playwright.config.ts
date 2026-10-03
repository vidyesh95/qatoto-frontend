import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { defineConfig, devices } from "@playwright/test";

/**
 * macOS 27 privacy protection (TCC) blocks `~/Library/Application Support/Firefox` for processes
 * started from a terminal. Firefox 155 reads its profile registry there before it honours
 * `-profile`, so every launch dies with "Could not find profile folder." Reinstalling does not help.
 * `CFFIXED_USER_HOME` moves Firefox's notion of home to an empty directory it is allowed to use.
 * https://github.com/microsoft/playwright/issues/42768
 *
 * `launchOptions.env` REPLACES the browser's environment rather than merging into it, hence the
 * copy of `process.env`. Scoped to Firefox only: Chromium and WebKit launch fine and have no reason
 * to see a fake home.
 */
function buildFirefoxLaunchEnvironment(): Record<string, string> | undefined {
  if (process.platform !== "darwin") return undefined;

  const inheritedEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  return {
    ...inheritedEnvironment,
    CFFIXED_USER_HOME:
      process.env.CFFIXED_USER_HOME ?? mkdtempSync(join(tmpdir(), "playwright-firefox-home-")),
  };
}

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests/specs",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? "html" : [["list"], ["html", { open: "never" }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        launchOptions: { env: buildFirefoxLaunchEnvironment() },
      },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
