import { describe, expect, it } from "vitest";

import { parseFreightBandGrid } from "./freight-band-paste";

/**
 * `parseFreightBandGrid` is the ONE place a spreadsheet becomes a priced ladder, and the one place
 * a silent mistake becomes a published tariff nobody can see is wrong.
 *
 * THE UNIT CONVERSIONS ARE WHY THESE CASES EXIST. The wire is integer grams and integer cents; the
 * forwarder's sheet is kilograms and currency units. A kg column read as grams underprices a lane
 * by 1000x and lands INSIDE every bound the server checks, so no refusal downstream would catch it.
 * The rest of the cases are the other half of the same rule: a cell this function cannot read is
 * reported, never defaulted.
 */

/** Six columns: min kg · min cm³ · price per kg · min charge · days min · days max. */
const THREE_CLEAN_ROWS = [
  "0\t0\t4.50\t150.00\t24\t34",
  "30\t0\t4.00\t150.00\t24\t34",
  "60\t0\t3.60\t150.00\t24\t34",
].join("\n");

describe("parseFreightBandGrid", () => {
  it("parses a clean three-row paste into drafts", () => {
    const result = parseFreightBandGrid(THREE_CLEAN_ROWS);

    expect(result.problems).toEqual([]);
    expect(result.bands).toHaveLength(3);
  });

  it("converts kilograms to grams", () => {
    // The 1000x trap. A sheet says 30 kg; the wire needs 30000 g.
    const result = parseFreightBandGrid("30\t0\t4.00\t150.00\t24\t34");

    expect(result.problems).toEqual([]);
    expect(result.bands[0]?.minBillableWeightGrams).toBe("30000");
  });

  it("converts money to cents without going through a float", () => {
    // 4.55 * 100 is 454.99999999999994 in IEEE 754. Reading the digits avoids the question.
    const result = parseFreightBandGrid("0\t0\t4.55\t150.25\t24\t34");

    expect(result.problems).toEqual([]);
    expect(result.bands[0]?.unitPriceInCents).toBe("455");
    expect(result.bands[0]?.minimumChargeInCents).toBe("15025");
  });

  it("REFUSES a third decimal on money rather than rounding it", () => {
    // Rounding would pick a neighbouring price the forwarder did not quote.
    const result = parseFreightBandGrid("0\t0\t4.505\t150.00\t24\t34");

    expect(result.bands).toEqual([]);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.message).toContain("price per kg");
  });

  it("accepts three decimals on weight, which is a gram", () => {
    const result = parseFreightBandGrid("0.001\t0\t4.50\t150.00\t24\t34");

    expect(result.problems).toEqual([]);
    expect(result.bands[0]?.minBillableWeightGrams).toBe("1");
  });

  it("REFUSES a missing cell rather than zero-filling it", () => {
    // A defaulting importer is how invented data re-enters a surface built to reject it.
    const result = parseFreightBandGrid("0\t0\t4.50\t150.00\t24");

    expect(result.bands).toEqual([]);
    expect(result.problems[0]?.message).toContain("5 columns");
  });

  it("REFUSES a currency symbol and a thousands separator", () => {
    // `1,234` is `1.234` in half the world, so stripping the comma would be a 1000x guess.
    const symbol = parseFreightBandGrid("0\t0\t$4.50\t150.00\t24\t34");
    const separator = parseFreightBandGrid("0\t0\t4.50\t1,150.00\t24\t34");

    expect(symbol.bands).toEqual([]);
    expect(separator.bands).toEqual([]);
    expect(separator.problems[0]?.message).toContain("min charge");
  });

  it("skips a header row, and only when its first cell cannot be a weight", () => {
    const withHeader = parseFreightBandGrid(
      `min kg\tmin cm3\tprice\tmin charge\tdays min\tdays max\n${THREE_CLEAN_ROWS}`,
    );

    expect(withHeader.problems).toEqual([]);
    expect(withHeader.bands).toHaveLength(3);

    // A ladder starting at 0 kg is the common case and must NOT lose its floor band.
    const withoutHeader = parseFreightBandGrid(THREE_CLEAN_ROWS);
    expect(withoutHeader.bands).toHaveLength(3);
    expect(withoutHeader.bands[0]?.minBillableWeightGrams).toBe("0");
  });

  it("refuses more than twenty bands and says how many it saw", () => {
    const rows = Array.from(
      { length: 21 },
      (_unused, index) => `${String(index)}\t0\t4.50\t150.00\t24\t34`,
    ).join("\n");
    const result = parseFreightBandGrid(rows);

    expect(result.bands).toEqual([]);
    expect(result.problems[0]?.message).toContain("21");
  });

  it("tolerates CRLF, blank lines and a trailing newline", () => {
    const result = parseFreightBandGrid(
      `0\t0\t4.50\t150.00\t24\t34\r\n\r\n30\t0\t4.00\t150.00\t24\t34\r\n`,
    );

    expect(result.problems).toEqual([]);
    expect(result.bands).toHaveLength(2);
  });

  it("applies nothing at all when any row is unreadable", () => {
    // All or nothing: a half-applied paste leaves the author reconciling two ladders by eye.
    const result = parseFreightBandGrid(
      `0\t0\t4.50\t150.00\t24\t34\nthirty\t0\t4.00\t150.00\t24\t34`,
    );

    expect(result.bands).toEqual([]);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.rowNumber).toBe(2);
  });

  it("reports an empty paste rather than an empty ladder", () => {
    const result = parseFreightBandGrid("   \n  \n");

    expect(result.bands).toEqual([]);
    expect(result.problems[0]?.message).toBe("Nothing was pasted.");
  });
});
