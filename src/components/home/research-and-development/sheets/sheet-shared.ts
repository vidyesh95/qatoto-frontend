// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
// Shared vocabulary for sheets/*.tsx (mirrors wizard/wizard-shared.ts). Field
// styling lives in @/components/ui/field-classes.

import type { RoleCommitment } from "@/types/research-and-development";

export const COMMITMENT_OPTIONS: RoleCommitment[] = ["full_time", "part_time", "hobby"];

export const COMMITMENT_LABELS: Record<RoleCommitment, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  hobby: "Hobby",
};
