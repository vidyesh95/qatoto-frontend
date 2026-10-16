import { describe, expect, it } from "vitest";
import { isUnauthorized } from "./http";
import type { ApiError } from "./http";

describe("isUnauthorized", () => {
  it("returns true when the error code is '401'", () => {
    const error: ApiError = {
      code: "401",
      message: "Unauthorized access",
    };
    expect(isUnauthorized(error)).toBe(true);
  });

  it("returns false when the error code is not '401'", () => {
    const forbiddenError: ApiError = {
      code: "403",
      message: "Forbidden access",
    };
    expect(isUnauthorized(forbiddenError)).toBe(false);

    const serverError: ApiError = {
      code: "500",
      message: "Internal Server Error",
    };
    expect(isUnauthorized(serverError)).toBe(false);

    const networkError: ApiError = {
      code: "NETWORK",
      message: "Network request failed",
    };
    expect(isUnauthorized(networkError)).toBe(false);
  });
});
