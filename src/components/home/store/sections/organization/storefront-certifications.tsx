// TRANSPORT: props-only — receives the parsed storefront, fetches nothing.
//
// Certificates the seller has uploaded. This is the one block on the profile where the
// platform has an opinion: `approvedAt` means a Qatoto reviewer adjudicated the document,
// and a null there means it is still just an upload. The two render differently.
//
// Lapsing is computed here, not read. The backend deliberately has no `expired` state —
// a stored flag would need a nightly job to flip it and would therefore be WRONG between
// ticks, publishing a lapsed certificate until the next run. `validUntil < today` is
// always right.

import Image from "next/image";

import type { OrganizationCertification } from "@/lib/store/organizations.schemas";
import CertificationValidityPill from "@/components/home/store/sections/organization/certification-validity-pill";
import StorefrontSection from "@/components/home/store/sections/organization/storefront-section";

function formatIsoDateLabel(isoDate: string): string {
  // The wire carries `YYYY-MM-DD`. Splitting it beats `new Date(isoDate)`, which parses
  // as UTC midnight and can render the previous day west of Greenwich.
  const [year, month, day] = isoDate.split("-");
  const MONTH_LABELS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthLabel = MONTH_LABELS[Number(month) - 1] ?? month;
  return `${monthLabel} ${Number(day)}, ${year}`;
}

export default function StorefrontCertifications({
  certifications,
}: {
  certifications: OrganizationCertification[];
}) {
  if (certifications.length === 0) return null;

  return (
    <StorefrontSection
      title="Certifications"
      attribution="declared"
      description="Documents the seller submitted. A checked badge means a Qatoto reviewer approved that document — it is not a guarantee of any individual shipment."
    >
      <ul className="grid gap-2 lg:grid-cols-2">
        {certifications.map((certification) => {
          const isPlatformApproved = certification.approvedAt !== null;

          return (
            <li
              key={certification.id}
              className="rounded-lg bg-white px-3 py-2.5 outline -outline-offset-1 outline-[#E0E3E3]"
            >
              <div className="flex items-start gap-2">
                <Image
                  src="/icons/workspace_premium_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  width={20}
                  height={20}
                  alt=""
                  className="mt-0.5 shrink-0 opacity-70"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-5 font-medium text-[#191C1C]">
                    {certification.standardName}
                  </p>
                  <p className="text-xs leading-4 tracking-[0.4px] text-[#6F7979]">
                    Issued by {certification.issuerName} · No. {certification.certificateNumber}
                  </p>
                </div>
              </div>

              {certification.scopeSummary && (
                <p className="mt-1.5 text-xs leading-4 tracking-[0.4px] text-[#191C1C]">
                  {certification.scopeSummary}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[11px] leading-4 text-[#6F7979]">
                  {formatIsoDateLabel(certification.validFrom)} –{" "}
                  {formatIsoDateLabel(certification.validUntil)}
                </span>

                {/* Client-computed — see the component for why "now" cannot be a
                    server value here. */}
                <CertificationValidityPill validUntil={certification.validUntil} />

                {isPlatformApproved ? (
                  <span className="inline-flex items-center gap-1 rounded bg-[#F2F4F4] px-2 py-0.5 text-[11px] leading-4 font-medium tracking-[0.5px] text-[#00696E]">
                    <Image
                      src="/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
                      width={13}
                      height={13}
                      alt=""
                    />
                    Document approved by Qatoto
                  </span>
                ) : (
                  <span className="rounded bg-[#F2F4F4] px-2 py-0.5 text-[11px] leading-4 font-medium tracking-[0.5px] text-[#6F7979]">
                    Awaiting review
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </StorefrontSection>
  );
}
