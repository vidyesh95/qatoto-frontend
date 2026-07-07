"use client";

import { useState } from "react";

import Image from "next/image";

import CompanyDetailsSheet from "@/components/home/store/sheets/company-details-sheet";
import VerifiedCapabilitiesSheet from "@/components/home/store/sheets/verified-capabilities-sheet";

// "Company details" block on the product page. Collapsible header, a summary of
// the supplier (name, location, rating, main categories), a "Verified
// capabilities" row that opens its sheet, the capability list, and an "All
// company details" row that opens the full company sheet. UI-only mock — the
// real supplier profile comes from the backend later; the client only renders.

const VERIFIED_CAPABILITIES = [
  "OEM factory",
  "Full customization",
  "Product inspection",
  "Drop shipping",
];

const COMPANY_STATS = [
  { label: "On-time delivery rate", value: "98.6%" },
  { label: "Online revenue", value: "US $2.4M+" },
  { label: "Response time", value: "≤ 2h" },
  { label: "Year founded", value: "2009" },
  { label: "Collaborating factories", value: "12" },
  { label: "Reorder rate", value: "31%" },
];

function Divider() {
  return (
    <div className="px-4 lg:px-6">
      <div className="h-px bg-[#CAC4D0]" />
    </div>
  );
}

export default function CompanyDetailsSection() {
  const [isCapabilitiesSheetOpen, setIsCapabilitiesSheetOpen] = useState(false);
  const [isCompanySheetOpen, setIsCompanySheetOpen] = useState(false);

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
          <p className="text-base leading-6 font-medium tracking-[0.15px] text-[#191C1C]">
            Guangdong Puda Electrical Appliance Co., Ltd
          </p>

          <span className="inline-flex w-fit items-center gap-1 rounded bg-[#F2F4F4] px-2 py-1">
            <Image
              src="/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
              width={16}
              height={16}
              alt=""
            />
            <span className="text-xs font-medium text-[#00696E]">Verified by Intertek</span>
          </span>

          <div className="flex items-center gap-2">
            <Image
              src="/icons/location_on_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={24}
              height={24}
              alt=""
            />
            <span className="text-base leading-6 tracking-[0.5px] text-[#191C1C]">
              Guangdong, China
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-sm bg-[#4A6364] p-1 text-[11px] leading-4 font-medium tracking-[0.5px] text-white">
              4.8
              <span aria-hidden>★</span>
            </span>
            <span className="text-sm leading-5 font-medium tracking-[0.1px] text-[#6F7979]">
              26,692 Ratings &amp; 2,432 Reviews
            </span>
          </div>

          <div className="grid grid-cols-3 gap-x-2 gap-y-3 py-1">
            {COMPANY_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-[#191C1C]">{stat.value}</span>
                <span className="text-[11px] leading-4 text-[#6F7979]">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-base leading-6 font-medium tracking-[0.15px] text-[#191C1C]">
              Main categories:
            </p>
            <p className="text-sm leading-5 tracking-[0.25px] text-[#191C1C]">
              Jacket, shirt, t-shirt, pants, hoodies
            </p>
          </div>
        </div>

        <Divider />

        <button
          type="button"
          onClick={() => setIsCapabilitiesSheetOpen(true)}
          className="flex w-full cursor-pointer items-center px-4 py-2 text-left lg:px-6"
        >
          <span className="flex-1 text-sm leading-5 tracking-wide text-[#191C1C]">
            Verified capabilities
          </span>
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt=""
          />
        </button>

        <Divider />

        <ul className="flex flex-col gap-2 px-4 py-2 lg:px-6">
          {VERIFIED_CAPABILITIES.map((capability) => (
            <li key={capability} className="flex items-center gap-1">
              <Image
                src="/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
                width={16}
                height={16}
                alt=""
              />
              <span className="text-xs leading-4 tracking-[0.4px] text-[#191C1C]">
                {capability}
              </span>
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
        <VerifiedCapabilitiesSheet onClose={() => setIsCapabilitiesSheetOpen(false)} />
      )}
      {isCompanySheetOpen && <CompanyDetailsSheet onClose={() => setIsCompanySheetOpen(false)} />}
    </>
  );
}
