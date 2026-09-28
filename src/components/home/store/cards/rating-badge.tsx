// TRANSPORT: props-only — renders a rating string it is handed, no network.
// Compact dark rating pill (e.g. "4.8 ★").
export default function RatingBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-muted-foreground p-1 text-xs font-medium tracking-wide text-card">
      {value}
      <span aria-hidden className="text-card">
        ★
      </span>
    </span>
  );
}
