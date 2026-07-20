import type { Day } from "@/types/anime";

export default function DayTabs({
  days,
  selected,
  onSelect,
}: {
  days: Day[];
  selected: Day;
  onSelect: (day: Day) => void;
}) {
  return (
    <div className="sticky top-13 z-10 border-b border-border bg-background">
      <div className="flex scrollbar-none overflow-x-auto px-2">
        {days.map((day) => {
          const isActive = day === selected;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isActive}
              className={`relative min-w-16 flex-1 cursor-pointer px-4 py-3 text-sm font-medium tracking-wide transition-colors ${
                isActive ? "text-[#00696E]" : "text-[#6F7979] hover:text-foreground"
              }`}
            >
              <span className="relative inline-block">
                {day}
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
