// TRANSPORT: props-only — pure helper functions for combobox option manipulation.

/** Appends a committed name unless the list already has it (case-insensitive).
 *  For owners whose option identity IS the name — a free-text taxonomy with no
 *  server-side row behind it — creating is just this append. Owners backed by a
 *  real record do NOT use this: their id comes from the server. */
export function appendOptionNameIfNew(
  optionNames: string[],
  committedOptionName: string,
): string[] {
  return optionNames.some(
    (existingOptionName) => existingOptionName.toLowerCase() === committedOptionName.toLowerCase(),
  )
    ? optionNames
    : [...optionNames, committedOptionName];
}
