// Shared vocabulary for sheets/*.tsx (mirrors wizard/wizard-shared.ts). Field
// styling lives in @/components/ui/field-classes.

import type { RoleCommitment } from "@/types/research-and-development";

export const COMMITMENT_OPTIONS: RoleCommitment[] = ["full-time", "part-time", "hobby"];

export const COMMITMENT_LABELS: Record<RoleCommitment, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  hobby: "Hobby",
};
