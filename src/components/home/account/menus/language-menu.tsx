"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Display-language options shown in the language panel. */
export const LANGUAGE_OPTIONS: string[] = [
  "Abkhaz",
  "Acehnese",
  "Acholi",
  "Afar",
  "Afrikaans",
  "Albanian",
  "Alur",
  "Amharic",
  "Arabic",
  "Armenian",
  "Assamese",
  "Avar",
  "Awadhi",
  "Aymara",
  "Azerbaijani",
  "Balinese",
  "Baluchi",
  "Bambara",
  "Baoulé",
  "Bashkir",
  "Basque",
  "Batak Karo",
  "Batak Simalungun",
  "Batak Toba",
  "Belarusian",
  "Bemba",
  "Bengali",
  "Betawi",
  "Bhojpuri",
  "Bikol",
  "Bosnian",
  "Breton",
  "Bulgarian",
  "Buryat",
  "Cantonese",
  "Catalan",
  "Cebuano",
  "Chamorro",
  "Chechen",
  "Chichewa",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Chuukese",
  "Chuvash",
  "Corsican",
  "Crimean Tatar (Cyrillic)",
  "Crimean Tatar (Latin)",
  "Croatian",
  "Czech",
  "Danish",
  "Dari",
  "Dhivehi",
  "Dinka",
  "Dogri",
  "Dombe",
  "Dutch",
  "Dyula",
  "Dzongkha",
  "English",
  "Esperanto",
  "Estonian",
  "Ewe",
  "Faroese",
  "Fijian",
  "Filipino",
  "Finnish",
  "Fon",
  "French",
  "French (Canada)",
  "Frisian",
  "Friulian",
  "Fulani",
  "Ga",
  "Galician",
  "Georgian",
  "German",
  "Greek",
  "Guarani",
  "Gujarati",
  "Haitian Creole",
  "Hakha Chin",
  "Hausa",
  "Hawaiian",
  "Hebrew",
  "Hiligaynon",
  "Hindi",
  "Hmong",
  "Hungarian",
  "Hunsrik",
  "Iban",
  "Icelandic",
  "Igbo",
  "Ilocano",
  "Indonesian",
  "Inuktut (Latin)",
  "Inuktut (Syllabics)",
  "Irish",
  "Italian",
  "Jamaican Patois",
  "Japanese",
  "Javanese",
  "Jingpo",
  "Kalaallisut",
  "Kannada",
  "Kanuri",
  "Kapampangan",
  "Kazakh",
  "Khasi",
  "Khmer",
  "Kiga",
  "Kikongo",
  "Kinyarwanda",
  "Kituba",
  "Kokborok",
  "Komi",
  "Konkani",
  "Korean",
  "Krio",
  "Kurdish (Kurmanji)",
  "Kurdish (Sorani)",
  "Kyrgyz",
  "Lao",
  "Latgalian",
  "Latin",
  "Latvian",
  "Ligurian",
  "Limburgish",
  "Lingala",
  "Lithuanian",
  "Lombard",
  "Luganda",
  "Luo",
  "Luxembourgish",
  "Macedonian",
  "Madurese",
  "Maithili",
  "Makassar",
  "Malagasy",
  "Malay",
  "Malay (Jawi)",
  "Malayalam",
  "Maltese",
  "Mam",
  "Manx",
  "Maori",
  "Marathi",
  "Marshallese",
  "Marwadi",
  "Mauritian Creole",
  "Meadow Mari",
  "Meiteilon (Manipuri)",
  "Minang",
  "Mizo",
  "Mongolian",
  "Myanmar (Burmese)",
  "Nahuatl (Eastern Huasteca)",
  "Ndau",
  "Ndebele (South)",
  "Nepalbhasa (Newari)",
  "Nepali",
  "NKo",
  "Norwegian",
  "Nuer",
  "Occitan",
  "Odia (Oriya)",
  "Oromo",
  "Ossetian",
  "Pangasinan",
  "Papiamento",
  "Pashto",
  "Persian",
  "Polish",
  "Portuguese (Brazil)",
  "Portuguese (Portugal)",
  "Punjabi (Gurmukhi)",
  "Punjabi (Shahmukhi)",
  "Quechua",
  "Qʼeqchiʼ",
  "Romani",
  "Romanian",
  "Rundi",
  "Russian",
  "Sami (North)",
  "Samoan",
  "Sango",
  "Sanskrit",
  "Santali (Latin)",
  "Santali (Ol Chiki)",
  "Scots Gaelic",
  "Sepedi",
  "Serbian",
  "Sesotho",
  "Seychellois Creole",
  "Shan",
  "Shona",
  "Sicilian",
  "Silesian",
  "Sindhi",
  "Sinhala",
  "Slovak",
  "Slovenian",
  "Somali",
  "Spanish",
  "Sundanese",
  "Susu",
  "Swahili",
  "Swati",
  "Swedish",
  "Tahitian",
  "Tajik",
  "Tamazight",
  "Tamazight (Tifinagh)",
  "Tamil",
  "Tatar",
  "Telugu",
  "Tetum",
  "Thai",
  "Tibetan",
  "Tigrinya",
  "Tiv",
  "Tok Pisin",
  "Tongan",
  "Tshiluba",
  "Tsonga",
  "Tswana",
  "Tulu",
  "Tumbuka",
  "Turkish",
  "Turkmen",
  "Tuvan",
  "Twi",
  "Udmurt",
  "Ukrainian",
  "Urdu",
  "Uyghur",
  "Uzbek",
  "Venda",
  "Venetian",
  "Vietnamese",
  "Waray",
  "Welsh",
  "Wolof",
  "Xhosa",
  "Yakut",
  "Yiddish",
  "Yoruba",
  "Yucatec Maya",
  "Zapotec",
  "Zulu",
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
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-black/10 bg-background p-4">
        <button
          type="button"
          onClick={onBack}
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
                className="flex w-full cursor-pointer flex-row items-center gap-4 p-4 transition-colors hover:bg-muted"
              >
                <span className="size-6 shrink-0">
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
  const [language, setLanguage] = useState("English");

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
      className="absolute top-12 right-0 z-50 max-h-[calc(100dvh-4rem)] w-95 overflow-y-auto rounded-lg border border-black/10 bg-background shadow-lg"
    >
      <LanguagePanel selected={language} onSelect={setLanguage} onBack={onClose} />
    </div>
  );
}
