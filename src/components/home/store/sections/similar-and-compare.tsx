"use client";

import { useState } from "react";

import Image from "next/image";

import CompareProductsSheet from "@/components/home/store/sheets/compare-products-sheet";
import SimilarProductsSheet from "@/components/home/store/sheets/similar-products-sheet";

// "View similar" / "Add to Compare" button pair on the product page. Each opens
// its own bottom sheet. UI-only mock — the sheets hold static data; ranking and
// the compare set are the backend's job later, never the client's.
export default function SimilarAndCompare() {
  const [isSimilarOpen, setIsSimilarOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

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

      {isSimilarOpen && <SimilarProductsSheet onClose={() => setIsSimilarOpen(false)} />}
      {isCompareOpen && <CompareProductsSheet onClose={() => setIsCompareOpen(false)} />}
    </>
  );
}
