"use client";

import Image from "next/image";

export const RESTRICTED_OPTIONS: { value: boolean; label: string }[] = [
  { value: false, label: "Off" },
  { value: true, label: "On" },
];

type RestrictedPanelProps = {
  /** Whether Restricted Mode is currently on. */
  selected: boolean;
  /** Called with the chosen Restricted Mode state. */
  onSelect: (restricted: boolean) => void;
  /** Invoked by the header back button. */
  onBack: () => void;
};

/**
 * Presentational "Restricted Mode" panel: header, subtitle, and the selectable
 * on/off options.
 */
export function RestrictedPanel({ selected, onSelect, onBack }: RestrictedPanelProps) {
  return (
    <div>
      <header className="flex flex-row gap-4 items-center p-4 border-b border-black/10">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer rounded-full p-1 hover:bg-muted transition-colors"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={24}
            height={24}
          />
        </button>
        <h2 className="text-xl text-secondary-foreground font-medium">Restricted Mode</h2>
      </header>
      <p className="px-4 py-4 text-sm text-muted-foreground">
        Restricted Mode hides potentially mature content. No filter is 100% accurate. This setting
        applies to this browser only.
      </p>
      <ul>
        {RESTRICTED_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <li key={String(option.value)}>
              <button
                type="button"
                onClick={() => onSelect(option.value)}
                className="w-full p-4 flex flex-row gap-4 items-center cursor-pointer hover:bg-muted transition-colors"
              >
                <span className="shrink-0 size-6">
                  {isSelected && (
                    <Image
                      src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt="Selected Restricted Mode option"
                      width={24}
                      height={24}
                    />
                  )}
                </span>
                <span className="text-sm text-secondary-foreground font-medium">
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
