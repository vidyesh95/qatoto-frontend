import { describe, expect, it, vi, afterEach } from "vitest";
import { newIdempotencyKey } from "./idempotency";

describe("newIdempotencyKey", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a string", () => {
    const key = newIdempotencyKey();
    expect(typeof key).toBe("string");
  });

  it("returns a valid UUID v4 format", () => {
    const key = newIdempotencyKey();
    // basic regex for a UUIDv4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(key).toMatch(uuidRegex);
  });

  it("generates unique keys on successive calls", () => {
    const key1 = newIdempotencyKey();
    const key2 = newIdempotencyKey();
    expect(key1).not.toBe(key2);
  });

  it("calls crypto.randomUUID internally", () => {
    const spy = vi.spyOn(crypto, "randomUUID");
    const key = newIdempotencyKey();
    expect(spy).toHaveBeenCalledOnce();
    // The value returned by newIdempotencyKey should match the result from the spy (i.e. the crypto.randomUUID result)
    expect(spy.mock.results[0].value).toBe(key);
  });
});
