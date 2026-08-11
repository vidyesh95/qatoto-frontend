// TRANSPORT: props-only — renders server-owned values, no network.
"use client";

// "Product details" block: a collapsible header, the description and key features, then an "All
// product details" row that opens the tabbed spec sheet.
//
// "IN THE BOX" IS GONE, AND ITS ABSENCE IS THE POINT. The mock rendered a hardcoded box-contents
// paragraph; there is no `boxContents` column and no field for it on the projection. A seller who
// wants to state it does so as a specification row or in the description, both of which render
// below. Inventing a heading for data that does not exist is how a field nobody can fill ends up
// looking broken on every product.

import { useState } from "react";

import Image from "next/image";

import ProductDetailsSheet from "@/components/home/store/sheets/product-details-sheet";
import type { StoreProductDetail } from "@/lib/store/products.schemas";

export default function ProductDetailsSection({
  product,
}: {
  readonly product: StoreProductDetail;
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const hasDescription = product.description !== null && product.description.trim().length > 0;
  const hasKeyFeatures = product.keyFeatures.length > 0;
  const hasSpecifications = product.specifications.length > 0;

  if (!hasDescription && !hasKeyFeatures && !hasSpecifications) return null;

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
          {hasDescription && (
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-5 font-medium tracking-[0.1px] text-[#191C1C]">
                About this product
              </p>
              <p className="text-xs leading-4 tracking-[0.4px] whitespace-pre-line text-[#191C1C]">
                {product.description}
              </p>
            </div>
          )}

          {hasKeyFeatures && (
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-5 font-medium tracking-[0.1px] text-[#191C1C]">
                Key features
              </p>
              {product.keyFeatures.map((keyFeature) => (
                <p key={keyFeature} className="text-xs leading-4 tracking-[0.4px] text-[#191C1C]">
                  {keyFeature}
                </p>
              ))}
            </div>
          )}
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

      {isSheetOpen && (
        <ProductDetailsSheet product={product} onClose={() => setIsSheetOpen(false)} />
      )}
    </>
  );
}
