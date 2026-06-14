"use client";

import { useState } from "react";

import Image from "next/image";

import TradeProtectionSheet from "./trade-protection-sheet";

// "Trade protection" block on the product page. Shows the platform-backed order
// guarantees as a two-column grid; tapping anywhere opens the sheet that explains
// each one. UI-only mock — what coverage applies comes from the backend later.

const TRADE_PROTECTION = [
  {
    label: "Buyer protection",
    iconFileName: "shield_person_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
  { label: "Secure payment", iconFileName: "lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
  { label: "Return policy", iconFileName: "compare_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" },
  {
    label: "Refund for no delivery",
    iconFileName: "local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
  },
];

export default function TradeProtection() {
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
            Trade protection
          </span>
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt=""
          />
        </span>

        <span className="grid w-full grid-flow-col grid-cols-2 grid-rows-2 gap-y-2 px-4 lg:px-6">
          {TRADE_PROTECTION.map((protection) => (
            <span key={protection.label} className="flex items-center gap-1">
              <Image src={`/icons/${protection.iconFileName}`} width={16} height={16} alt="" />
              <span className="text-xs leading-4 tracking-wide text-[#191C1C]">
                {protection.label}
              </span>
            </span>
          ))}
        </span>
      </button>

      {isSheetOpen && <TradeProtectionSheet onClose={() => setIsSheetOpen(false)} />}
    </>
  );
}
