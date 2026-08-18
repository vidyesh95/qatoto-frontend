// TRANSPORT: props-only — pure label formatting for the metrics charts.

/** "2026-08-12" → "Aug 12". The year is dropped; every window here is inside one. */
export function formatShortDayLabel(isoDate: string): string {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!dateParts) return isoDate;
  const [, , month, day] = dateParts;
  const monthAbbreviations = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthAbbreviations[Number(month) - 1] ?? month} ${Number(day)}`;
}

/** `7` → `"07:00"`. Padded so every hour label is the same width. */
export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * How often the band axis prints a label.
 *
 * ABOUT SIX LABELS, WHATEVER THE WINDOW. Ninety daily bars in a dashboard column give each band
 * roughly eight pixels, and a label per band would render as a grey smear. The exact values are in
 * the table the frame renders for screen readers, so nothing is lost by printing fewer.
 */
export function labelEveryForBandCount(bandCount: number): number {
  return Math.max(1, Math.ceil(bandCount / 6));
}
