// Shared vocabulary for the post-idea wizard steps. Field options mirror the
// original post-idea sheet (sheets/post-idea-sheet.tsx, kept as the compact
// entry point's donor). Field styling lives in @/components/ui/field-classes.

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

// Step 1 also owns the category picker, which needs the live option list (seed
// categories plus anything the user created this session) and a single commit
// callback covering both "picked an existing one" and "made a new one".
export type IdeaBasicsStepProps = NewIdeaStepProps & {
  categoryOptions: string[];
  onCategoryCommit: (committedCategoryName: string) => void;
};
