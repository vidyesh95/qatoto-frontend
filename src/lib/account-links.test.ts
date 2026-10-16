import { describe, it, expect } from "vitest";
import { findOriginalProviderId } from "./account-links";

describe("findOriginalProviderId", () => {
  it('should return "email" when there are no linked accounts', () => {
    expect(findOriginalProviderId([])).toBe("email");
  });

  it("should return the providerId of the account marked as isOriginal", () => {
    const linkedAccounts = [
      { providerId: "github", accountId: "1", createdAt: new Date() },
      { providerId: "google", accountId: "2", createdAt: new Date(), isOriginal: true },
      { providerId: "discord", accountId: "3", createdAt: new Date() },
    ];
    expect(findOriginalProviderId(linkedAccounts)).toBe("google");
  });

  it("should return the providerId of the first account if none are marked as isOriginal", () => {
    const linkedAccounts = [
      { providerId: "github", accountId: "1", createdAt: new Date() },
      { providerId: "google", accountId: "2", createdAt: new Date() },
    ];
    expect(findOriginalProviderId(linkedAccounts)).toBe("github");
  });

  it("should handle single account without isOriginal flag", () => {
    const linkedAccounts = [
      { providerId: "github", accountId: "1", createdAt: new Date() },
    ];
    expect(findOriginalProviderId(linkedAccounts)).toBe("github");
  });
});
