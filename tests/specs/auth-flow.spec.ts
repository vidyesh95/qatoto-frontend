import { test, expect } from "../fixtures/test-base";

test.describe("auth navigation", () => {
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

  test("back arrow from sign-in returns to root", async ({ page, auth }) => {
    await page.goto("/sign-in");
    await auth.link("Navigate back").click();
    await expect(page).toHaveURL("/");
  });
});
