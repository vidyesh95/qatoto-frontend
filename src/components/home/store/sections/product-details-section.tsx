"use client";

// TRANSPORT: mock — "In the box" is local copy; description and key features are real props.

import { useState } from "react";

import Image from "next/image";

import ProductDetailsSheet from "@/components/home/store/sheets/product-details-sheet";

/**
 * The "Product details" block on the PDP.
 *
 * `description` and `keyFeatures` are the SERVER's — `product.description` and
 * `product.keyFeatures` off the public projection. Only "In the box" is still local copy: the
 * backend has no pack-contents field, and a specification row is the likeliest home for it.
 *
 * The "All product details" row opens the grouped spec sheet, which stays mock until the backend
 * can group specifications (see that file).
 */
const IN_THE_BOX =
  "1 × Folding chair (pre-assembled), 4 × floor glides, cleaning cloth, warranty card.";

export default function ProductDetailsSection({
  description,
  keyFeatures,
}: {
  description: string | null;
  keyFeatures: readonly string[];
}) {
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
          {description ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-5 font-medium tracking-[0.1px] text-[#191C1C]">
                Description
              </p>
              <p className="text-xs leading-4 tracking-[0.4px] whitespace-pre-wrap text-[#191C1C]">
                {description}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <p className="text-sm leading-5 font-medium tracking-[0.1px] text-[#191C1C]">
              In the box
            </p>
            <p className="text-xs leading-4 tracking-[0.4px] text-[#191C1C]">{IN_THE_BOX}</p>
          </div>

          {keyFeatures.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-5 font-medium tracking-[0.1px] text-[#191C1C]">
                Key Features
              </p>
              {keyFeatures.map((feature) => (
                <p key={feature} className="text-xs leading-4 tracking-[0.4px] text-[#191C1C]">
                  {feature}
                </p>
              ))}
            </div>
          ) : null}
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
