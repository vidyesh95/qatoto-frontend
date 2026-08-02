// TRANSPORT: props-only — presentational server component. Fetches nothing; deals and the
// current selections arrive as props from funding-page, which read GET /funding/deals.
//
// NO LONGER A CLIENT ISLAND. Filtering moved into the query string, so the chips are Links
// and the backend filters in SQL.
import FundingDealCard from "@/components/home/research-and-development/cards/funding-deal-card";
import FilterChipRow, {
  type FilterChipOption,
} from "@/components/home/research-and-development/sections/filter-chip-row";
import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";
import { FUNDING_ROUND_TYPES, type FundingDeal } from "@/lib/rnd/funding.schemas";
import { PROJECT_STAGE_LABELS } from "@/lib/rnd/labels";
import { PROJECT_STAGES } from "@/lib/rnd/shared.schemas";

const ROUND_TYPE_LABELS: Record<(typeof FUNDING_ROUND_TYPES)[number], string> = {
  equity: "Equity",
  crowdfunding: "Crowdfunding",
  venture: "Venture",
};

/**
 * Round-type + stage filters over the deal list.
 *
 * A CHIP IS A FACET, NOT A CONTROL. `ENABLED_FUNDING_ROUND_TYPES` is enforced at the API
 * and in SQL, so selecting "Equity" narrows an already-filtered set — usually to nothing —
 * rather than unlocking anything. Equity and venture rounds are securities offerings and
 * stay disabled server-side; keeping the chips visible is honest about what exists, and
 * hiding them would be cosmetic either way.
 */
export default function FundingDealFilterGrid({
  deals,
  searchParams,
}: {
  deals: FundingDeal[];
  searchParams: RawSearchParams;
}) {
  const selectedRoundType = searchParams.roundType;
  const selectedStage = searchParams.stage;

  const roundTypeChips: FilterChipOption[] = [
    {
      label: "All round types",
      href: buildFilterHref(searchParams, { roundType: undefined }),
      isSelected: selectedRoundType === undefined,
    },
    ...FUNDING_ROUND_TYPES.map((roundType) => ({
      label: ROUND_TYPE_LABELS[roundType],
      href: buildFilterHref(searchParams, { roundType }),
      isSelected: selectedRoundType === roundType,
    })),
  ];

  const stageChips: FilterChipOption[] = [
    {
      label: "Every stage",
      href: buildFilterHref(searchParams, { stage: undefined }),
      isSelected: selectedStage === undefined,
    },
    ...PROJECT_STAGES.map((stage) => ({
      label: PROJECT_STAGE_LABELS[stage],
      href: buildFilterHref(searchParams, { stage }),
      isSelected: selectedStage === stage,
    })),
  ];

  return (
    <section className="space-y-4 px-4 lg:px-6">
      <div className="space-y-2">
        <FilterChipRow options={roundTypeChips} ariaLabel="Filter by round type" />
        <FilterChipRow options={stageChips} ariaLabel="Filter by project stage" />
      </div>
      {deals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {deals.map((deal) => (
            <FundingDealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No round matches those filters. Equity and venture rounds are disabled platform-wide —
          they are securities offerings — so only crowdfunding rounds appear here.
        </p>
      )}
    </section>
  );
}
