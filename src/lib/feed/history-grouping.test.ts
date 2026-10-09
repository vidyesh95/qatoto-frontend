import { describe, expect, it } from "vitest";

import { toUtcDateKey } from "./history-grouping";

describe("toUtcDateKey", () => {
  it("extracts the date string correctly for a standard time", () => {
    expect(toUtcDateKey("2026-08-14T12:00:00.000Z")).toBe("2026-08-14");
  });

  it("extracts the date string correctly for midnight", () => {
    expect(toUtcDateKey("2026-08-14T00:00:00.000Z")).toBe("2026-08-14");
  });

  it("extracts the date string correctly for the end of the day", () => {
    expect(toUtcDateKey("2026-08-14T23:59:59.999Z")).toBe("2026-08-14");
  });

  it("extracts the date string even if time is missing or incomplete as it is a string operation", () => {
    expect(toUtcDateKey("2026-08-14")).toBe("2026-08-14");
  });
});
