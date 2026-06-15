"use client";

import { useState } from "react";

import Image from "next/image";

import ProductDetailsSheet from "./product-details-sheet";

// "Product details" block on the product page. Collapsible header, an "In the
// box" + "Key Features" summary, then an "All product details" row that opens
// the tabbed spec sheet. UI-only mock — real specs come from the backend later.

const IN_THE_BOX =
  "1 × Folding chair (pre-assembled), 4 × floor glides, cleaning cloth, warranty card.";

const KEY_FEATURES = [
  "Powder-coated steel frame, anti-rust finish",
  "Folds flat to 5 cm — stacks up to 12 high",
  "Weight capacity 150 kg, tested to EN 16139",
  "Non-marking floor glides, indoor/outdoor",
  "Pre-assembled — no tools required",
];

export default function ProductDetailsSection() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <details open className="group [&_summary]:list-none">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 lg:px-6">
          <span className="text-sm leading-5 tracking-wide text-[#191C1C]">Product details</span>
          <Image
            src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={22}
            height={22}
            alt=""
            className="transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="flex flex-col gap-4 px-4 pb-2 lg:px-6">
          <div className="flex flex-col gap-1">
            <p className="text-sm leading-5 font-medium tracking-[0.1px] text-[#191C1C]">
              In the box
            </p>
            <p className="text-xs leading-4 tracking-[0.4px] text-[#191C1C]">{IN_THE_BOX}</p>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-sm leading-5 font-medium tracking-[0.1px] text-[#191C1C]">
              Key Features
            </p>
            {KEY_FEATURES.map((feature) => (
              <p key={feature} className="text-xs leading-4 tracking-[0.4px] text-[#191C1C]">
                {feature}
              </p>
            ))}
          </div>
        </div>

        <div className="px-4 lg:px-6">
          <div className="h-px bg-[#CAC4D0]" />
        </div>

        <button
          type="button"
          onClick={() => setIsSheetOpen(true)}
          className="flex w-full cursor-pointer items-center px-4 py-2 text-left lg:px-6"
        >
          <span className="flex-1 text-sm leading-5 tracking-wide text-[#191C1C]">
            All product details
          </span>
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt=""
          />
        </button>

        <div className="px-4 lg:px-6">
          <div className="h-px bg-[#CAC4D0]" />
        </div>
      </details>

      {isSheetOpen && <ProductDetailsSheet onClose={() => setIsSheetOpen(false)} />}
    </>
  );
}
