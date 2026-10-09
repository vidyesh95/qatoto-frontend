import { describe, expect, it } from "vitest";
import { isUnauthorized, unwrap, ApiRequestError } from "./http";
import type { ApiError, ActionResponse } from "./http";

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

describe("unwrap", () => {
  it("returns data on success", () => {
    const successResult: ActionResponse<string> = {
      success: true,
      data: "hello world",
    };
    expect(unwrap(successResult)).toBe("hello world");
  });

  it("throws ApiRequestError on failure", () => {
    const apiError: ApiError = {
      code: "404",
      message: "Not found",
    };
    const failureResult: ActionResponse<string> = {
      success: false,
      error: apiError,
    };

    expect(() => unwrap(failureResult)).toThrowError(ApiRequestError);
    expect(() => unwrap(failureResult)).toThrowError("Not found");

    try {
      unwrap(failureResult);
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      if (error instanceof ApiRequestError) {
        expect(error.apiError).toBe(apiError);
      }
    }
  });
});
