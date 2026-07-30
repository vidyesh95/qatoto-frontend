// TRANSPORT: client-query — holds selection state and renders the claim control, which calls
// `useProgramBranchClaimMutation`. The tree itself arrives as props from the server page.
"use client";

import { useMemo, useState } from "react";

import { useProgramBranchClaimMutation } from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";
import { RESEARCH_BRANCH_STATUS_LABELS } from "@/lib/rnd/labels";
import { layOutBranchTree, permilleToPercent } from "@/lib/rnd/branch-tree-layout";
import type { ResearchBranch } from "@/lib/rnd/research-programs.schemas";

import { MutationErrorNotice } from "./mutation-feedback";
import { ResearchBranchDetailPanel } from "./research-branch-detail-panel";
import { BRANCH_STATUS_ORDER, BRANCH_STATUS_STYLES } from "./research-branch-map.constants";
import { buildBranchEdgePath } from "./research-branch-map.geometry";

type ResearchBranchMapProps = {
  programSlug: string;
  branches: ResearchBranch[];
  /**
   * Whether the viewer may claim a branch — signed in, on a published program. Passed down from
   * the server page rather than inferred here, because a client component cannot see the session.
   */
  canClaimBranch: boolean;
};

/**
 * The crowd-research flowchart: every branch of the program, drawn as a hand-rolled SVG tree.
 *
 * POSITIONS ARE COMPUTED, NOT AUTHORED. The mock this replaces carried a hand-tuned
 * `canvasPosition` per node, which broke at any other viewport and had no answer for a twelfth
 * branch. `layOutBranchTree` runs a tidy layered layout from `parentBranchId` + `siblingOrder`, so
 * a branch anybody adds is placed correctly without a designer.
 *
 * Selection is set-only, so the detail panel never empties.
 */
export default function ResearchBranchMap({
  programSlug,
  branches,
  canClaimBranch,
}: ResearchBranchMapProps) {
  // The first branch in depth-first order — a root, since the backend orders by ancestor path.
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.branchId ?? "");

  const claimMutation = useProgramBranchClaimMutation(programSlug);

  const layout = useMemo(
    () => layOutBranchTree(branches, { orientation: "horizontal" }),
    [branches],
  );

  const positionByBranchId = useMemo(
    () => new Map(layout.nodes.map((node) => [node.branchId, node])),
    [layout],
  );

  const statusByBranchId = useMemo(
    () => new Map(branches.map((branch) => [branch.branchId, branch.status])),
    [branches],
  );

  const selectedBranch =
    branches.find((branch) => branch.branchId === selectedBranchId) ?? branches[0] ?? null;

  if (branches.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <p className="max-w-2xl text-sm text-muted-foreground">
          This programme has no research branches yet. The first one maps out the question
          everything else hangs off.
        </p>
      </div>
    );
  }

  const claimError =
    claimMutation.error instanceof ApiRequestError ? claimMutation.error : undefined;

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Every branch of this research the crowd is working on. Overlaps and gaps are computed
        nightly from claims and approved papers — not set by whoever edited last.
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
                {layout.edges.map((edge) => {
                  const isHighlighted =
                    edge.fromBranchId === selectedBranchId || edge.toBranchId === selectedBranchId;
                  const childStatus = statusByBranchId.get(edge.toBranchId) ?? "emerging";
                  return (
                    <path
                      key={edge.toBranchId}
                      // The viewBox is 0–100 and per-mille is 0–1000, so the edge coordinates are
                      // divided by ten to share one space with the nodes' percentage offsets.
                      d={buildBranchEdgePath(
                        edge.fromLeftPermille / 10,
                        edge.fromTopPermille / 10,
                        edge.toLeftPermille / 10,
                        edge.toTopPermille / 10,
                      )}
                      fill="none"
                      stroke={BRANCH_STATUS_STYLES[childStatus].edgeStrokeColor}
                      strokeWidth={isHighlighted ? 2 : 1.25}
                      strokeOpacity={isHighlighted ? 1 : 0.4}
                      strokeDasharray={childStatus === "missing" ? "4 4" : undefined}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>

              {branches.map((branch) => {
                const branchStatusStyle = BRANCH_STATUS_STYLES[branch.status];
                const position = positionByBranchId.get(branch.branchId);
                if (!position) return null;

                const isSelected = branch.branchId === selectedBranchId;
                const hasOverlappingGroups = branch.overlappingGroupCount >= 2;

                return (
                  <button
                    key={branch.branchId}
                    type="button"
                    onClick={() => setSelectedBranchId(branch.branchId)}
                    aria-pressed={isSelected}
                    aria-label={`${branch.title} — ${RESEARCH_BRANCH_STATUS_LABELS[branch.status]}`}
                    style={{
                      left: permilleToPercent(position.leftPermille),
                      top: permilleToPercent(position.topPermille),
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
                        {branch.overlappingGroupCount} overlap
                      </span>
                    )}
                    {branch.isClaimedByViewer && (
                      <span className="w-fit rounded-full bg-[#00696E]/10 px-1.5 text-[10px] text-[#00696E]">
                        You
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
                {RESEARCH_BRANCH_STATUS_LABELS[branchStatus]}
              </li>
            ))}
          </ul>
        </div>

        {selectedBranch && (
          <ResearchBranchDetailPanel
            branch={selectedBranch}
            claimControl={
              canClaimBranch ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={claimMutation.isPending}
                    onClick={() => {
                      claimMutation.mutate({
                        branchId: selectedBranch.branchId,
                        // Both verbs are idempotent server-side, so the only thing this guards
                        // against is a pointless request — not a wrong outcome.
                        action: selectedBranch.isClaimedByViewer ? "release" : "claim",
                      });
                    }}
                    className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {selectedBranch.isClaimedByViewer
                      ? "Stop working on this"
                      : selectedBranch.status === "missing"
                        ? "Start this research"
                        : "Work on this branch"}
                  </button>
                  {claimError && <MutationErrorNotice error={claimError.apiError} />}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sign in to pick up a branch.</p>
              )
            }
          />
        )}
      </div>
    </div>
  );
}
