// ---------- Project Immortal (moonshot open-research program) ----------
// Mock fixtures live in src/mocks/project-immortal-mocks.ts. Data truth lives
// in the Express backend; these shapes are the client-side contract only.

import type { CompensationKind } from "./project";

export type ImmortalPaperCategory =
  | "longevity-biology"
  | "cellular-reprogramming"
  | "ai-drug-discovery"
  | "organ-regeneration"
  | "ethics-and-society";

export type ImmortalResearchPaper = {
  id: string;
  title: string;
  authorName: string;
  authorAffiliation: string;
  category: ImmortalPaperCategory;
  // Display-formatted, e.g. "2.4 MB".
  fileSizeLabel: string;
  // e.g. "Jun 28, 2026" — "Just now" for client-side additions.
  uploadedDateLabel: string;
  // Set on client-side additions; renders a "You" chip.
  isUploadedByViewer?: boolean;
};

// Informal track — blog-like research idea, no proofs or citations required.
export type ImmortalInformalPost = {
  id: string;
  title: string;
  authorName: string;
  authorAvatarSrc: string;
  postedAtLabel: string;
  bodyText: string;
  reactionCountLabel: string;
  replyCountLabel: string;
  isPostedByViewer?: boolean;
};

export type ImmortalIdeaReply = {
  id: string;
  authorName: string;
  authorAvatarSrc: string;
  postedAtLabel: string;
  replyText: string;
  likeCountLabel: string;
};

export type ImmortalIdea = {
  id: string;
  authorName: string;
  authorAvatarSrc: string;
  authorLocation: string;
  postedAtLabel: string;
  ideaText: string;
  likeCountLabel: string;
  replies: ImmortalIdeaReply[];
};

// "missing" = a research gap Qatoto highlights for contributors to pick up.
export type ImmortalBranchStatus = "active" | "emerging" | "contested" | "missing";

export type ImmortalBranchCanvasPosition = {
  leftPercent: number;
  topPercent: number;
};

// One node in the crowd-research flowchart; parentBranchId=null is the root.
// overlappingGroupCount marks how many teams work the same branch — Qatoto's
// research aggregation surfaces the overlap so groups can join forces.
export type ImmortalResearchBranch = {
  id: string;
  parentBranchId: string | null;
  title: string;
  summary: string;
  status: ImmortalBranchStatus;
  contributorCount: number;
  discussionCount: number;
  // >= 2 renders an overlap marker on the node and detail panel.
  overlappingGroupCount: number;
  // Hand-authored percent position on the flowchart canvas.
  canvasPosition: ImmortalBranchCanvasPosition;
  recentThreadTitles: string[];
};

// Monetizable product Qatoto highlights as derivable from a research branch.
export type ImmortalProductOpportunity = {
  id: string;
  productName: string;
  productDescription: string;
  derivedFromBranchTitle: string;
  // e.g. "$12B est. market".
  marketPotentialLabel: string;
  // e.g. "Monetizable in 2–4 yrs".
  readinessLabel: string;
};

export type ImmortalContributorRole =
  | "researcher"
  | "founder-director"
  | "venture-capitalist"
  | "supplier"
  | "supporter";

// Aliased to CompensationKind (./project) — same union, one source of truth.
// Adding a 4th kind there forces every Immortal Record map to handle it
// (compile error until it does), so the two can't silently drift.
export type ImmortalCompensationPreference = CompensationKind;

// Qatoto tracks each contributor's effort and money applied to the project and
// distributes compensation per the contributor's stated preference.
export type ImmortalContributor = {
  id: string;
  name: string;
  avatarSrc: string;
  role: ImmortalContributorRole;
  // e.g. "312 hrs logged".
  effortLabel: string;
  // e.g. "$250K escrowed" | "Senolytics assay data".
  contributionLabel: string;
  compensationPreference: ImmortalCompensationPreference;
};

export type ImmortalProgramStat = {
  id: string;
  // Display-formatted, e.g. "2,847".
  statValue: string;
  statLabel: string;
};
