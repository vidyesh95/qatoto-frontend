import { describe, expect, it, vi, afterEach } from "vitest";
import { z } from "zod";
import { isUnauthorized, getCursorPaginated } from "./http";
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

describe("getCursorPaginated", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success and parsed data when the API returns a valid envelope", async () => {
    const mockData = { items: [{ id: 1 }], nextCursor: "cursor_123" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        data: mockData,
      }),
    });

    const schema = z.object({
      items: z.array(z.object({ id: z.number() })),
      nextCursor: z.string().nullable(),
    });

    const result = await getCursorPaginated("/test-path", schema);
    expect(result).toEqual({ success: true, data: mockData });
  });

  it("returns a PARSE error when the API data fails schema validation", async () => {
    const mockData = { items: [{ id: "not-a-number" }], nextCursor: "cursor_123" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        data: mockData,
      }),
    });

    const schema = z.object({
      items: z.array(z.object({ id: z.number() })),
      nextCursor: z.string().nullable(),
    });

    const result = await getCursorPaginated("/test-path", schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PARSE");
    }
  });

  it("returns an error when the API returns a failure status", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        status: "error",
        statusCode: 500,
        message: "Internal Server Error",
      }),
    });

    const schema = z.object({});
    const result = await getCursorPaginated("/test-path", schema);

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({
        code: "500",
        message: "Internal Server Error",
      }),
    });
  });

  it("returns a NETWORK error when the fetch call fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    const schema = z.object({});
    const result = await getCursorPaginated("/test-path", schema);

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({
        code: "NETWORK",
      }),
    });
  });
});
