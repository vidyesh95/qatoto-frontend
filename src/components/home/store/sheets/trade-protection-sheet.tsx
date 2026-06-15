"use client";

import { useEffect } from "react";

import Image from "next/image";

// Trade protection bottom sheet for the product page (UI-only phase, no fetch).
// Explains each protection the platform guarantees on the order. Static copy for
// now — what coverage applies comes from the backend later; the client only
// renders it. Bottom sheet on mobile, centered modal on desktop — mirrors
// CustomizationSheet.

type ProtectionDetail = {
  label: string;
  iconFileName: string;
  description: string;
};

const PROTECTION_DETAILS: ProtectionDetail[] = [
  {
    label: "Buyer protection",
    iconFileName: "shield_person_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    description:
      "Your order is covered from checkout to delivery. If an item arrives damaged, wrong, or never shows up, you can open a claim and get your money back.",
  },
  {
    label: "Secure payment",
    iconFileName: "lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    description:
      "Every payment is encrypted and processed through trusted providers. We never share your card details with the seller, and funds are only released once the order is confirmed.",
  },
  {
    label: "Return policy",
    iconFileName: "compare_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    description:
      "If the item arrives damaged or not as described, return it at no extra cost — we cover it. Changed your mind? You can still return it, but delivery cost and service fee will be deducted. Item must be boxed and original packaging intact.",
  },
  {
    label: "Refund for no delivery",
    iconFileName: "local_shipping_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    description:
      "If your order doesn't arrive within the promised delivery time, you're entitled to a full refund — no back-and-forth with the seller required.",
  },
];

export default function TradeProtectionSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close trade protection"
        onClick={onClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label="Trade protection"
        className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center gap-2 px-4 py-3">
          <h2 className="flex-1 text-base font-medium">Trade protection</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        </header>

        <p className="shrink-0 px-4 pb-2 text-xs text-[#6F7979]">
          This order on Qatoto is backed by these guarantees, end to end.
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <ul className="flex flex-col gap-4">
            {PROTECTION_DETAILS.map((protection) => (
              <li key={protection.label} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#D6E3FF]">
                  <Image src={`/icons/${protection.iconFileName}`} width={20} height={20} alt="" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#191C1C]">{protection.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[#6F7979]">
                    {protection.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
