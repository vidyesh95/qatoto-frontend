"use client";

import { useState } from "react";

import Image from "next/image";

import CustomizationSheet from "./customization-sheet";

// "Customization options" block on the product page. Shows the seller-allowed
// customizations as a two-column grid; tapping anywhere opens the sheet where
// the buyer uploads branding/graphics/cards and picks packaging. UI-only mock —
// what a seller permits comes from the backend later; the client never owns it.

const CUSTOMIZATION_OPTIONS = [
  { label: "Custom logo", iconFileName: "android_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
  {
    label: "Custom graphics",
    iconFileName: "comic_bubble_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  { label: "Custom packaging", iconFileName: "package_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
  { label: "Custom cards", iconFileName: "description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
];

export default function CustomizationOptions() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="flex w-full cursor-pointer flex-col py-2 text-left"
      >
        <span className="flex w-full items-center px-4 py-2 lg:px-6">
          <span className="flex-1 text-sm leading-5 tracking-wide text-[#191C1C]">
            Customization options
          </span>
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt=""
          />
        </span>

        <span className="grid w-full grid-flow-col grid-cols-2 grid-rows-2 gap-y-2 px-4 lg:px-6">
          {CUSTOMIZATION_OPTIONS.map((option) => (
            <span key={option.label} className="flex items-center gap-1">
              <Image src={`/icons/${option.iconFileName}`} width={16} height={16} alt="" />
              <span className="text-xs leading-4 tracking-wide text-[#191C1C]">{option.label}</span>
            </span>
          ))}
        </span>
      </button>

      {isSheetOpen && <CustomizationSheet onClose={() => setIsSheetOpen(false)} />}
    </>
  );
}
