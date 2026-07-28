// TRANSPORT: props-only — presentational server component. Fetches nothing, and takes
// no readiness data, deliberately: see below.
import Link from "next/link";

import {
  LAUNCH_READINESS_ITEM_KEYS,
  type LaunchReadinessItemKey,
} from "@/lib/rnd/suppliers.schemas";

const READINESS_ITEM_TITLES: Record<LaunchReadinessItemKey, string> = {
  stage_is_go_to_market: "The project reached the go-to-market stage",
  verified_effort_recorded: "Verified effort is on record",
  equity_allocated: "Equity has been allocated",
  cap_table_baked: "The cap table is baked",
  supplier_engaged: "At least one supplier is engaged",
  store_listing_exists: "A store listing exists",
};

const READINESS_ITEM_NOTES: Record<LaunchReadinessItemKey, string> = {
  stage_is_go_to_market: "Set by the founder, and recorded as a stage transition.",
  verified_effort_recorded: "Minutes the verification pipeline confirmed — not hours claimed.",
  equity_allocated: "Basis points the slice ledger has actually assigned.",
  cap_table_baked: "Run once, ever, and frozen after.",
  supplier_engaged: "The project's own record of who it approached.",
  store_listing_exists: "A live listing created in the studio.",
};

/**
 * The six gates a project passes before it lists — as an EXPLAINER, with no states and no
 * counts.
 *
 * WHY NO REAL CHECKLIST HERE. `GET /research-projects/:slug/launch-readiness` is
 * `requireAuth` plus project membership and answers `404` to everyone else. This page is
 * cross-project and the visitor has picked no project, so there is no slug to ask about
 * and no membership to prove — and fetching six checklists for six projects would leak
 * membership-gated figures to anyone who loaded the page. A member sees their own real
 * checklist inside their project.
 *
 * Each item is DERIVED, never stored: there is no readiness table and no endpoint that
 * sets a state. On the real payload a missing signal reads `not_met` rather than `0`,
 * because the stats columns are nullable precisely so "no job has run" stays
 * distinguishable from "the job ran and found nothing".
 *
 * There are three states, not four — and `waived` is currently UNREACHABLE: no waiver
 * table exists and no endpoint grants one. Nothing here may imply a waiver path.
 */
export default function LaunchReadinessChecklist() {
  return (
    <section className="space-y-3 px-4 lg:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">
          What a project needs before it lists
        </h2>
        <p className="text-xs text-muted-foreground">
          {LAUNCH_READINESS_ITEM_KEYS.length} gates, all derived
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Every gate is computed from what the project has actually recorded — none of them can be set
        by hand.{" "}
        <Link
          href="/research-and-development"
          className="font-medium text-[#00696E] underline underline-offset-2"
        >
          Open a project you are a member of
        </Link>{" "}
        to see where it stands.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {LAUNCH_READINESS_ITEM_KEYS.map((itemKey) => (
          <li key={itemKey} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
            <p className="font-medium">{READINESS_ITEM_TITLES[itemKey]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{READINESS_ITEM_NOTES[itemKey]}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
