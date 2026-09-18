import type { WeightBandDraft } from "@/components/commerce/freight/weight-band-editor";

/**
 * A forwarder's tariff pasted straight out of a spreadsheet (§19.12).
 *
 * WHY THIS EXISTS AT ALL. A composer that takes one band at a time is the blocker §19.12 removed,
 * moved one layer up: the routes would exist and the lanes would still never get loaded, because
 * nobody types twenty weight bands by hand. An Excel copy is already TSV on the clipboard, so the
 * cheapest possible importer is a textarea and this function.
 *
 * ⚠️ IT IS A CONVENIENCE OVER AN UNCHANGED CONTRACT. There is no ingest endpoint, no multipart,
 * no parser on the backend and no file stored. What comes out of here is the SAME band array a
 * hand-typed ladder produces and goes through the same route, so every server-side refusal — the
 * future `validFrom`, the zero-weight floor band, the typed divisor — applies to a pasted ladder
 * exactly as it applies to a typed one.
 *
 * ⚠️ AND IT NEVER DEFAULTS A MISSING COLUMN. A defaulting importer is the one way invented data
 * re-enters a surface built to reject it (§19.6: a missing component is named, never defaulted,
 * averaged or extrapolated). Every unreadable cell is a reported problem and the paste is refused
 * whole; there is no partial apply.
 *
 * ## The unit conversions, which are the dangerous part
 *
 * The wire is integer GRAMS and integer CENTS. A forwarder's sheet is in KILOGRAMS and currency
 * units. A kg column read as grams underprices by 1000x, and the result sits inside every bound
 * the server checks — the divisor range, the price floor, the band count — so nothing downstream
 * would refuse it and the lane would quietly sell freight at a thousandth of its tariff.
 *
 * That is why the columns are fixed and labelled with their units rather than sniffed, why money
 * is parsed from the STRING rather than through a float, and why this is a pure function with a
 * test rather than a handler inside a component.
 */

/** The fixed column order. The composer renders this as the template above the textarea. */
export const FREIGHT_BAND_PASTE_COLUMNS = [
  "min kg",
  "min cm³",
  "price per kg",
  "min charge",
  "days min",
  "days max",
] as const;

export interface FreightBandPasteProblem {
  /** 1-based, counting data rows as the author sees them — a skipped header is not row 1. */
  readonly rowNumber: number;
  readonly message: string;
}

export interface FreightBandPasteResult {
  readonly bands: readonly WeightBandDraft[];
  readonly problems: readonly FreightBandPasteProblem[];
}

/** Matches the server's 1..20, restated here so the paste is refused before the request. */
const MAXIMUM_BANDS = 20;

/**
 * Cells split on TAB, because that is what a spreadsheet puts on the clipboard. A comma split is
 * deliberately NOT offered: thousands separators and decimal commas make CSV ambiguous for exactly
 * the two column types this grid is made of, and guessing wrong is a silent 1000x again.
 */
function splitCells(line: string): readonly string[] {
  return line.split("\t").map((cell) => cell.trim());
}

/**
 * A decimal quantity to an integer in the smallest unit, parsed from the STRING.
 *
 * ⚠️ NOT `Math.round(value * 100)`. `4.55 * 100` is `454.99999999999994` in IEEE 754, and rounding
 * hides that at the cost of also silently accepting `4.555`. Reading the digits keeps a third
 * decimal a REFUSAL rather than a rounding — a forwarder who typed one meant something this grid
 * cannot express, and quietly picking a neighbouring price is the invented number §19.6 forbids.
 *
 * Accepts an optional sign-free integer part, an optional fraction of at most `scale` digits, and
 * a leading `+`-free form only. Thousands separators are refused rather than stripped: `1,234` is
 * `1.234` in half the world.
 */
function parseScaledDecimal(raw: string, scale: number): number | null {
  const text = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;

  const [wholePart = "", fractionPart = ""] = text.split(".");
  if (fractionPart.length > scale) return null;

  const paddedFraction = fractionPart.padEnd(scale, "0");
  const combined = `${wholePart}${paddedFraction}`;
  // Strip leading zeros so a long but small number does not trip the safe-integer check.
  const normalized = combined.replace(/^0+(?=\d)/, "");
  const value = Number(normalized);
  return Number.isSafeInteger(value) ? value : null;
}

/** A whole count — transit days. Decimals are refused rather than truncated. */
function parseWholeCount(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) ? value : null;
}

/**
 * A header row is skipped ONLY when its first cell cannot be a weight. A sheet whose first data
 * row happens to start at 0 kg is the common case, so sniffing anything cleverer would eat a real
 * band.
 */
function looksLikeHeaderRow(cells: readonly string[]): boolean {
  const firstCell = cells[0]?.trim() ?? "";
  return firstCell.length > 0 && parseScaledDecimal(firstCell, 3) === null;
}

/**
 * Parse a pasted grid into editor drafts.
 *
 * DRAFTS, NOT WIRE BANDS, and that is deliberate: the paste lands in the SAME editor state a typed
 * ladder uses, so it can be reviewed and corrected before submit, and `collectBands` remains the
 * single place a ladder becomes a payload. Two parsers to the wire would be two chances to disagree.
 *
 * Never throws. Never partially applies — any problem means `bands` is empty.
 */
export function parseFreightBandGrid(pastedText: string): FreightBandPasteResult {
  const problems: FreightBandPasteProblem[] = [];
  const bands: WeightBandDraft[] = [];

  const lines = pastedText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    // A trailing newline and blank separator rows are the normal shape of a clipboard copy.
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { bands: [], problems: [{ rowNumber: 0, message: "Nothing was pasted." }] };
  }

  const dataLines =
    looksLikeHeaderRow(splitCells(lines[0] ?? "")) && lines.length > 1 ? lines.slice(1) : lines;

  if (dataLines.length > MAXIMUM_BANDS) {
    problems.push({
      rowNumber: 0,
      message: `A card takes at most ${String(MAXIMUM_BANDS)} bands, and this paste has ${String(dataLines.length)}.`,
    });
  }

  for (const [lineIndex, line] of dataLines.entries()) {
    const rowNumber = lineIndex + 1;
    const cells = splitCells(line);

    if (cells.length !== FREIGHT_BAND_PASTE_COLUMNS.length) {
      problems.push({
        rowNumber,
        message: `Row ${String(rowNumber)} has ${String(cells.length)} columns; this grid takes ${String(FREIGHT_BAND_PASTE_COLUMNS.length)} (${FREIGHT_BAND_PASTE_COLUMNS.join(", ")}).`,
      });
      continue;
    }

    // Kilograms to grams, cubic centimetres, then two money columns to cents.
    const minWeightGrams = parseScaledDecimal(cells[0] ?? "", 3);
    const minVolumeCubicCm = parseScaledDecimal(cells[1] ?? "", 0);
    const unitPriceInCents = parseScaledDecimal(cells[2] ?? "", 2);
    const minimumChargeInCents = parseScaledDecimal(cells[3] ?? "", 2);
    const transitDaysMin = parseWholeCount(cells[4] ?? "");
    const transitDaysMax = parseWholeCount(cells[5] ?? "");

    const unreadable: string[] = [];
    if (minWeightGrams === null) unreadable.push("min kg");
    if (minVolumeCubicCm === null) unreadable.push("min cm³");
    if (unitPriceInCents === null) unreadable.push("price per kg");
    if (minimumChargeInCents === null) unreadable.push("min charge");
    if (transitDaysMin === null) unreadable.push("days min");
    if (transitDaysMax === null) unreadable.push("days max");

    if (
      minWeightGrams === null ||
      minVolumeCubicCm === null ||
      unitPriceInCents === null ||
      minimumChargeInCents === null ||
      transitDaysMin === null ||
      transitDaysMax === null
    ) {
      problems.push({
        rowNumber,
        message: `Row ${String(rowNumber)}: couldn't read ${unreadable.join(", ")}. Every column needs a plain number — no currency symbols, no thousands separators, at most two decimals on money and three on weight.`,
      });
      continue;
    }

    bands.push({
      id: crypto.randomUUID(),
      minBillableWeightGrams: String(minWeightGrams),
      minVolumeCubicCm: String(minVolumeCubicCm),
      unitPriceInCents: String(unitPriceInCents),
      minimumChargeInCents: String(minimumChargeInCents),
      transitDaysMin: String(transitDaysMin),
      transitDaysMax: String(transitDaysMax),
    });
  }

  // All or nothing. A half-applied paste leaves the author reconciling two ladders in their head.
  if (problems.length > 0) return { bands: [], problems };

  return { bands, problems: [] };
}
