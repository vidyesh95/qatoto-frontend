export interface ModerationStatusTabFilterProps<TStatus extends string> {
  readonly statuses: readonly TStatus[];
  readonly statusLabels: Record<TStatus, string>;
  readonly currentStatus: TStatus;
  readonly onStatusChange: (status: TStatus) => void;
  readonly quietButtonClass: string;
}

export function ModerationStatusTabFilter<TStatus extends string>({
  statuses,
  statusLabels,
  currentStatus,
  onStatusChange,
  quietButtonClass,
}: ModerationStatusTabFilterProps<TStatus>) {
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((candidate) => (
        <button
          key={candidate}
          type="button"
          onClick={() => {
            onStatusChange(candidate);
          }}
          aria-pressed={currentStatus === candidate}
          className={`${quietButtonClass} ${currentStatus === candidate ? "bg-primary" : ""}`}
        >
          {statusLabels[candidate]}
        </button>
      ))}
    </div>
  );
}
