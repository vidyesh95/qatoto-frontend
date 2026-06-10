"use client";

import Image from "next/image";

export const INCOGNITO_OPTIONS: { value: boolean; label: string }[] = [
  { value: false, label: "Off" },
  { value: true, label: "On" },
];

type IncognitoPanelProps = {
  /** Whether Incognito Mode is currently on. */
  selected: boolean;
  /** Called with the chosen Incognito Mode state. */
  onSelect: (incognito: boolean) => void;
  /** Invoked by the header back button. */
  onBack: () => void;
};

/**
 * Presentational "Incognito Mode" panel: header, subtitle, and the selectable
 * on/off options.
 *
 * Nothing here is a trust boundary — suppressing watch/search history must be
 * enforced by the Express backend, not this browser-local flag.
 */
export function IncognitoPanel({ selected, onSelect, onBack }: IncognitoPanelProps) {
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
        <h2 className="text-xl font-medium text-secondary-foreground">Incognito Mode</h2>
      </header>
      <p className="px-4 py-4 text-sm text-muted-foreground">
        Incognito Mode stops new activity from being saved to your watch and search history. This
        setting applies to this browser only.
      </p>
      <ul>
        {INCOGNITO_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <li key={String(option.value)}>
              <button
                type="button"
                onClick={() => onSelect(option.value)}
                className="flex flex-row items-center w-full gap-4 p-4 transition-colors cursor-pointer hover:bg-muted"
              >
                <span className="shrink-0 size-6">
                  {isSelected && (
                    <Image
                      src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt="Selected Incognito Mode option"
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
