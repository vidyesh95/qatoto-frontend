"use client";

import Image from "next/image";

export const AI_ASSIST_OPTIONS: { value: boolean; label: string }[] = [
  { value: false, label: "Off" },
  { value: true, label: "On" },
];

type AiAssistPanelProps = {
  /** Whether AI Assist Mode is currently on. */
  selected: boolean;
  /** Called with the chosen AI Assist Mode state. */
  onSelect: (on: boolean) => void;
  /** Invoked by the header back button. */
  onBack: () => void;
};

/**
 * Presentational "AI Assist Mode" panel: header, subtitle, and the selectable
 * on/off options.
 *
 * Turning this on mounts a site-wide assistant that helps navigate Qatoto and
 * answers questions. Nothing here is a trust boundary — any answer or action
 * the assistant produces must be re-validated and authorized by the Express
 * backend, not this browser-local flag.
 */
export function AiAssistPanel({ selected, onSelect, onBack }: AiAssistPanelProps) {
  return (
    <div>
      <header className="sticky top-0 z-10 bg-background flex flex-row gap-4 items-center p-4 border-b border-black/10">
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
        <h2 className="text-xl text-secondary-foreground font-medium">AI Assist Mode</h2>
      </header>
      <p className="px-4 py-4 text-sm text-muted-foreground">
        AI Assist Mode adds a site-wide assistant that helps you navigate Qatoto and answers your
        questions. This setting applies to this browser only.
      </p>
      <ul>
        {AI_ASSIST_OPTIONS.map((option) => {
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
                      alt="Selected AI Assist Mode option"
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
