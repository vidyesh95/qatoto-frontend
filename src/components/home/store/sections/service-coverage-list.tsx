// TRANSPORT: props-only — renders the parsed coverage rows, fetches nothing.
//
// The lanes a provider says it will work.
//
// ALL FIVE IDENTITY FIELDS ARE NULLABLE AND THE BACKEND ALLOWS ANY COMBINATION, so a row can be as
// specific as "CNYTN → NLRTM" or as broad as "East Asia → Northern Europe" — and a row can name an
// origin with no destination, which means "anywhere out of here". The label builder below is
// therefore a composition of whatever is present, not a template with holes in it, and a row that
// resolves to nothing renders as "Unspecified lane" rather than as an empty line.
//
// AN EMPTY COVERAGE LIST IS NOT "WORLDWIDE". Several kinds legitimately declare no lanes at all — a
// testing laboratory works where its laboratories are, a marketing agency has target regions
// instead — so an absent list means the concept does not apply, and inferring global coverage from
// it would be the same mistake as reading an uncovered delivery lane as free shipping.

import StorefrontSection from "@/components/home/store/sections/organization/storefront-section";
import { countryLabelFromCode } from "@/lib/store/format";
import type { PublicCoverage } from "@/lib/store/providers.schemas";

/** Origin → destination from whichever of the five fields the row actually carries. */
function buildLaneLabel(coverage: PublicCoverage): string {
  const originLabel =
    coverage.originCountryCode !== null
      ? countryLabelFromCode(coverage.originCountryCode)
      : coverage.originRegionLabel;
  const destinationLabel =
    coverage.destinationCountryCode !== null
      ? countryLabelFromCode(coverage.destinationCountryCode)
      : coverage.destinationRegionLabel;

  if (originLabel !== null && destinationLabel !== null) {
    return `${originLabel} → ${destinationLabel}`;
  }
  if (originLabel !== null) return `From ${originLabel}`;
  if (destinationLabel !== null) return `Into ${destinationLabel}`;
  // Every identity field null except possibly the location identifier, which is rendered
  // separately below. Saying so is better than an empty row.
  return "Unspecified lane";
}

export default function ServiceCoverageList({ coverage }: { coverage: PublicCoverage[] }) {
  if (coverage.length === 0) {
    return (
      <StorefrontSection
        title="Coverage"
        attribution="declared"
        description="Where this provider says it will work."
      >
        <p className="rounded-lg bg-[#F2F4F4] px-3 py-4 text-sm leading-5 text-[#6F7979]">
          No specific lanes are declared for this service. Ask the provider what it covers — an
          empty list does not mean worldwide.
        </p>
      </StorefrontSection>
    );
  }

  return (
    <StorefrontSection
      title="Coverage"
      attribution="declared"
      description="Lanes as published by the provider. A capability claim, not a compliance clearance."
    >
      <ul className="flex flex-col gap-2">
        {coverage.map((lane, laneIndex) => (
          // No id on the projection, so the composed label plus the index is the key. The index is
          // stable because the list is server-ordered and never reordered client-side.
          <li
            key={`${buildLaneLabel(lane)}-${laneIndex}`}
            className="rounded-lg bg-[#F2F4F4] px-3 py-2"
          >
            <p className="text-sm leading-5 text-[#191C1C]">{buildLaneLabel(lane)}</p>

            {lane.locationIdentifier !== null && (
              <p className="text-xs leading-4 text-[#6F7979]">{lane.locationIdentifier}</p>
            )}

            <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] leading-4 text-[#6F7979]">
              {/* Stated only when claimed. Unlike the typed-extension panel, where "No" is a useful
                  answer about the whole service, a per-lane false is the default and printing nine
                  "Hazardous goods: No" rows would bury the one lane that says yes. */}
              {lane.supportsHazardousGoods && <span>Handles hazardous goods</span>}
              {lane.supportsConsolidation && <span>Consolidation available</span>}
            </div>
          </li>
        ))}
      </ul>
    </StorefrontSection>
  );
}
