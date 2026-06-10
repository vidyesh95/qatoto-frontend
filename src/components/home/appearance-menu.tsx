"use client";

import Image from "next/image";

/** Browser-local appearance preference. */
export type Theme = "device" | "dark" | "light";

export const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "device", label: "Use device theme" },
  { value: "dark", label: "Dark theme" },
  { value: "light", label: "Light theme" },
];

/** Short label shown next to "Appearance:" on the main menu row. */
export const THEME_SUMMARY: Record<Theme, string> = {
  device: "Device theme",
  dark: "Dark theme",
  light: "Light theme",
};

type AppearancePanelProps = {
  /** Currently selected theme. */
  selected: Theme;
  /** Called with the chosen theme. */
  onSelect: (theme: Theme) => void;
  /** Invoked by the header back button. */
  onBack: () => void;
};

/**
 * Presentational "Appearance" panel: header, subtitle, and the selectable list
 * of theme options.
 */
export function AppearancePanel({ selected, onSelect, onBack }: AppearancePanelProps) {
  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 p-4 border-b bg-background border-black/10">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="p-1 transition-colors rounded-full cursor-pointer hover:bg-muted"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={24}
            height={24}
          />
        </button>
        <h2 className="text-xl font-medium text-secondary-foreground">Appearance</h2>
      </header>
      <p className="px-4 py-4 text-sm text-muted-foreground">
        Setting applies to this browser only
      </p>
      <ul>
        {THEME_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => onSelect(option.value)}
                className="flex flex-row items-center w-full gap-4 p-4 transition-colors cursor-pointer hover:bg-muted"
              >
                <span className="shrink-0 size-6">
                  {isSelected && (
                    <Image
                      src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt="Selected theme"
                      width={24}
                      height={24}
                    />
                  )}
                </span>
                <span className="text-sm font-medium text-secondary-foreground">
                  {option.label}
                  {isSelected && <span className="sr-only"> (selected)</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
