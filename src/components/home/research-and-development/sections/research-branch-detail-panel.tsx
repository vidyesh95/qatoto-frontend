// TRANSPORT: props-only — presentational. Fetches nothing; the claim control is injected by the
// client-query island above, so this stays renderable on either side of the boundary.
import type { ReactNode } from "react";

import { RESEARCH_BRANCH_STATUS_LABELS } from "@/lib/rnd/labels";
import type { ResearchBranch } from "@/lib/rnd/research-programs.schemas";

import { BRANCH_STATUS_STYLES } from "./research-branch-map.constants";

/**
 * The selected branch, in detail.
 *
 * The two callouts are the map's editorial voice, and both are worded to say the platform DERIVED
 * them rather than that anyone asserted them — because that is what `status` and
 * `overlappingGroupCount` are: nightly computations over claims and paper coverage, which no
 * request body can set.
 *
 * The overlap callout says "treat it as a prompt to look" on purpose. The detection compares
 * branch WORDING, so it under-reports two branches that mean the same thing in different words —
 * and over-claiming here would accuse two honest groups of duplicating work.
 */
export function ResearchBranchDetailPanel({
  branch,
  claimControl,
}: {
  branch: ResearchBranch;
  claimControl?: ReactNode;
}) {
  const branchStatusStyle = BRANCH_STATUS_STYLES[branch.status];
  const isMissingBranch = branch.status === "missing";
  const hasOverlappingGroups = branch.overlappingGroupCount >= 2;

  return (
    <div
      aria-live="polite"
      className="space-y-3 self-start rounded-2xl border border-[#CAC4D0]/60 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium">{branch.title}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${branchStatusStyle.statusChipClassName}`}
        >
          {RESEARCH_BRANCH_STATUS_LABELS[branch.status]}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{branch.summary}</p>

      {isMissingBranch && (
        <p className="rounded-xl bg-[#8A6116]/10 p-3 text-xs text-[#8A6116]">
          Highlighted gap — nobody has claimed this branch and no approved paper covers it. Computed
          nightly from what contributors have actually done, not set by anyone.
        </p>
      )}

      {hasOverlappingGroups && (
        <p className="rounded-xl bg-[#D6E3FF] p-3 text-xs text-blue-900">
          {branch.overlappingGroupCount} other branches ask a near-identical question — consider
          joining forces instead of duplicating the work. Detected by comparing branch wording, so
          treat it as a prompt to look rather than a verdict.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {branch.contributorCount} contributors · {branch.discussionCount} discussion threads ·{" "}
        {branch.approvedPaperCount} approved papers
      </p>

      {branch.recentThreadTitles.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium">Recent discussions</p>
          <ul className="space-y-1.5">
            {branch.recentThreadTitles.map((threadTitle) => (
              <li
                key={threadTitle}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <span
                  className={`mt-1.5 size-1.5 shrink-0 rounded-full ${branchStatusStyle.statusDotClassName}`}
                />
                {threadTitle}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No discussion on this branch yet — start one from the ideas track below.
        </p>
      )}

      {claimControl}
    </div>
  );
}
