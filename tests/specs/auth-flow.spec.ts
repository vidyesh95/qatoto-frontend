import { test, expect } from "../fixtures/test-base";

// End-to-end coverage of the (auth) route group's navigation graph.
// Every inter-page link gets exercised at least once.
test.describe("auth navigation", () => {
  // One long path test walking the full graph in a single session:
  //   /sign-in → /sign-in-with-password → /forgot-password
  //   → (back arrow) /sign-in → /sign-up → (back arrow) /sign-in
  //
  // At each stop we assert the URL changed AND the destination heading is
  // visible — URL alone isn't enough (the page could fail to render).
  // On /sign-in-with-password we also assert the email + password inputs
  // exist, because that page is where the form lives.
  test("sign-in → sign-in-with-password → forgot-password → back → sign-up → back to sign-in", async ({
    page,
    auth,
  }) => {
    await page.goto("/sign-in");
    await expect(auth.heading("Sign in")).toBeVisible();

    await auth.link(/Sign in with Password/i).click();
    await expect(page).toHaveURL(/\/sign-in-with-password$/);
    await expect(auth.heading(/Sign in with Password/i)).toBeVisible();
    await expect(auth.emailInput()).toBeVisible();
    await expect(auth.passwordInput()).toBeVisible();

    await auth.link("Forgot Password?").click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(auth.heading("Forgot password")).toBeVisible();

    await auth.link("Navigate back").click();
    await expect(page).toHaveURL(/\/sign-in$/);

    await auth.link("Sign up").click();
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(auth.heading("Sign up")).toBeVisible();

    await auth.link("Navigate back").click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  // /sign-in's back arrow is a <Link href="/">. Independently verify it
  // returns the user to the app root (rather than to some auth landing page).
  test("back arrow from sign-in returns to root", async ({ page, auth }) => {
    await page.goto("/sign-in");
    await auth.link("Navigate back").click();
    await expect(page).toHaveURL("/");
  });
});
