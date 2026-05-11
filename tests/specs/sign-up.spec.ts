import { test, expect } from "../fixtures/test-base";

// Shared setup for every sign-up test. The component is a 3-step state machine
// (useState<1|2|3>) and most tests need step 2 as a starting point.
//
// IMPORTANT: the step 1 form has no `action=` attribute. If we click submit
// BEFORE React hydration finishes, the browser falls back to a default GET
// reload of the current URL, which wipes the controlled `email` state. The
// reload looks "successful" but the page is back on step 1 with an empty
// input. `auth.waitForHydration()` (a `waitForLoadState("networkidle")`
// wrapper) blocks until hydration is done so the React onSubmit handler
// actually catches the event and runs setStep(2).
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
  // Step 1 → 2 transition. Helper does the work; we additionally assert that
  // the first OTP input renders (proves the step 2 form mounted, not just
  // the heading).
  test("step 1 → step 2 advances after email submit", async ({ page, auth }) => {
    await advanceToStep2(page, auth);
    await expect(auth.otpInput(0)).toBeVisible();
  });

  // Step 2 → 3 transition. Fill all 6 OTP digits via fillOtp() (which writes
  // each input individually, mirroring real user typing rather than paste).
  // Click "Verify", assert step 3 heading + password input render.
  test("step 2 → step 3 advances after full OTP", async ({ page, auth }) => {
    await advanceToStep2(page, auth);
    await auth.fillOtp("123456");
    await auth.button(/^Verify\b/i).click();
    await expect(page.getByRole("heading", { name: "Set your password" })).toBeVisible();
    await expect(auth.passwordInput()).toBeVisible();
  });

  // Back navigation from step 2. Note: on step 1 the back control is a
  // <Link href="/sign-in"> (anchor); on step 2+ it's a <button> that calls
  // handleBack() to decrement state. We assert clicking the button returns
  // us to step 1's heading ("Enter your email").
  test("back button on step 2 returns to step 1", async ({ page, auth }) => {
    await advanceToStep2(page, auth);
    await auth.button("Navigate back").click();
    await expect(page.getByRole("heading", { name: "Enter your email" })).toBeVisible();
  });
});
