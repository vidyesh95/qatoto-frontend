// Shared vocabulary for the post-idea wizard steps. Field options mirror the
// original post-idea sheet (sheets/post-idea-sheet.tsx, kept as the compact
// entry point's donor); styling constants match the R&D sheet inputs.

import type { RoleCommitment } from "@/types/research-and-development";

export const IDEA_CATEGORIES = [
  "Agriculture",
  "Clean Energy",
  "Healthcare",
  "Housing",
  "Logistics",
  "Manufacturing",
  "Water",
];

export const ROLES_NEEDED_OPTIONS = [
  "Engineer",
  "Designer",
  "Hardware",
  "Marketing",
  "Operations",
  "Finance",
];

export const INPUT_CLASS =
  "w-full rounded-lg border border-[#6F7979] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#00696E]";
export const LABEL_CLASS = "text-xs font-medium text-[#6F7979]";

export type NewIdeaDraft = {
  ideaName: string;
  oneLinePitch: string;
  category: string;
  problemItSolves: string;
  targetRegion: string;
  demandEvidenceNotes: string;
  rolesNeeded: string[];
  equityToOffer: string;
  expectedCommitment: RoleCommitment;
};

export type NewIdeaStepProps = {
  draft: NewIdeaDraft;
  onDraftChange: (draftPatch: Partial<NewIdeaDraft>) => void;
};
