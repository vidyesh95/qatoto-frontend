// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
// Shared vocabulary for the post-idea wizard steps. Field styling lives in
// @/components/ui/field-classes.
//
// `sheets/post-idea-sheet.tsx` is GONE. It was a second, mock entry point for the same
// act, and once the wizard started creating real drafts a sheet that posted nowhere was
// a way to believe you had posted an idea you had not.

import type { RoleCommitment } from "@/lib/rnd/shared.schemas";

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
  /**
   * Percent strings from two numeric inputs, converted to INTEGER BASIS POINTS on submit.
   * The wire field is `offeredEquityBasisPointsMin` / `…Max` and no float ever touches
   * equity, so "2–4% per role" as one free-text string had nowhere to go.
   */
  offeredEquityPercentMin: string;
  offeredEquityPercentMax: string;
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
