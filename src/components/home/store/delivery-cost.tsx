"use client";

import { useState } from "react";

import Image from "next/image";

import DeliverySheet from "./delivery-sheet";

// Delivery cost + estimate row on the product page. Tapping it opens the
// delivery options sheet (route map + per-leg transport modes). UI-only mock —
// the cost and time come from the backend by distance + chosen mode later.
export default function DeliveryCost() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="flex w-full items-center gap-2 border-y border-[#CAC4D0]/60 px-4 py-2 text-left text-xs lg:px-6"
      >
        <div className="flex-1 space-y-0.5 text-[#191C1C]">
          <p>
            <span className="text-[#191C1C]">Delivery cost:</span> Free Delivery to your location
          </p>
          <p>
            <span className="text-[#191C1C]">Estimate delivery time:</span> Sept 23 to Sept 27
          </p>
        </div>
        <Image
          src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
          width={24}
          height={24}
          alt=""
        />
      </button>

      {isSheetOpen && <DeliverySheet onClose={() => setIsSheetOpen(false)} />}
    </>
  );
}
