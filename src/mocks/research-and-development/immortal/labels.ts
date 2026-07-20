// Mock Project Immortal labels — the root branch id and the display-label
// lookups for enum-like fields. Split out of project-immortal-mocks.ts only
// for file size — same convention: fixtures, no getters.

import type {
  ImmortalCompensationPreference,
  ImmortalContributorRole,
  ImmortalPaperCategory,
} from "@/types/research-and-development";

// The root of the research flowchart — the branch map selects it by default.
export const PROJECT_IMMORTAL_ROOT_BRANCH_ID = "branch-hallmarks-of-aging";

export const IMMORTAL_PAPER_CATEGORY_LABELS: Record<ImmortalPaperCategory, string> = {
  "longevity-biology": "Longevity Biology",
  "cellular-reprogramming": "Cellular Reprogramming",
  "ai-drug-discovery": "AI Drug Discovery",
  "organ-regeneration": "Organ Regeneration",
  "ethics-and-society": "Ethics & Society",
};

export const IMMORTAL_CONTRIBUTOR_ROLE_LABELS: Record<ImmortalContributorRole, string> = {
  researcher: "Researcher",
  "founder-director": "Founder & Director",
  "venture-capitalist": "Venture Capitalist",
  supplier: "Supplier",
  supporter: "Supporter",
};

export const IMMORTAL_COMPENSATION_PREFERENCE_LABELS: Record<
  ImmortalCompensationPreference,
  string
> = {
  salary: "Salary",
  "one-time": "One-time",
  equity: "Equity",
};
