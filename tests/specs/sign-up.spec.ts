import { test, expect } from "../fixtures/test-base";

async function advanceToStep2(
  page: import("@playwright/test").Page,
  auth: import("../pages/auth.po").AuthPage,
) {
  await page.goto("/sign-up");
  await expect(auth.heading("Sign up")).toBeVisible();
  await auth.waitForHydration();
  await auth.emailInput().fill("tester@example.com");
  await auth.button(/Get OTP/i).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
}

test.describe("sign-up multi-step", () => {
  test("step 1 → step 2 advances after email submit", async ({ page, auth }) => {
    await advanceToStep2(page, auth);
    await expect(auth.otpInput(0)).toBeVisible();
  });

  test("step 2 → step 3 advances after full OTP", async ({ page, auth }) => {
    await advanceToStep2(page, auth);
    await auth.fillOtp("123456");
    await auth.button(/^Verify\b/i).click();
    await expect(page.getByRole("heading", { name: "Set your password" })).toBeVisible();
    await expect(auth.passwordInput()).toBeVisible();
  });

  test("back button on step 2 returns to step 1", async ({ page, auth }) => {
    await advanceToStep2(page, auth);
    await auth.button("Navigate back").click();
    await expect(page.getByRole("heading", { name: "Enter your email" })).toBeVisible();
  });
});
