// TRANSPORT: mock — reads the shared mock seller record. NOTHING here reaches a backend yet.
//
// Capabilities and certifications. Reads the same seller record the storefront page renders, so
// the two cannot disagree — it used to hold its own hardcoded list.
//
// The sheet was called "Verified capabilities" and told the buyer these were "verified by
// Qatoto". They are not: production capabilities are the seller's own claim. The only thing here
// the platform has adjudicated is a certification with an `approvedAt`, and that is the only
// thing carrying the verified mark.
//
// Wire-able from `GET /store/organizations/:slug` → `declaredProfile.capabilities` /
// `.certifications`, which is the shape the mock already has. Lapsing stays a render-time
// `validUntil < today` comparison — there is no `expired` field on the wire and a stored one
// would be wrong between nightly ticks.
"use client";

import Image from "next/image";

import StoreSheet from "@/components/home/store/shared/store-sheet";
import { CAPABILITY_KIND_ICONS, CAPABILITY_KIND_LABELS } from "@/lib/store/organizations.schemas";
import { MOCK_PRODUCT_SELLER_STOREFRONT } from "@/mocks/store-organization-mocks";

const DECLARED_PROFILE = MOCK_PRODUCT_SELLER_STOREFRONT.declaredProfile;
const PRODUCTION_CAPABILITIES = DECLARED_PROFILE?.capabilities ?? [];
const CERTIFICATIONS = DECLARED_PROFILE?.certifications ?? [];

export default function VerifiedCapabilitiesSheet({ onClose }: { onClose: () => void }) {
  return (
    <StoreSheet title="Capabilities and certifications" onClose={onClose}>
      <p className="px-4 pb-2 text-xs text-[#6F7979]">
        What this factory says it can produce, and the certificates it has submitted.
      </p>

      <div className="px-4 pb-5">
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
    </StoreSheet>
  );
}
