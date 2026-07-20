// Compact dark rating pill (e.g. "4.8 ★").
export default function RatingBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-[#4A6364] p-1 text-xs font-medium tracking-wide text-white">
      {value}
      <span aria-hidden className="text-white">
        ★
      </span>
    </span>
  );
}
