// TRANSPORT: props-only — renders the storefront the page fetched, no network.
"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import CompanyDetailsSheet from "@/components/home/store/sheets/company-details-sheet";
import VerifiedCapabilitiesSheet from "@/components/home/store/sheets/verified-capabilities-sheet";
import { countryLabelFromCode, formatPercentageLabel } from "@/lib/store/format";
import {
  CAPABILITY_KIND_LABELS,
  type OrganizationStorefrontView,
} from "@/lib/store/organizations.schemas";

// "Company details" on the product page. Reads the same storefront the seller's own page renders,
// so the two cannot disagree.
//
// TWO LABELLED GROUPS, NOT ONE GRID, AND THAT IS THE WHOLE POINT. This block used to hold a flat
// `COMPANY_STATS` array mixing "On-time delivery rate 98.6%" with "Year founded 2009" — a platform
// MEASUREMENT and a seller's ASSERTION, in the same grid, in the same typeface. The backend keeps
// `measuredMetrics` and `declaredProfile` as two separate objects specifically so a client cannot
// present the second as the first, and flattening them here would throw that away at the last step.
//
// The capability list is likewise not headed "verified": production capabilities are the seller's
// own claim. Only a certification a reviewer approved carries a tick, and that lives in the sheet.
//
// A NULL RATE IS THE ABSENCE OF EVIDENCE, NOT A ZERO, and it says so. The thresholds below which
// the backend withholds a rate are deliberately off the wire, so nothing here counts down to one.

function Divider() {
  return (
    <div className="px-4 lg:px-6">
      <div className="h-px bg-[#CAC4D0]" />
    </div>
  );
}

export default function CompanyDetailsSection({
  storefront,
}: {
  readonly storefront: OrganizationStorefrontView;
}) {
  const [isCapabilitiesSheetOpen, setIsCapabilitiesSheetOpen] = useState(false);
  const [isCompanySheetOpen, setIsCompanySheetOpen] = useState(false);

  const declaredProfile = storefront.declaredProfile;
  const measuredMetrics = storefront.measuredMetrics;

  const declaredCapabilities = (declaredProfile?.capabilities ?? []).map(
    (capability) => CAPABILITY_KIND_LABELS[capability.capabilityKind],
  );

  const measuredStats: readonly { label: string; value: string }[] = [
    {
      label: "On-time shipments",
      value:
        measuredMetrics.onTimeShipmentRate === null
          ? "Not enough data"
          : formatPercentageLabel(measuredMetrics.onTimeShipmentRate),
    },
    {
      label: "Completed orders",
      value: measuredMetrics.completedOrderCount.toLocaleString("en-US"),
    },
    {
      label: "Buyers who reordered",
      value:
        measuredMetrics.reorderRate === null
          ? "Not enough data"
          : formatPercentageLabel(measuredMetrics.reorderRate),
    },
  ];

  const declaredStats: readonly { label: string; value: string }[] = [
    { label: "Year founded", value: declaredProfile?.yearFounded?.toString() ?? "—" },
    { label: "Factories", value: declaredProfile?.factoryCount?.toString() ?? "—" },
    {
      label: "Reply time, self-reported",
      value:
        declaredProfile?.declaredResponseTimeHours === null ||
        declaredProfile?.declaredResponseTimeHours === undefined
          ? "—"
          : `≤ ${declaredProfile.declaredResponseTimeHours} h`,
    },
  ];

  return (
    <>
      <details open className="group [&_summary]:list-none">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 lg:px-6">
          <span className="text-sm leading-5 tracking-wide text-[#191C1C]">Company details</span>
          <Image
            src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={22}
            height={22}
            alt=""
            className="transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="flex flex-col gap-2 px-4 pb-2 lg:px-6">
          <Link
            href={`/store/organizations/${storefront.slug}`}
            className="text-base leading-6 font-medium tracking-[0.15px] text-[#2A76FD]"
          >
            {storefront.displayName}
          </Link>

          <div className="flex items-center gap-2">
            <Image
              src="/icons/location_on_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={24}
              height={24}
              alt=""
            />
            <span className="text-base leading-6 tracking-[0.5px] text-[#191C1C]">
              {countryLabelFromCode(storefront.countryCode)}
            </span>
          </div>

          {/* Two groups, not one grid. The heading on each is what stops a buyer reading
              the seller's founding year as something Qatoto checked. */}
          <p className="mt-1 flex items-center gap-1 text-xs leading-4 font-medium tracking-[0.5px] text-[#00696E]">
            <Image
              src="/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
              width={14}
              height={14}
              alt=""
            />
            Measured by Qatoto
          </p>
          <div className="grid grid-cols-3 gap-x-2 gap-y-3">
            {measuredStats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-[#00696E]">{stat.value}</span>
                <span className="text-[11px] leading-4 text-[#6F7979]">{stat.label}</span>
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs leading-4 font-medium tracking-[0.5px] text-[#6F7979]">
            Stated by the seller
          </p>
          <div className="grid grid-cols-3 gap-x-2 gap-y-3">
            {declaredStats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-[#191C1C]">{stat.value}</span>
                <span className="text-[11px] leading-4 text-[#6F7979]">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        <button
          type="button"
          onClick={() => setIsCapabilitiesSheetOpen(true)}
          className="flex w-full cursor-pointer items-center px-4 py-2 text-left lg:px-6"
        >
          <span className="flex-1 text-sm leading-5 tracking-wide text-[#191C1C]">
            Capabilities and certifications
          </span>
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt=""
          />
        </button>

        <Divider />

        {/* No verified tick on these — they are the seller's claims, not findings. */}
        <ul className="flex flex-wrap gap-1.5 px-4 py-2 lg:px-6">
          {declaredCapabilities.map((capabilityLabel) => (
            <li
              key={capabilityLabel}
              className="rounded bg-[#F2F4F4] px-2 py-1 text-xs leading-4 tracking-[0.4px] text-[#191C1C]"
            >
              {capabilityLabel}
            </li>
          ))}
        </ul>

        <Divider />

        <button
          type="button"
          onClick={() => setIsCompanySheetOpen(true)}
          className="flex w-full cursor-pointer items-center px-4 py-2 text-left lg:px-6"
        >
          <span className="flex-1 text-sm leading-5 tracking-wide text-[#191C1C]">
            All company details
          </span>
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt=""
          />
        </button>

        <Divider />
      </details>

      {isCapabilitiesSheetOpen && (
        <VerifiedCapabilitiesSheet
          declaredProfile={declaredProfile}
          onClose={() => setIsCapabilitiesSheetOpen(false)}
        />
      )}
      {isCompanySheetOpen && (
        <CompanyDetailsSheet storefront={storefront} onClose={() => setIsCompanySheetOpen(false)} />
      )}
    </>
  );
}
