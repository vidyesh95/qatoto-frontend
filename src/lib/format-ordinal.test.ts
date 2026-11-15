import { describe, it, expect } from "vitest";
import { toOrdinalLabel } from "./format-ordinal";

describe("toOrdinalLabel", () => {
  it("should format single digits correctly (1st, 2nd, 3rd, 4th)", () => {
    expect(toOrdinalLabel(0)).toBe("1st");
    expect(toOrdinalLabel(1)).toBe("2nd");
    expect(toOrdinalLabel(2)).toBe("3rd");
    expect(toOrdinalLabel(3)).toBe("4th");
    expect(toOrdinalLabel(9)).toBe("10th");
  });

  it("should handle the 'teen' exceptions (11th, 12th, 13th)", () => {
    expect(toOrdinalLabel(10)).toBe("11th");
    expect(toOrdinalLabel(11)).toBe("12th");
    expect(toOrdinalLabel(12)).toBe("13th");
    expect(toOrdinalLabel(13)).toBe("14th");
  });

  it("should handle larger numbers ending in 1, 2, 3", () => {
    expect(toOrdinalLabel(20)).toBe("21st");
    expect(toOrdinalLabel(21)).toBe("22nd");
    expect(toOrdinalLabel(22)).toBe("23rd");
    expect(toOrdinalLabel(30)).toBe("31st");
    expect(toOrdinalLabel(41)).toBe("42nd");
    expect(toOrdinalLabel(52)).toBe("53rd");
  });

  it("should handle numbers over 100 correctly", () => {
    expect(toOrdinalLabel(99)).toBe("100th");
    expect(toOrdinalLabel(100)).toBe("101st");
    expect(toOrdinalLabel(101)).toBe("102nd");
    expect(toOrdinalLabel(102)).toBe("103rd");
    expect(toOrdinalLabel(103)).toBe("104th");
  });

  it("should handle 'teen' exceptions for numbers over 100", () => {
    expect(toOrdinalLabel(110)).toBe("111th");
    expect(toOrdinalLabel(111)).toBe("112th");
    expect(toOrdinalLabel(112)).toBe("113th");
    expect(toOrdinalLabel(210)).toBe("211th");
    expect(toOrdinalLabel(211)).toBe("212th");
    expect(toOrdinalLabel(212)).toBe("213th");
  });
});
