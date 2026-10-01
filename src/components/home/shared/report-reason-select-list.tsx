export interface ReportReasonSelectListProps<TReason extends string> {
  readonly reasons: readonly TReason[];
  readonly reasonLabels: Record<TReason, string>;
  readonly selectedReason: TReason | null;
  readonly onSelectReason: (reason: TReason) => void;
}

export function ReportReasonSelectList<TReason extends string>({
  reasons,
  reasonLabels,
  selectedReason,
  onSelectReason,
}: ReportReasonSelectListProps<TReason>) {
  return (
    <ul>
      {reasons.map((reason) => {
        const isSelected = selectedReason === reason;
        return (
          <li key={reason}>
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectReason(reason)}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted"
            >
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  isSelected ? "border-foreground" : "border-border"
                }`}
              >
                {isSelected && <span className="size-2 rounded-full bg-foreground" />}
              </span>
              <span className="text-sm text-foreground">{reasonLabels[reason]}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
