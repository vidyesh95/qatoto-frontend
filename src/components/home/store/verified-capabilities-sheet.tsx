"use client";

import { useEffect } from "react";

import Image from "next/image";

// Verified capabilities bottom sheet for the product page (UI-only phase, no
// fetch). Tells the buyer what the factory can produce and which certifications
// it holds (ISO, BIS, etc.). Static copy for now — the verified supplier profile
// comes from the backend later; the client only renders it. Bottom sheet on
// mobile, centered modal on desktop — mirrors TradeProtectionSheet.

type ProductionCapability = {
  label: string;
  iconFileName: string;
  description: string;
};

type Certification = {
  code: string;
  name: string;
};

const PRODUCTION_CAPABILITIES: ProductionCapability[] = [
  {
    label: "OEM factory",
    iconFileName: "factory_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    description:
      "Produces to your brand and specification on its own lines — no middleman. You own the design, the factory builds it.",
  },
  {
    label: "Full customization",
    iconFileName: "category_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    description:
      "Material, color, dimensions, logo, and packaging can all be changed to order. Send artwork or a sample and they match it.",
  },
  {
    label: "Product inspection",
    iconFileName: "verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg",
    description:
      "Every batch passes in-house QC, and third-party inspection (SGS, BV) can be arranged before the goods ship.",
  },
  {
    label: "R&D capability",
    iconFileName: "science_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg",
    description:
      "In-house design and engineering team can develop new models, tooling, and molds from a sketch or a reference sample.",
  },
];

const CERTIFICATIONS: Certification[] = [
  { code: "ISO 9001", name: "Quality management system" },
  { code: "ISO 14001", name: "Environmental management system" },
  { code: "BIS", name: "Bureau of Indian Standards mark" },
  { code: "CE", name: "EU conformity" },
  { code: "BSCI", name: "Audited social compliance" },
];

export default function VerifiedCapabilitiesSheet({ onClose }: { onClose: () => void }) {
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
        aria-label="Close verified capabilities"
        onClick={onClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label="Verified capabilities"
        className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center gap-2 px-4 py-3">
          <h2 className="flex-1 text-base font-medium">Verified capabilities</h2>
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
          What this factory can produce and the certifications it holds, verified by Qatoto.
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <ul className="flex flex-col gap-4">
            {PRODUCTION_CAPABILITIES.map((capability) => (
              <li key={capability.label} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#D6E3FF]">
                  <Image src={`/icons/${capability.iconFileName}`} width={20} height={20} alt="" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#191C1C]">{capability.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[#6F7979]">
                    {capability.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 mb-2 flex items-center gap-2">
            <Image
              src="/icons/workspace_premium_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={20}
              height={20}
              alt=""
            />
            <p className="text-sm font-medium text-[#191C1C]">Certifications</p>
          </div>
          <ul className="flex flex-col gap-2">
            {CERTIFICATIONS.map((certification) => (
              <li
                key={certification.code}
                className="flex items-center gap-2 rounded-lg bg-[#F2F4F4] px-3 py-2"
              >
                <span className="shrink-0 rounded-sm bg-[#4A6364] px-1.5 py-0.5 text-[11px] font-medium text-white">
                  {certification.code}
                </span>
                <span className="text-xs text-[#191C1C]">{certification.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
