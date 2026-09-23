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
    nodeBorderClassName: "border-primary-imprint",
    statusDotClassName: "bg-primary-imprint",
    statusChipClassName: "bg-primary-imprint/10 text-primary-imprint",
    edgeStrokeColor: "var(--primary-imprint)",
  },
  emerging: {
    nodeBorderClassName: "border-amber-500",
    statusDotClassName: "bg-amber-500",
    statusChipClassName: "bg-amber-100 text-amber-800",
    edgeStrokeColor: "var(--color-amber-500)",
  },
  contested: {
    nodeBorderClassName: "border-destructive",
    statusDotClassName: "bg-destructive",
    statusChipClassName: "bg-red-100 text-red-800",
    edgeStrokeColor: "var(--destructive)",
  },
  // DASHED, and that is the point: a gap is drawn as an absence rather than as a colour, so it
  // reads as missing even to someone who cannot distinguish the hues.
  missing: {
    nodeBorderClassName: "border-dashed border-amber-700",
    statusDotClassName: "bg-amber-700",
    statusChipClassName: "bg-amber-700/10 text-amber-700",
    edgeStrokeColor: "var(--color-amber-700)",
  },
};

/** Legend order: the two states the map exists to surface come last, where the eye lands. */
export const BRANCH_STATUS_ORDER: ResearchBranchStatus[] = [
  "active",
  "emerging",
  "contested",
  "missing",
];
