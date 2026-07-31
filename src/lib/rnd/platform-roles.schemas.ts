import { z } from "zod";

// Staff role administration — `GET /admin/whoami`, `GET /admin/platform-roles/lookup`,
// `PUT /admin/platform-roles`.

/** The assignable roles. `null` on the wire means "no staff role", never a fourth value. */
export const PLATFORM_ROLES = ["moderator", "auditor", "admin"] as const;
export const PlatformRoleSchema = z.enum(PLATFORM_ROLES);
export type PlatformRole = z.infer<typeof PlatformRoleSchema>;

/**
 * `capabilities` IS A BARE STRING ARRAY, NOT AN ENUM.
 *
 * The backend's capability set grows whenever a new staff power is carved out, and parsing
 * it as a closed enum would make the whole read fail the day one is added — turning a
 * feature release into a lockout. A caller that cares about one capability compares to a
 * literal, which is forward-compatible by construction.
 */
export const StaffContextSchema = z
  .object({
    userId: z.string(),
    email: z.string(),
    platformRole: PlatformRoleSchema.nullable(),
    capabilities: z.array(z.string()),
  })
  .strip();
export type StaffContext = z.infer<typeof StaffContextSchema>;

/**
 * A PROPOSED role change. Nothing about the subject's access has moved yet.
 *
 * The role changes only when a DIFFERENT admin countersigns — the same two-person rule
 * `compensation_period` uses for money. `previousPlatformRole` is the snapshot the proposal
 * was made against; if the live role has drifted since, countersigning is a 409 rather than
 * a silent overwrite of somebody else's decision.
 */
export const PlatformRoleProposalSchema = z
  .object({
    proposalId: z.string(),
    subjectUserId: z.string(),
    subjectEmail: z.string(),
    subjectName: z.string(),
    previousPlatformRole: PlatformRoleSchema.nullable(),
    nextPlatformRole: PlatformRoleSchema.nullable(),
    proposedByUserId: z.string(),
    /** Null when the proposer's account is gone. Render the id, never "Unknown admin". */
    proposedByName: z.string().nullable(),
    proposedAt: z.string(),
    proposeNote: z.string(),
  })
  .strip();
export type PlatformRoleProposal = z.infer<typeof PlatformRoleProposalSchema>;

/** One account as the grant screen sees it. Reachable only with `manage_platform_roles`. */
export const PlatformRoleSubjectSchema = z
  .object({
    userId: z.string(),
    email: z.string(),
    name: z.string(),
    platformRole: PlatformRoleSchema.nullable(),
  })
  .strip();
export type PlatformRoleSubject = z.infer<typeof PlatformRoleSubjectSchema>;
