// TRANSPORT: props-only — two buttons that open sheets over server-fetched companions.
"use client";

// "View similar" / "Add to Compare" on the product page. Each opens its own bottom sheet over the
// SAME companion groups the page already fetched — one read, two presentations.
//
// THERE IS NO COMPARE ENDPOINT AND NONE IS NEEDED. The backend aligns nothing: a real comparison
// table means putting each product's `specifications[]` side by side and aligning on `key`, which
// is client-side layout over server-side data rather than a computation the client has no business
// doing. Alibaba's compare tray caps at four for the same reason — beyond that the table stops
// being readable, not the query stops being possible.

import { useState } from "react";

import Image from "next/image";

import CompareProductsSheet from "@/components/home/store/sheets/compare-products-sheet";
import SimilarProductsSheet from "@/components/home/store/sheets/similar-products-sheet";
import type { ProductCompanionGroup, StoreProductDetail } from "@/lib/store/products.schemas";

export default function SimilarAndCompare({
  product,
  companionGroups,
}: {
  readonly product: StoreProductDetail;
  readonly companionGroups: readonly ProductCompanionGroup[];
}) {
  const [isSimilarOpen, setIsSimilarOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const hasCompanions = companionGroups.some((group) => group.items.length > 0);

  // Nothing related has been declared or derived for this product. Two buttons that open empty
  // sheets is worse than no buttons.
  if (!hasCompanions) return null;

  return (
    <>
      <div className="flex gap-2 px-4 py-3 lg:px-6">
        <button
          type="button"
          onClick={() => setIsSimilarOpen(true)}
          className="flex flex-1 cursor-pointer items-center gap-2 px-4 py-2 text-xs text-[#191C1C] outline -outline-offset-1 outline-[#6F7979]"
        >
          <Image
            src="/icons/content_copy_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt=""
          />
          View similar
        </button>
        <button
          type="button"
          onClick={() => setIsCompareOpen(true)}
          className="flex flex-1 cursor-pointer items-center gap-2 px-4 py-2 text-xs text-[#191C1C] outline -outline-offset-1 outline-[#6F7979]"
        >
          <Image
            src="/icons/compare_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt=""
          />
          Add to Compare
        </button>
      </div>

      {isSimilarOpen && (
        <SimilarProductsSheet
          companionGroups={companionGroups}
          onClose={() => setIsSimilarOpen(false)}
        />
      )}
      {isCompareOpen && (
        <CompareProductsSheet
          product={product}
          companionGroups={companionGroups}
          onClose={() => setIsCompareOpen(false)}
        />
      )}
    </>
  );
}
