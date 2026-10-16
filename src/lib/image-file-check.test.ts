import { describe, expect, it } from "vitest";
import { formatMegabytes } from "./image-file-check";

describe("formatMegabytes", () => {
  it("formats exact megabytes without decimals", () => {
    expect(formatMegabytes(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatMegabytes(10 * 1024 * 1024)).toBe("10 MB");
  });

  it("formats fractional megabytes with one decimal place", () => {
    expect(formatMegabytes(5.5 * 1024 * 1024)).toBe("5.5 MB");
    expect(formatMegabytes(5.1 * 1024 * 1024)).toBe("5.1 MB");
    expect(formatMegabytes(5.12 * 1024 * 1024)).toBe("5.1 MB"); // Rounds or truncates depending on toFixed
    expect(formatMegabytes(5.16 * 1024 * 1024)).toBe("5.2 MB"); // Rounds up
  });

  it("formats zero bytes as 0 MB", () => {
    expect(formatMegabytes(0)).toBe("0 MB");
  });

  it("formats values less than 1 MB correctly", () => {
    expect(formatMegabytes(512 * 1024)).toBe("0.5 MB");
    expect(formatMegabytes(100 * 1024)).toBe("0.1 MB");
    expect(formatMegabytes(10 * 1024)).toBe("0.0 MB");
  });
});
