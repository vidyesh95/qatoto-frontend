// TRANSPORT: props-only — presentational. Fetches nothing.

import Link from "next/link";

import { formatTradeValueCompact } from "@/lib/rnd/import-format";
import type { LocalizationAssessment } from "@/lib/rnd/import-intelligence.schemas";
import { IMPORT_COMMODITY_KIND_LABELS } from "@/lib/rnd/labels";

/** The arrow beside a score, and what it is allowed to claim. */
const TREND_GLYPHS: Record<"up" | "down" | "flat", string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

const TREND_CLASSES: Record<"up" | "down" | "flat", string> = {
  up: "text-[#00696E]",
  down: "text-[#8C4A4A]",
  flat: "text-muted-foreground",
};

/**
 * One commodity on the feasibility leaderboard.
 *
 * THE SCORE IS SHOWN WITH ITS RANK AND ITS TOP COMPONENT, never alone. A bare "73" invites
 * a reader to treat it as a grade; "73 · #4 · mostly import dependence" says what it is
 * made of and lets them disagree with it.
 */
export default function CommodityCard({ assessment }: { assessment: LocalizationAssessment }) {
  const components = [
    { label: "import dependence", points: assessment.importDependencyPoints },
    { label: "export capability", points: assessment.exportCapabilityPoints },
    { label: "substitutes", points: assessment.substituteAvailabilityPoints },
    { label: "supplier capacity", points: assessment.supplierCapacityPoints },
    { label: "lead time", points: assessment.leadTimeAdvantagePoints },
  ];
  const strongestComponent = components.toSorted((left, right) => right.points - left.points)[0];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/research-and-development/import-intelligence/${assessment.hsCode}`}
            className="line-clamp-2 text-sm font-medium hover:text-[#00696E]"
          >
            {assessment.commodityLabel}
          </Link>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">HS {assessment.hsCode}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-semibold text-[#00696E]">
            {assessment.feasibilityScorePoints}
            <span className="text-xs font-normal text-muted-foreground">/100</span>
          </p>
          <p className={`text-xs ${TREND_CLASSES[assessment.trendDirection]}`}>
            {TREND_GLYPHS[assessment.trendDirection]} #{assessment.rank}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {IMPORT_COMMODITY_KIND_LABELS[assessment.commodityKind]}
        </span>
        <span className="rounded-full bg-[#00696E]/10 px-2 py-0.5 text-xs text-[#00696E]">
          {formatTradeValueCompact(assessment.observedImportValueInCents, assessment.currency)}{" "}
          imported
        </span>
      </div>

      {/* `mt-auto` so cards in a grid align on their last row. */}
      <p className="mt-auto text-xs text-muted-foreground">
        Mostly {strongestComponent?.label ?? "unscored"} ({strongestComponent?.points ?? 0} pts)
      </p>
    </div>
  );
}
