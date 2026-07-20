import type { Period } from "@/types/anime";

export default function PeriodTabs({
  periods,
  selected,
  onSelect,
}: {
  periods: Period[];
  selected: Period;
  onSelect: (period: Period) => void;
}) {
  return (
    <div className="sticky top-13 z-10 border-b border-border bg-background">
      <div className="flex px-2">
        {periods.map((period) => {
          const isActive = period === selected;
          return (
            <button
              key={period}
              type="button"
              onClick={() => onSelect(period)}
              aria-pressed={isActive}
              className={`relative flex-1 cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? "text-[#00696E]" : "text-[#6F7979] hover:text-foreground"
              }`}
            >
              <span className="relative inline-block">
                {period}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-3 h-0.75 rounded-t-full bg-[#00696E]" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
