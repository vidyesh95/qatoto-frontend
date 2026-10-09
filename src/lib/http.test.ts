import { describe, expect, it } from "vitest";
import { buildQueryString, isUnauthorized } from "./http";
import type { ApiError } from "./http";

describe("buildQueryString", () => {
  it("returns an empty string when params are empty", () => {
    expect(buildQueryString({})).toBe("");
  });

  it("builds a query string for simple key-value pairs", () => {
    expect(buildQueryString({ key: "value", foo: "bar" })).toBe("?key=value&foo=bar");
  });

  it("ignores undefined values", () => {
    expect(buildQueryString({ key: "value", ignoreMe: undefined })).toBe("?key=value");
    expect(buildQueryString({ ignoreMe: undefined })).toBe("");
  });

  it("handles numbers and booleans", () => {
    expect(buildQueryString({ count: 42, active: true, disabled: false })).toBe(
      "?count=42&active=true&disabled=false",
    );
  });

  it("repeats the key for array values", () => {
    expect(buildQueryString({ capability: ["cnc", "injection"], limit: 10 })).toBe(
      "?capability=cnc&capability=injection&limit=10",
    );
  });

  it("drops empty arrays entirely", () => {
    expect(buildQueryString({ capability: [], limit: 10 })).toBe("?limit=10");
    expect(buildQueryString({ capability: [] })).toBe("");
  });

  it("encodes URL components correctly", () => {
    expect(buildQueryString({ "key with space": "value with & symbol" })).toBe(
      "?key+with+space=value+with+%26+symbol",
    );
  });
});

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
