import Link from "next/link";

import {
  formatEffortFromMinutes,
  formatEquityFromBasisPoints,
  formatIsoInstant,
} from "@/components/home/research-and-development/sections/compensation-format";
import type {
  LaunchReadinessItem,
  LaunchReadinessItemKey,
  LaunchReadinessState,
  ProjectLaunchReadiness,
} from "@/types/research-and-development";

const READINESS_ITEM_TITLES: Record<LaunchReadinessItemKey, string> = {
  stage_is_go_to_market: "The project reached the go-to-market stage",
  verified_effort_recorded: "Verified effort is on record",
  equity_allocated: "Equity has been allocated",
  cap_table_baked: "The cap table is baked",
  supplier_engaged: "At least one supplier is engaged",
  store_listing_exists: "A store listing exists",
};

const READINESS_STATE_BADGES: Record<LaunchReadinessState, { label: string; className: string }> = {
  met: { label: "Met", className: "bg-[#00696E]/10 text-[#00696E]" },
  not_met: { label: "Not met", className: "bg-muted text-muted-foreground" },
  // A waiver is a recorded decision by a named person, not a softer "met".
  // Nothing grants one today, so this badge is currently unreachable.
  waived: { label: "Waived", className: "bg-amber-100 text-amber-800" },
};

// The count behind an item is an integer, never server prose, so the sentence
// is composed here — and localizes with the client rather than with the server.
function describeObservedCount(item: LaunchReadinessItem): string {
  switch (item.key) {
    case "stage_is_go_to_market":
      return item.state === "met" ? "Currently in this stage" : "Still in an earlier stage";
    case "verified_effort_recorded":
      return `${formatEffortFromMinutes(item.observedCount)} verified across the team`;
    case "equity_allocated":
      return `${formatEquityFromBasisPoints(item.observedCount)} of the pie allocated`;
    case "cap_table_baked":
      return item.state === "met" ? "Baked once, and frozen since" : "No bake has been run";
    case "supplier_engaged":
      return `${item.observedCount} supplier${item.observedCount === 1 ? "" : "s"} engaged`;
    case "store_listing_exists":
      return `${item.observedCount} active listing${item.observedCount === 1 ? "" : "s"}`;
    default: {
      const exhaustiveCheck: never = item.key;
      return exhaustiveCheck;
    }
  }
}

type LaunchReadinessChecklistProps = {
  readiness: ProjectLaunchReadiness;
  projectName: string;
};

// Six derived items, never stored and never settable. Each is computed from the
// project's stage, its stats, the pie-bake event, its supplier engagements and
// whether an active listing exists.
//
// A missing signal reads `not_met`, never `0`-as-met: the stats columns are
// nullable precisely so "no job has run" stays distinguishable from "the job
// ran and found nothing", and coercing them would report a pipeline gap as a
// finding about the project. On the real API this is member-only, so a
// non-member gets a 404 rather than a preview of someone else's readiness.
export default function LaunchReadinessChecklist({
  readiness,
  projectName,
}: LaunchReadinessChecklistProps) {
  const metItemCount = readiness.items.filter((item) => item.state === "met").length;

  return (
    <section className="space-y-3 px-4 lg:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">
          What a project needs before it lists
        </h2>
        <p className="text-xs text-muted-foreground">
          {metItemCount} of {readiness.items.length} met · as of {formatIsoInstant(readiness.asOf)}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Worked through for{" "}
        <Link
          href={`/research-and-development/project/${readiness.projectId}`}
          className="font-medium text-[#00696E] underline underline-offset-2"
        >
          {projectName}
        </Link>
        . Each project&apos;s own members see their own checklist inside the project.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {readiness.items.map((item) => (
          <li key={item.key} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${READINESS_STATE_BADGES[item.state].className}`}
            >
              {READINESS_STATE_BADGES[item.state].label}
            </span>
            <p className="mt-2 font-medium">{READINESS_ITEM_TITLES[item.key]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{describeObservedCount(item)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
