// TRANSPORT: props-only — presentational server component. Fetches nothing; the view
// state arrives as a prop from project-detail, which read
// GET /research-projects/:slug/launch-readiness.
import {
  READINESS_ITEM_NOTES,
  READINESS_ITEM_TITLES,
} from "@/components/home/research-and-development/sections/launch-readiness-checklist";
import RndStatusPanel, {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { formatIsoInstant } from "@/lib/rnd/format";
import type { LaunchReadiness, LaunchReadinessState } from "@/lib/rnd/suppliers.schemas";
import type { MemberScopedItemViewState } from "@/lib/view-state";

const READINESS_STATE_LABELS: Record<LaunchReadinessState, string> = {
  met: "Met",
  not_met: "Not met",
  waived: "Waived",
};

const READINESS_STATE_BADGE_CLASS: Record<LaunchReadinessState, string> = {
  met: "bg-[#00696E]/10 text-[#00696E]",
  not_met: "bg-muted text-muted-foreground",
  waived: "bg-amber-100 text-amber-800",
};

/**
 * This project's six launch gates, with real states and real counts.
 *
 * THE MEMBER-ONLY COUNTERPART of the `/go-to-market` explainer.
 * `GET …/launch-readiness` is `requireAuth` plus membership and answers `404` to
 * everyone else, which is why the cross-project page renders copy and this one renders
 * figures. `restricted` covers both refusals and never says which.
 *
 * DERIVED ON EVERY READ, never stored: there is no readiness table and no body that sets
 * a state, so a gate flips on the next GET after the fact that satisfies it — the
 * `supplier_engaged` gate needs no job at all, only a first engagement row.
 *
 * `observedCount` is NULL when the underlying signal was never computed, and null renders
 * as an absence rather than as `0`. Zero says "the job ran and found nothing"; null says
 * "no job has looked", and on a Slicing Pie surface those are different claims.
 *
 * `waived` is representable and currently UNREACHABLE — no waiver table exists and no
 * endpoint grants one. It is rendered because the union admits it, and nothing here
 * offers a waiver path.
 */
export default function ProjectLaunchReadiness({
  readinessState,
}: {
  readinessState: MemberScopedItemViewState<LaunchReadiness>;
}) {
  switch (readinessState.status) {
    case "error":
      return <RndErrorPanel message="Couldn't load the launch readiness checklist." />;
    case "restricted":
      return readinessState.isSignInRequired ? (
        <RndSignInRequiredPanel message="Sign in to see where this project stands on launch readiness." />
      ) : (
        <RndMembersOnlyPanel message="Launch readiness is visible to this project's team." />
      );
    case "ready": {
      const readiness = readinessState.item;
      if (readiness.items.length === 0) {
        return <RndStatusPanel message="No launch gates are defined for this project yet." />;
      }
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm">
              {readiness.metCount} of {readiness.totalCount} gates met
            </p>
            {/* Two of the six read job-computed columns that advance with no write, so a
                checklist without its own "as of" asserts freshness it does not have. */}
            <p className="text-xs text-muted-foreground">
              {readiness.asOf === null
                ? "Some signals have never been computed"
                : `As of ${formatIsoInstant(readiness.asOf)}`}
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {readiness.items.map((item) => (
              <li key={item.key} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{READINESS_ITEM_TITLES[item.key]}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${READINESS_STATE_BADGE_CLASS[item.state]}`}
                  >
                    {READINESS_STATE_LABELS[item.state]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {READINESS_ITEM_NOTES[item.key]}
                </p>
                {item.observedCount !== null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Observed: {item.observedCount.toLocaleString("en-US")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = readinessState;
      return exhaustiveCheck;
    }
  }
}
