import type { FavoriteTab } from "@/types/anime";

export default function FavoriteTabs({
  tabs,
  selected,
  onSelect,
}: {
  tabs: FavoriteTab[];
  selected: FavoriteTab;
  onSelect: (tab: FavoriteTab) => void;
}) {
  return (
    <div className="sticky top-13 z-10 border-b border-border bg-background">
      <div className="flex px-2">
        {tabs.map((tab) => {
          const isActive = tab === selected;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onSelect(tab)}
              aria-pressed={isActive}
              className={`relative flex-1 cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? "text-[#00696E]" : "text-[#6F7979] hover:text-foreground"
              }`}
            >
              <span className="relative inline-block">
                {tab}
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
