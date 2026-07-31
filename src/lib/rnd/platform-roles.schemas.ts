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
