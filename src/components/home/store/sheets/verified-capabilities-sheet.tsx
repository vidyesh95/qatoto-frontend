"use client";

import { useEffect } from "react";

import Image from "next/image";

// Capabilities and certifications bottom sheet for the product page (UI-only phase, no
// fetch). Reads the same seller record the storefront page renders, so the two cannot
// disagree — it used to hold its own hardcoded list.
//
// The sheet was called "Verified capabilities" and told the buyer these were "verified
// by Qatoto". They are not: production capabilities are the seller's own claim. The only
// thing on this sheet the platform has adjudicated is a certification with an
// `approvedAt`, and that is now the only thing that carries the verified mark.

import { CAPABILITY_KIND_ICONS, CAPABILITY_KIND_LABELS } from "@/lib/store/organizations.schemas";
import { MOCK_PRODUCT_SELLER_STOREFRONT } from "@/mocks/store-organization-mocks";

const DECLARED_PROFILE = MOCK_PRODUCT_SELLER_STOREFRONT.declaredProfile;
const PRODUCTION_CAPABILITIES = DECLARED_PROFILE?.capabilities ?? [];
const CERTIFICATIONS = DECLARED_PROFILE?.certifications ?? [];

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
          <h2 className="flex-1 text-base font-medium">Capabilities and certifications</h2>
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
          What this factory says it can produce, and the certificates it has submitted.
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <ul className="flex flex-col gap-4">
            {PRODUCTION_CAPABILITIES.map((capability) => (
              <li key={capability.id} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#D6E3FF]">
                  <Image
                    src={`/icons/${CAPABILITY_KIND_ICONS[capability.capabilityKind]}`}
                    width={20}
                    height={20}
                    alt=""
                  />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#191C1C]">
                    {CAPABILITY_KIND_LABELS[capability.capabilityKind]}
                  </p>
                  {capability.detail && (
                    <p className="mt-0.5 text-xs leading-5 text-[#6F7979]">{capability.detail}</p>
                  )}
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
                key={certification.id}
                className="flex items-center gap-2 rounded-lg bg-[#F2F4F4] px-3 py-2"
              >
                <span className="shrink-0 rounded-sm bg-[#4A6364] px-1.5 py-0.5 text-[11px] font-medium text-white">
                  {certification.standardName}
                </span>
                <span className="flex-1 text-xs text-[#191C1C]">
                  {certification.scopeSummary ?? `Issued by ${certification.issuerName}`}
                </span>
                {/* The verified mark belongs only to a document a reviewer approved. */}
                {certification.approvedAt !== null && (
                  <Image
                    src="/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
                    width={16}
                    height={16}
                    alt="Approved by Qatoto"
                    className="shrink-0"
                  />
                )}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[11px] leading-4 text-[#6F7979]">
            A checked certificate is one a Qatoto reviewer approved. Capabilities above are the
            seller&apos;s own claims and are not verified.
          </p>
        </div>
      </div>
    </>
  );
}
