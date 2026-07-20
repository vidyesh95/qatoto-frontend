"use client";

import { useMemo, useState } from "react";

import { PROJECT_IMMORTAL_ROOT_BRANCH_ID } from "@/mocks/project-immortal-mocks";
import type { ImmortalResearchBranch } from "@/types/research-and-development";

import { ResearchBranchDetailPanel } from "./research-branch-detail-panel";
import { BRANCH_STATUS_ORDER, BRANCH_STATUS_STYLES } from "./research-branch-map.constants";
import { buildBranchEdgePath } from "./research-branch-map.geometry";

type ResearchBranchMapProps = {
  branches: ImmortalResearchBranch[];
};

// The crowd-research flowchart: every branch netizens are working on, drawn as a
// hand-rolled svg tree (no graph library, mock phase). Selecting a node fills the
// detail panel — selection is set-only, so the panel never empties.
export default function ResearchBranchMap({ branches }: ResearchBranchMapProps) {
  const [selectedBranchId, setSelectedBranchId] = useState(PROJECT_IMMORTAL_ROOT_BRANCH_ID);

  const branchEdges = useMemo(() => {
    const branchesById = new Map(branches.map((branch) => [branch.id, branch]));
    return branches.flatMap((childBranch) => {
      if (childBranch.parentBranchId === null) return [];
      const parentBranch = branchesById.get(childBranch.parentBranchId);
      if (!parentBranch) return [];
      return [
        {
          childBranchId: childBranch.id,
          parentBranchId: parentBranch.id,
          pathData: buildBranchEdgePath(
            parentBranch.canvasPosition.leftPercent,
            parentBranch.canvasPosition.topPercent,
            childBranch.canvasPosition.leftPercent,
            childBranch.canvasPosition.topPercent,
          ),
          strokeColor: BRANCH_STATUS_STYLES[childBranch.status].edgeStrokeColor,
          isMissingBranchEdge: childBranch.status === "missing",
        },
      ];
    });
  }, [branches]);

  const selectedBranch =
    branches.find((branch) => branch.id === selectedBranchId) ?? branches[0] ?? null;

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Every branch of longevity research the crowd is working on. Qatoto marks where groups
        overlap and highlights the gaps nobody has picked up yet.
      </p>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl bg-[#00696E]/5 p-2 sm:p-4">
            <div className="relative h-105 min-w-180 sm:h-120">
              <svg
                aria-hidden
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                {branchEdges.map((branchEdge) => {
                  const isHighlighted =
                    branchEdge.parentBranchId === selectedBranchId ||
                    branchEdge.childBranchId === selectedBranchId;
                  return (
                    <path
                      key={branchEdge.childBranchId}
                      d={branchEdge.pathData}
                      fill="none"
                      stroke={branchEdge.strokeColor}
                      strokeWidth={isHighlighted ? 2 : 1.25}
                      strokeOpacity={isHighlighted ? 1 : 0.4}
                      strokeDasharray={branchEdge.isMissingBranchEdge ? "4 4" : undefined}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>

              {branches.map((branch) => {
                const branchStatusStyle = BRANCH_STATUS_STYLES[branch.status];
                const isSelected = branch.id === selectedBranchId;
                const hasOverlappingGroups = branch.overlappingGroupCount >= 2;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => setSelectedBranchId(branch.id)}
                    aria-pressed={isSelected}
                    aria-label={`${branch.title} — ${branchStatusStyle.label}`}
                    style={{
                      left: `${branch.canvasPosition.leftPercent}%`,
                      top: `${branch.canvasPosition.topPercent}%`,
                    }}
                    className={`absolute z-10 flex max-w-36 -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col gap-1 rounded-2xl border-2 bg-card px-3 py-2 text-left shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#00696E] focus-visible:ring-offset-2 ${branchStatusStyle.nodeBorderClassName} ${
                      isSelected ? "ring-2 ring-[#00696E] ring-offset-2" : ""
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${branchStatusStyle.statusDotClassName}`}
                      />
                      <span className="truncate text-xs font-medium">{branch.title}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {branch.contributorCount} contributors · {branch.discussionCount} threads
                    </span>
                    {hasOverlappingGroups && (
                      <span className="w-fit rounded-full bg-[#D6E3FF] px-1.5 text-[10px] text-blue-900">
                        {branch.overlappingGroupCount} teams overlap
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {BRANCH_STATUS_ORDER.map((branchStatus) => (
              <li
                key={branchStatus}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className={`size-1.5 rounded-full ${BRANCH_STATUS_STYLES[branchStatus].statusDotClassName}`}
                />
                {BRANCH_STATUS_STYLES[branchStatus].label}
              </li>
            ))}
          </ul>
        </div>

        {selectedBranch && <ResearchBranchDetailPanel branch={selectedBranch} />}
      </div>
    </div>
  );
}
