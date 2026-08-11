// TRANSPORT: props-only — holds the open/closed state for the customization sheet.
"use client";

// The client half of `customization-options.tsx`.
//
// Split out so the SECTION can stay a server component: it renders server-owned option data and
// needs no interactivity of its own, and only the "does the sheet exist right now" boolean is
// client state. The section passes its already-rendered markup in as `children`.

import { useState } from "react";

import CustomizationSheet from "@/components/home/store/sheets/customization-sheet";
import type { ProductCustomizationOption } from "@/lib/store/products.schemas";
import type { ReactNode } from "react";

export default function CustomizationOptionsOpener({
  options,
  children,
}: {
  readonly options: readonly ProductCustomizationOption[];
  readonly children: ReactNode;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="flex w-full cursor-pointer flex-col py-2 text-left"
      >
        {children}
      </button>

      {isSheetOpen && (
        <CustomizationSheet options={options} onClose={() => setIsSheetOpen(false)} />
      )}
    </>
  );
}
