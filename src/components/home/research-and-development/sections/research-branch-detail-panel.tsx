import type { ImmortalResearchBranch } from "@/types/research-and-development";

import { BRANCH_STATUS_STYLES } from "./research-branch-map.constants";

export function ResearchBranchDetailPanel({ branch }: { branch: ImmortalResearchBranch }) {
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
          {branchStatusStyle.label}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{branch.summary}</p>

      {isMissingBranch && (
        <p className="rounded-xl bg-[#8A6116]/10 p-3 text-xs text-[#8A6116]">
          Highlighted gap — nobody is researching this yet. Qatoto surfaces missing research and
          data so contributors can pick it up.
        </p>
      )}

      {hasOverlappingGroups && (
        <p className="rounded-xl bg-[#D6E3FF] p-3 text-xs text-blue-900">
          Qatoto marked {branch.overlappingGroupCount} groups researching this branch — consider
          joining forces instead of duplicating the work.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {branch.contributorCount} contributors · {branch.discussionCount} discussion threads
      </p>

      <div className="space-y-2">
        <p className="text-xs font-medium">Recent discussions</p>
        <ul className="space-y-1.5">
          {branch.recentThreadTitles.map((threadTitle) => (
            <li key={threadTitle} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span
                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${branchStatusStyle.statusDotClassName}`}
              />
              {threadTitle}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C]"
      >
        {isMissingBranch ? "Start this research" : "Join discussion"}
      </button>
    </div>
  );
}
