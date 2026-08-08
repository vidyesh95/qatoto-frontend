// TRANSPORT: props-only — receives the parsed storefront, fetches nothing.
//
// What the PLATFORM observed about this seller. Kept in its own section, with its own
// visual treatment, because the block below it is what the seller says about itself and
// the two must never read as one list.
//
// A null rate means ABSENCE OF EVIDENCE, not zero. It renders as "Not enough data yet"
// with the sample size that exists so far. It must never render as 0%, and it must never
// render a countdown to the threshold — the backend keeps those thresholds off the wire
// precisely so a client cannot turn "we have not measured this" into "3 of 10 to go".

import type { OrganizationMeasuredMetrics } from "@/lib/store/organizations.schemas";
import { formatPercentageLabel } from "@/lib/store/organizations.schemas";
import StorefrontSection from "@/components/home/store/sections/organization/storefront-section";

type MeasuredFigure = {
  label: string;
  /** Null when the platform has not measured enough to publish a figure. */
  value: string | null;
  sampleNote: string;
};

function buildFigures(metrics: OrganizationMeasuredMetrics): MeasuredFigure[] {
  return [
    {
      label: "On-time shipments",
      value:
        metrics.onTimeShipmentRate === null
          ? null
          : formatPercentageLabel(metrics.onTimeShipmentRate),
      sampleNote: `${metrics.onTimeSampleSize.toLocaleString("en-US")} orders that carried a delivery promise`,
    },
    {
      // A count, not a rate — it is always a real number, including zero.
      label: "Completed orders",
      value: metrics.completedOrderCount.toLocaleString("en-US"),
      sampleNote: "Orders delivered and closed on Qatoto",
    },
    {
      label: "Buyers who reordered",
      value: metrics.reorderRate === null ? null : formatPercentageLabel(metrics.reorderRate),
      sampleNote: `${metrics.reorderSampleSize.toLocaleString("en-US")} buyers with a completed order in the last year`,
    },
    {
      label: "Median reply time",
      value:
        metrics.measuredResponseTimeHours === null
          ? null
          : `${metrics.measuredResponseTimeHours.toFixed(1)} h`,
      sampleNote: `${metrics.responseSampleSize.toLocaleString("en-US")} message threads in the last 90 days`,
    },
  ];
}

export default function StorefrontMeasuredMetrics({
  metrics,
}: {
  metrics: OrganizationMeasuredMetrics;
}) {
  const figures = buildFigures(metrics);

  return (
    <StorefrontSection
      title="Track record"
      attribution="measured"
      description="Derived from orders and messages on Qatoto. The seller cannot edit these."
    >
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {figures.map((figure) => (
          <div
            key={figure.label}
            className="flex flex-col gap-0.5 rounded-lg bg-[#D6E3FF]/40 px-3 py-2.5"
          >
            {figure.value === null ? (
              <span className="text-sm leading-5 font-medium text-[#6F7979]">
                Not enough data yet
              </span>
            ) : (
              <span className="text-xl leading-7 font-medium tracking-tight text-[#00696E]">
                {figure.value}
              </span>
            )}
            <span className="text-xs leading-4 font-medium tracking-[0.4px] text-[#191C1C]">
              {figure.label}
            </span>
            <span className="text-[11px] leading-4 text-[#6F7979]">{figure.sampleNote}</span>
          </div>
        ))}
      </div>
    </StorefrontSection>
  );
}
