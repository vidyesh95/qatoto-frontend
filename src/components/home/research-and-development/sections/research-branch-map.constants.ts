import type { ImmortalBranchStatus } from "@/types/research-and-development";

export type BranchStatusStyle = {
  label: string;
  nodeBorderClassName: string;
  statusDotClassName: string;
  statusChipClassName: string;
  edgeStrokeColor: string;
};

// Status drives node border, dot, chip, and edge color. Never color alone — the
// detail panel and node both carry the text label.
export const BRANCH_STATUS_STYLES: Record<ImmortalBranchStatus, BranchStatusStyle> = {
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

export const BRANCH_STATUS_ORDER: ImmortalBranchStatus[] = [
  "active",
  "emerging",
  "contested",
  "missing",
];
