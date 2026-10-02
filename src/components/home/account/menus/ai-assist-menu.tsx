"use client";

import Image from "next/image";

import MascotAppearanceControls from "@/components/assistant/mascot-appearance-controls";
import type { MascotSize, MascotSpeed } from "@/lib/browser-preferences";

const AI_ASSIST_OPTIONS: { value: boolean; label: string }[] = [
  { value: false, label: "Off" },
  { value: true, label: "On" },
];

/**
 * Where the panel is shown. `menu`: inside the signed-in account menu, with its own header and a
 * Back button. `sheet`: inside `AiAssistSheet` (the signed-out navbar button and the sidebar row),
 * whose `ModalSheet` already supplies the title and the close control.
 */
type AiAssistPanelPlacement =
  | { readonly variant: "menu"; readonly onBack: () => void }
  | { readonly variant: "sheet" };

type AiAssistPanelProps = AiAssistPanelPlacement & {
  /** Whether AI Assist Mode is currently on. */
  selected: boolean;
  /** Called with the chosen AI Assist Mode state. */
  onSelect: (on: boolean) => void;
  /** Keeps radio names and heading ids unique if two copies are ever on screen together. */
  idPrefix: string;
  /** The mascot's size and speed, shared with the assistant panel's own appearance section. */
  mascotSize: MascotSize;
  mascotSpeed: MascotSpeed;
  onMascotSizeChange: (mascotSize: MascotSize) => void;
  onMascotSpeedChange: (mascotSpeed: MascotSpeed) => void;
};

/**
 * Presentational "AI Assist Mode" panel: header, subtitle, the on/off options, and the mascot's
 * size and speed.
 *
 * Turning this on mounts the site-wide assistant (`src/components/assistant/`, via
 * `assistant-gate.tsx` in the root layout): a character that reacts to what the viewer does,
 * answers questions and links them around Qatoto. Questions are answered by Chrome's built-in
 * Gemini Nano on the device when it can, otherwise by Google Gemini through Qatoto for a Premium
 * AI account only, and the subtitle says both. Anyone may switch it on, signed in or not. The appearance controls are always shown, so the look can be
 * picked before switching it on. Nothing here is a trust boundary — any answer or action the
 * assistant produces must be re-validated and authorized by the Express backend, not this
 * browser-local flag.
 */
export function AiAssistPanel(props: AiAssistPanelProps) {
  const {
    selected,
    onSelect,
    idPrefix,
    mascotSize,
    mascotSpeed,
    onMascotSizeChange,
    onMascotSpeedChange,
  } = props;
  return (
    <div>
      {props.variant === "menu" && (
        <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-border bg-background p-4">
          <button
            type="button"
            onClick={props.onBack}
            aria-label="Back"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
          <h2 className="text-xl font-medium text-secondary-foreground">AI Assist Mode</h2>
        </header>
      )}
      <p className="px-4 py-4 text-sm text-muted-foreground">
        AI Assist Mode adds a character to the corner of the screen that reacts to what you do and
        links you around Qatoto. It answers questions with Chrome&apos;s built-in model on desktop,
        or with Google Gemini on Premium AI accounts. This setting applies to this browser only.
      </p>
      <ul>
        {AI_ASSIST_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <li key={String(option.value)}>
              <button
                type="button"
                onClick={() => onSelect(option.value)}
                className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
              >
                <span className="size-6 shrink-0">
                  {isSelected && (
                    <Image
                      src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt="Selected AI Assist Mode option"
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
      <section
        aria-labelledby={`${idPrefix}-appearance-heading`}
        className="border-t border-border p-4"
      >
        <h3
          id={`${idPrefix}-appearance-heading`}
          className="text-sm font-medium text-secondary-foreground"
        >
          Appearance
        </h3>
        {!selected && (
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Applies once AI Assist Mode is on.
          </p>
        )}
        <div className="mt-3">
          <MascotAppearanceControls
            idPrefix={idPrefix}
            mascotSize={mascotSize}
            mascotSpeed={mascotSpeed}
            onMascotSizeChange={onMascotSizeChange}
            onMascotSpeedChange={onMascotSpeedChange}
          />
        </div>
      </section>
    </div>
  );
}
