"use client";

import { useMemo, useState } from "react";

import { PROJECT_IMMORTAL_ROOT_BRANCH_ID } from "@/lib/project-immortal-mocks";
import type {
  ImmortalBranchStatus,
  ImmortalResearchBranch,
} from "@/types/research-and-development";

type BranchStatusStyle = {
  label: string;
  nodeBorderClassName: string;
  statusDotClassName: string;
  statusChipClassName: string;
  edgeStrokeColor: string;
};

// Status drives node border, dot, chip, and edge color. Never color alone — the
// detail panel and node both carry the text label.
const BRANCH_STATUS_STYLES: Record<ImmortalBranchStatus, BranchStatusStyle> = {
  active: {
    label: "Active",
    nodeBorderClassName: "border-[#00696E]",
    statusDotClassName: "bg-[#00696E]",
    statusChipClassName: "bg-[#00696E]/10 text-[#00696E]",
    edgeStrokeColor: "#00696E",
  },
  emerging: {
    label: "Emerging",
    nodeBorderClassName: "border-amber-500",
    statusDotClassName: "bg-amber-500",
    statusChipClassName: "bg-amber-100 text-amber-800",
    edgeStrokeColor: "#F59E0B",
  },
  contested: {
    label: "Contested",
    nodeBorderClassName: "border-[#BA1A1A]",
    statusDotClassName: "bg-[#BA1A1A]",
    statusChipClassName: "bg-red-100 text-red-800",
    edgeStrokeColor: "#BA1A1A",
  },
  missing: {
    label: "Missing research",
    nodeBorderClassName: "border-dashed border-[#8A6116]",
    statusDotClassName: "bg-[#8A6116]",
    statusChipClassName: "bg-[#8A6116]/10 text-[#8A6116]",
    edgeStrokeColor: "#8A6116",
  },
};

const BRANCH_STATUS_ORDER: ImmortalBranchStatus[] = ["active", "emerging", "contested", "missing"];

// Nodes and edges share one 0–100 coordinate space: the svg viewBox is stretched
// to fill the canvas (preserveAspectRatio="none"), and node left/top are the same
// percentages, so an edge endpoint lands exactly on its node's center.
const buildBranchEdgePath = (
  parentLeftPercent: number,
  parentTopPercent: number,
  childLeftPercent: number,
  childTopPercent: number,
) => {
  const horizontalControlOffset = (childLeftPercent - parentLeftPercent) / 2;
  const firstControlX = parentLeftPercent + horizontalControlOffset;
  const secondControlX = childLeftPercent - horizontalControlOffset;
  return `M ${parentLeftPercent} ${parentTopPercent} C ${firstControlX} ${parentTopPercent}, ${secondControlX} ${childTopPercent}, ${childLeftPercent} ${childTopPercent}`;
};

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
            <div className="relative h-[420px] min-w-[720px] sm:h-[480px]">
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

function ResearchBranchDetailPanel({ branch }: { branch: ImmortalResearchBranch }) {
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
