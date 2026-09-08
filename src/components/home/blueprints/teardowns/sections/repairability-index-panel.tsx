// TRANSPORT: props-only — the repairability score. Arrives from the teardown detail page.

import type {
  TeardownRepairabilityCriterion,
  TeardownRepairabilityIndex,
} from "@/lib/blueprints/schemas";

const MAXIMUM_SCORE = 10;

/**
 * The four criteria in reading order, keyed so the record must stay exhaustive: a fifth criterion
 * on the contract is a compile error HERE rather than a panel that quietly renders four of five.
 */
const REPAIRABILITY_CRITERIA: readonly {
  readonly key: keyof Omit<TeardownRepairabilityIndex, "overallScoreOutOfTen">;
  readonly label: string;
}[] = [
  { key: "fastenerUniformity", label: "Fastener uniformity" },
  { key: "toolAccessibility", label: "Tool accessibility" },
  { key: "disassemblyStepCount", label: "Disassembly steps" },
  { key: "modularIndependence", label: "Modular independence" },
];

function CriterionRow({
  label,
  criterion,
}: {
  readonly label: string;
  readonly criterion: TeardownRepairabilityCriterion;
}) {
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-foreground">{label}</span>
        <span className="shrink-0 text-[#6F7979] tabular-nums">
          {criterion.scoreOutOfTen} of {MAXIMUM_SCORE}
        </span>
      </div>
      {/* The bar is decoration: the number beside it is the accessible value. */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="presentation">
        <div
          className="h-full rounded-full bg-[#00696E]"
          style={{ width: `${(criterion.scoreOutOfTen / MAXIMUM_SCORE) * 100}%` }}
        />
      </div>
      <p className="text-xs leading-5 text-[#6F7979]">{criterion.note}</p>
    </li>
  );
}

/**
 * THE OVERALL IS PRINTED AS STORED, NEVER AVERAGED FROM THE FOUR. The criteria are not equally
 * weighted — which of them matters most depends on the device, and that is the publisher's
 * judgement — so a client that averaged would print a number nobody stated and would silently
 * change every published score the day the weighting did.
 */
export default function RepairabilityIndexPanel({
  repairabilityIndex,
}: {
  readonly repairabilityIndex: TeardownRepairabilityIndex | null;
}) {
  if (repairabilityIndex === null) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">Repairability</h2>
      <div className="mt-2 max-w-2xl rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <p className="shrink-0 text-3xl font-semibold text-[#00696E]">
            {repairabilityIndex.overallScoreOutOfTen}
            <span className="text-sm font-normal text-[#6F7979]">/{MAXIMUM_SCORE}</span>
          </p>
          <p className="text-xs leading-5 text-[#6F7979]">
            Scored by the author against four criteria. The overall is their judgement, not an
            average of the four.
          </p>
        </div>

        <ul className="mt-4 space-y-3">
          {REPAIRABILITY_CRITERIA.map(({ key, label }) => (
            <CriterionRow key={key} label={label} criterion={repairabilityIndex[key]} />
          ))}
        </ul>
      </div>
    </section>
  );
}
