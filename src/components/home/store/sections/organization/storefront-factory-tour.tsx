// TRANSPORT: props-only — receives the parsed storefront, fetches nothing.
//
// Whether a buyer may visit, and on what terms. The POLICY is real: `visitPolicy` is a
// backend enum with three values, and "not_available" is a legitimate answer that must
// render as clearly as "welcome" — it is a policy, not an invitation.
//
// Everything past the policy badge — days, hours, booking lead time, fee, what the fee
// includes, interpreter languages — has NO backend column. When `tour` is null this
// section collapses to the badge alone, which is exactly what a live response produces
// today.

import Image from "next/image";

import type { FactoryTourPolicy, VisitPolicy } from "@/lib/store/organizations.schemas";
import { formatCentsLabel, VISIT_POLICY_LABELS } from "@/lib/store/organizations.schemas";
import StorefrontSection, {
  UnbackedFieldNote,
} from "@/components/home/store/sections/organization/storefront-section";

const VISIT_POLICY_CHIP_CLASS: Record<VisitPolicy, string> = {
  welcome: "bg-[#D6E3FF] text-[#00696E]",
  by_appointment: "bg-[#D6E3FF]/50 text-[#00696E]",
  not_available: "bg-[#F2F4F4] text-[#6F7979]",
};

export default function StorefrontFactoryTour({
  visitPolicy,
  tour,
}: {
  visitPolicy: VisitPolicy | null;
  tour: FactoryTourPolicy | null;
}) {
  if (visitPolicy === null && tour === null) return null;

  // Zero cents is "free", which is a real answer and reads differently from a fee.
  const isTourFree = tour !== null && tour.feeInCents === 0;

  return (
    <StorefrontSection
      title="Factory visits"
      attribution="declared"
      description="The seller's own visiting policy. Qatoto does not arrange or chaperone site visits."
    >
      {visitPolicy !== null && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm leading-5 font-medium tracking-[0.1px] ${VISIT_POLICY_CHIP_CLASS[visitPolicy]}`}
        >
          <Image
            src="/icons/factory_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
            className={visitPolicy === "not_available" ? "opacity-40" : "opacity-70"}
          />
          {VISIT_POLICY_LABELS[visitPolicy]}
        </span>
      )}

      {tour && visitPolicy !== "not_available" && (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-4">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] leading-4 text-[#6F7979]">Open days</dt>
              <dd className="text-sm leading-5 font-medium text-[#191C1C]">{tour.availableDays}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] leading-4 text-[#6F7979]">Visiting hours</dt>
              <dd className="text-sm leading-5 font-medium text-[#191C1C]">{tour.visitingHours}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] leading-4 text-[#6F7979]">Book ahead</dt>
              <dd className="text-sm leading-5 font-medium text-[#191C1C]">
                {tour.bookingLeadDays} working days
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] leading-4 text-[#6F7979]">Visit fee</dt>
              <dd
                className={`flex items-center gap-1 text-sm leading-5 font-medium ${
                  isTourFree ? "text-[#00696E]" : "text-[#191C1C]"
                }`}
              >
                <Image
                  src="/icons/paid_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  width={16}
                  height={16}
                  alt=""
                  className="opacity-70"
                />
                {isTourFree ? "Free" : formatCentsLabel(tour.feeInCents, tour.currency)}
              </dd>
            </div>
          </dl>

          {tour.inclusions.length > 0 && (
            <>
              <p className="mt-4 mb-1.5 text-sm leading-5 font-medium text-[#191C1C]">
                What the visit includes
              </p>
              <ul className="flex flex-col gap-1.5">
                {tour.inclusions.map((inclusion) => (
                  <li key={inclusion} className="flex items-start gap-1.5">
                    <Image
                      src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      width={16}
                      height={16}
                      alt=""
                      className="mt-0.5 shrink-0 opacity-60"
                    />
                    <span className="text-xs leading-4 tracking-[0.4px] text-[#191C1C]">
                      {inclusion}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {tour.interpreterLanguages.length > 0 && (
            <p className="mt-3 text-xs leading-4 tracking-[0.4px] text-[#6F7979]">
              Interpreters available in {tour.interpreterLanguages.join(", ")}.
            </p>
          )}

          <UnbackedFieldNote>
            Visiting days, hours, booking lead time and the fee are placeholders. The seller profile
            API stores only the three-value visit policy above, so everything under it disappears
            once the page reads live data.
          </UnbackedFieldNote>
        </>
      )}
    </StorefrontSection>
  );
}
