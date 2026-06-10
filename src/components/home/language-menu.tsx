"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Display-language options shown in the language panel. */
export const LANGUAGE_OPTIONS: string[] = [
  "Afrikaans",
  "Azərbaycan",
  "Bahasa Indonesia",
  "Bahasa Malaysia",
  "Bosanski",
  "Català",
  "Čeština",
  "Dansk",
  "Deutsch",
  "Eesti",
  "English (India)",
  "English (UK)",
  "English (US)",
  "Español (España)",
  "Español (Latinoamérica)",
  "Español (US)",
  "Euskara",
  "Filipino",
  "Français (Canada)",
  "Français (France)",
  "Galego",
  "Hrvatski",
  "IsiZulu",
  "Íslenska",
  "Italiano",
  "Kiswahili",
  "Latviešu",
  "Lietuvių",
  "Magyar",
  "Nederlands",
  "Norsk",
  "O'zbek",
  "Polski",
  "Português (Brasil)",
  "Português (Portugal)",
  "Română",
  "Shqip",
  "Slovenčina",
  "Slovenščina",
  "Srpski",
  "Suomi",
  "Svenska",
  "Tiếng Việt",
  "Türkçe",
];

type LanguagePanelProps = {
  /** Currently selected language label. */
  selected: string;
  /** Called with the chosen language label. */
  onSelect: (language: string) => void;
  /** Invoked by the header back button. */
  onBack: () => void;
};

/**
 * Presentational "Display language" panel: header, subtitle, and the selectable
 * list of languages. Shared by the navbar popover and the account menu.
 */
export function LanguagePanel({ selected, onSelect, onBack }: LanguagePanelProps) {
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
        <h2 className="text-xl font-medium text-secondary-foreground">Display language</h2>
      </header>
      <p className="px-4 py-4 text-sm text-muted-foreground">
        Buttons and display text on this browser
      </p>
      <ul>
        {LANGUAGE_OPTIONS.map((option) => {
          const isSelected = selected === option;
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => onSelect(option)}
                className="flex flex-row items-center w-full gap-4 p-4 transition-colors cursor-pointer hover:bg-muted"
              >
                <span className="shrink-0 size-6">
                  {isSelected && (
                    <Image
                      src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt="Selected language"
                      width={24}
                      height={24}
                    />
                  )}
                </span>
                <span className="text-sm font-medium text-secondary-foreground">
                  {option}
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

type LanguageMenuProps = {
  /** Called when the menu should close — e.g. an outside click or back press. */
  onClose: () => void;
};

/**
 * Standalone "Display language" popover anchored to the navbar translate button.
 * Closes on outside click or the header back button.
 */
export default function LanguageMenu({ onClose }: LanguageMenuProps) {
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState("English (US)");

  useEffect(() => {
    const handleClickOutside = (mouseEvent: MouseEvent) => {
      const clickTarget = mouseEvent.target;
      const clickedOutsidePanel =
        clickTarget instanceof Node &&
        menuPanelRef.current &&
        !menuPanelRef.current.contains(clickTarget);

      if (clickedOutsidePanel) onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuPanelRef}
      className="absolute right-0 top-12 z-50 w-95 max-h-[calc(100dvh-4rem)] overflow-y-auto bg-background border border-black/10 rounded-lg shadow-lg"
    >
      <LanguagePanel selected={language} onSelect={setLanguage} onBack={onClose} />
    </div>
  );
}
