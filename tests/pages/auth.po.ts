import type { Page, Locator } from "@playwright/test";

export class AuthPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  heading(name: string | RegExp): Locator {
    return this.page.getByRole("heading", { name });
  }

  link(name: string | RegExp): Locator {
    return this.page.getByRole("link", { name });
  }

  button(name: string | RegExp): Locator {
    return this.page.getByRole("button", { name });
  }

  emailInput(): Locator {
    return this.page.locator("input#email");
  }

  passwordInput(): Locator {
    return this.page.locator("input#password");
  }

  otpInput(index: number): Locator {
    return this.page.locator(`input#otp-${index}`);
  }

  async fillOtp(code: string) {
    const digits = code.padEnd(6, "0").slice(0, 6).split("");
    for (let i = 0; i < 6; i++) {
      await this.otpInput(i).fill(digits[i]);
    }
  }

  /**
   * Client-component forms have no `action` attribute — submitting before React
   * hydration finishes triggers a default GET reload that wipes controlled
   * state (the email input resets). Block until hydration completes before
   * clicking. `networkidle` is the most reliable cross-browser hydration
   * signal we have here.
   */
  async waitForHydration() {
    await this.page.waitForLoadState("networkidle");
  }
}
