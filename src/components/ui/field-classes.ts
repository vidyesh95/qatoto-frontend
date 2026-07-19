// Shared form-field styling. Lives in ui/ rather than in a feature folder
// because the R&D wizard steps, the R&D sheets, and creatable-combobox all
// render the same field shape, and the combobox must not depend on any of them.

export const INPUT_CLASS =
  "w-full rounded-lg border border-[#6F7979] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#00696E]";
export const LABEL_CLASS = "text-xs font-medium text-[#6F7979]";
