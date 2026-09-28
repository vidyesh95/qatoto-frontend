// The pill switch the auth pages and account panels use for "Remember me". It was five copies of
// the same 40 lines, which is why its colours never got tokenised: a fix to one would have left
// four behind.
//
// The caller renders the visible `<label htmlFor={id}>` beside it; `accessibleName` repeats that
// text as the input's `aria-label`, because a label in another component's render is one the
// scanner cannot see and an unnamed checkbox is what it would report. The thumb takes `primary-imprint-foreground` when checked, so it stays the
// contrast colour on the `primary-imprint` track in both themes; `bg-white` went dark-on-bright
// the moment `.dark` brightened the track.

export default function ToggleSwitch({
  id,
  accessibleName,
  isChecked,
  onCheckedChange,
}: {
  readonly id: string;
  readonly accessibleName: string;
  readonly isChecked: boolean;
  readonly onCheckedChange: (isChecked: boolean) => void;
}) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        id={id}
        checked={isChecked}
        onChange={(changeEvent) => onCheckedChange(changeEvent.target.checked)}
        aria-label={accessibleName}
        className="peer sr-only"
      />
      {/* Track */}
      <div className="h-8 w-13 rounded-full border-2 border-outline-strong bg-muted transition-colors duration-200 ease-in-out peer-checked:border-primary-imprint peer-checked:bg-primary-imprint"></div>

      {/* Thumb */}
      <div className="pointer-events-none absolute top-0.75 left-0.75 flex size-6.5 items-center justify-center rounded-full bg-outline-strong shadow-sm transition-transform duration-200 ease-in-out peer-checked:translate-x-5 peer-checked:bg-primary-imprint-foreground peer-checked:[&>svg.check-icon]:opacity-100 peer-checked:[&>svg.x-icon]:opacity-0">
        {/* X icon, shown when unchecked */}
        <svg
          className="x-icon absolute size-4 text-card opacity-100 transition-opacity duration-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        {/* Check icon, shown when checked */}
        <svg
          className="check-icon absolute size-4 text-primary-imprint opacity-0 transition-opacity duration-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </label>
  );
}
