// TRANSPORT: props-only — a style table. No fetching, no data.
import type { ResearchBranchStatus } from "@/lib/rnd/research-programs.schemas";

/**
 * How each derived branch status is drawn.
 *
 * The LABELS live in `@/lib/rnd/labels` with every other enum label; this table is only the
 * visual half, so a copy change and a colour change do not touch the same file.
 */
export type BranchStatusStyle = {
  nodeBorderClassName: string;
  statusDotClassName: string;
  statusChipClassName: string;
  edgeStrokeColor: string;
};

export const BRANCH_STATUS_STYLES: Record<ResearchBranchStatus, BranchStatusStyle> = {
  active: {
    nodeBorderClassName: "border-[#00696E]",
    statusDotClassName: "bg-[#00696E]",
    statusChipClassName: "bg-[#00696E]/10 text-[#00696E]",
    edgeStrokeColor: "#00696E",
  },
  emerging: {
    nodeBorderClassName: "border-amber-500",
    statusDotClassName: "bg-amber-500",
    statusChipClassName: "bg-amber-100 text-amber-800",
    edgeStrokeColor: "#F59E0B",
  },
  contested: {
    nodeBorderClassName: "border-[#BA1A1A]",
    statusDotClassName: "bg-[#BA1A1A]",
    statusChipClassName: "bg-red-100 text-red-800",
    edgeStrokeColor: "#BA1A1A",
  },
  // DASHED, and that is the point: a gap is drawn as an absence rather than as a colour, so it
  // reads as missing even to someone who cannot distinguish the hues.
  missing: {
    nodeBorderClassName: "border-dashed border-[#8A6116]",
    statusDotClassName: "bg-[#8A6116]",
    statusChipClassName: "bg-[#8A6116]/10 text-[#8A6116]",
    edgeStrokeColor: "#8A6116",
  },
};

/** Legend order: the two states the map exists to surface come last, where the eye lands. */
export const BRANCH_STATUS_ORDER: ResearchBranchStatus[] = [
  "active",
  "emerging",
  "contested",
  "missing",
];
