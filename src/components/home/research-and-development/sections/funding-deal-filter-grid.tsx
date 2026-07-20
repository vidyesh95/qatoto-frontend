"use client";

import { useState } from "react";

import FundingDealCard, {
  type FundingDeal,
} from "@/components/home/research-and-development/cards/funding-deal-card";
import { PROJECT_STAGE_LABELS } from "@/mocks/research-and-development-mocks";
import type { FundingRoundType, ProjectStage } from "@/types/research-and-development";

const ROUND_TYPE_FILTER_LABELS: Record<FundingRoundType | "all", string> = {
  all: "All round types",
  equity: "Equity",
  crowdfunding: "Crowdfunding",
  venture: "Venture",
};

const ROUND_TYPE_FILTER_ORDER: (FundingRoundType | "all")[] = [
  "all",
  "equity",
  "crowdfunding",
  "venture",
];

const STAGE_FILTER_ORDER: ProjectStage[] = [
  "market-research",
  "problem-validation",
  "team-building",
  "building-mvp",
  "raising-funding",
  "go-to-market",
];

const FILTER_CHIP_CLASS =
  "shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors";

// Client island: round-type + stage filters over the static deal list. Plain
// in-memory .filter — real deal-flow queries are backend-owned later.
export default function FundingDealFilterGrid({ deals }: { deals: FundingDeal[] }) {
  const [selectedRoundType, setSelectedRoundType] = useState<FundingRoundType | "all">("all");
  const [selectedStage, setSelectedStage] = useState<ProjectStage | "all">("all");

  const filteredDeals = deals.filter((deal) => {
    const matchesRoundType =
      selectedRoundType === "all" || deal.openRound.type === selectedRoundType;
    const matchesStage = selectedStage === "all" || deal.stage === selectedStage;
    return matchesRoundType && matchesStage;
  });

  return (
    <section className="space-y-4 px-4 lg:px-6">
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto">
          {ROUND_TYPE_FILTER_ORDER.map((roundTypeFilter) => (
            <button
              key={roundTypeFilter}
              type="button"
              onClick={() => setSelectedRoundType(roundTypeFilter)}
              className={`${FILTER_CHIP_CLASS} ${
                selectedRoundType === roundTypeFilter
                  ? "bg-[#00696E] text-white"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              {ROUND_TYPE_FILTER_LABELS[roundTypeFilter]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedStage("all")}
            className={`${FILTER_CHIP_CLASS} ${
              selectedStage === "all"
                ? "bg-[#00696E] text-white"
                : "bg-muted text-foreground hover:bg-muted/70"
            }`}
          >
            All stages
          </button>
          {STAGE_FILTER_ORDER.map((stageFilter) => (
            <button
              key={stageFilter}
              type="button"
              onClick={() => setSelectedStage(stageFilter)}
              className={`${FILTER_CHIP_CLASS} ${
                selectedStage === stageFilter
                  ? "bg-[#00696E] text-white"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              {PROJECT_STAGE_LABELS[stageFilter]}
            </button>
          ))}
        </div>
      </div>
      {filteredDeals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDeals.map((deal) => (
            <FundingDealCard key={deal.openRound.id} deal={deal} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No open rounds match those filters right now.
        </p>
      )}
    </section>
  );
}
