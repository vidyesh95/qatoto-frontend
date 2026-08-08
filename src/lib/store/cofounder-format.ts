// TRANSPORT: props-only — pure formatting, no network.
//
// ONE FUNCTION, and it is here rather than in `format.ts` because `format.ts` says what it is for in
// its own header: money, rates, ranges and country codes shared across eighteen store surfaces.
// Basis points are one surface's unit, and a formatter used in one place belongs beside that place.
//
// If a second surface ever needs it — an allocation ledger, say — this moves to `format.ts` and this
// file goes away.

/**
 * Basis points as a percentage, for an EQUITY EXPECTATION.
 *
 * 100 bp = 1%. The wire carries an integer for the reason money carries integer cents: `0.075` and
 * `7.5` are one careless division apart, and an equity figure wrong by two orders of magnitude is
 * the worst thing this surface could print.
 *
 * A WHOLE PERCENT SHOWS NO DECIMAL AND A FRACTIONAL ONE SHOWS EXACTLY ONE. `1200` renders as "12%",
 * `1250` as "12.5%" — never "12.0%", which reads as spurious precision on a number somebody guessed.
 *
 * THE CALLER SUPPLIES THE VERB. This returns "12%" and nothing more, so the surrounding copy has to
 * say "hoping for" — the formatter cannot accidentally imply a holding.
 */
export function formatEquityExpectationLabel(basisPoints: number): string {
  const percentage = basisPoints / 100;
  const hasFractionalPart = basisPoints % 100 !== 0;
  return `${percentage.toFixed(hasFractionalPart ? 1 : 0)}%`;
}
