// Shared form-field styling. Lives in ui/ rather than in a feature folder
// because the R&D wizard steps, the R&D sheets, and creatable-combobox all
// render the same field shape, and the combobox must not depend on any of them.

export const INPUT_CLASS =
  "w-full rounded-lg border border-outline-strong bg-transparent px-3 py-2 text-sm outline-none focus:border-primary-imprint";
export const LABEL_CLASS = "text-xs font-medium text-outline-strong";
