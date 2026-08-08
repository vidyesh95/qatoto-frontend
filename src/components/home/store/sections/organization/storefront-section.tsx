// TRANSPORT: props-only — layout chrome, no network.
//
// Every block on the seller storefront is wrapped in this, and the wrapper REQUIRES an
// attribution. That is the point: the backend keeps what a seller asserts and what the
// platform measured in two separate objects, and a section that could not say which one
// it is rendering would quietly re-merge them. Making `attribution` a required prop
// means a new section cannot be added without answering the question.

import Image from "next/image";

import type { ReactNode } from "react";

export type SectionAttribution = "measured" | "declared";

const ATTRIBUTION_COPY: Record<SectionAttribution, string> = {
  measured: "Measured by Qatoto",
  declared: "Stated by the seller",
};

const ATTRIBUTION_CHIP_CLASS: Record<SectionAttribution, string> = {
  measured: "bg-[#D6E3FF] text-[#00696E]",
  declared: "bg-[#F2F4F4] text-[#6F7979]",
};

export default function StorefrontSection({
  title,
  attribution,
  description,
  children,
}: {
  title: string;
  attribution: SectionAttribution;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="px-4 py-4 lg:px-6">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="text-base leading-6 font-medium tracking-[0.15px] text-[#191C1C] xl:text-lg">
          {title}
        </h2>
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] leading-4 font-medium tracking-[0.5px] ${ATTRIBUTION_CHIP_CLASS[attribution]}`}
        >
          {attribution === "measured" && (
            <Image
              src="/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
              width={14}
              height={14}
              alt=""
            />
          )}
          {ATTRIBUTION_COPY[attribution]}
        </span>
      </div>

      {description && (
        <p className="mt-1 text-xs leading-4 tracking-[0.4px] text-[#6F7979]">{description}</p>
      )}

      <div className="mt-3">{children}</div>
    </section>
  );
}

// Shared divider between storefront blocks, matching the product page's rule.
export function StorefrontDivider() {
  return (
    <div className="px-4 lg:px-6">
      <div className="h-px bg-[#CAC4D0]/60" />
    </div>
  );
}

/**
 * The mark a section carries when nothing on the wire backs it. Kept visually distinct
 * from the "stated by the seller" chip because these two are different failures: one is
 * a claim the platform has not verified, the other is a field the platform cannot even
 * receive yet.
 */
export function UnbackedFieldNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 flex items-start gap-1.5 rounded bg-[#F2F4F4] px-2 py-1.5 text-[11px] leading-4 text-[#6F7979]">
      <Image
        src="/icons/description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
        width={14}
        height={14}
        alt=""
        className="mt-px shrink-0 opacity-60"
      />
      <span>{children}</span>
    </p>
  );
}
