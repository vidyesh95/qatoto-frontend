/** Converts a 0-indexed position into a human-readable ordinal string (e.g. 0 -> "1st", 1 -> "2nd"). */
export function toOrdinalLabel(zeroBasedPosition: number): string {
  const displayPosition = zeroBasedPosition + 1;
  const lastTwoDigits = displayPosition % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${String(displayPosition)}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[displayPosition % 10] ?? "th";
  return `${String(displayPosition)}${suffix}`;
}
