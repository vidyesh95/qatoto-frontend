import { z } from "zod";
import {
  CategoryPinIconKeySchema,
  OpenRoleCompensationStrandSchema,
  ProjectStageSchema,
  RoleCommitmentSchema,
} from "@/lib/rnd/shared.schemas";

// The root-mounted cross-project catalogue: `GET /open-roles` and
// `GET /research-categories`. Root-mounted because a visitor arriving from a landing
// stage card has not picked a project and holds no slug.
//
// Mirrors `project-roles.service.ts`'s `OpenRoleView`.

export const OPEN_ROLE_STATUSES = ["open", "closed", "filled"] as const;

/**
 * One open role, carrying its project's identity ON THE ROW.
 *
 * `projectSlug`, `projectName`, `projectStage`, `projectCoverImageUrl` and `currency`
 * all ride along so a role card renders with no second request — the projection
 * widened rather than a companion endpoint appearing. This is what retires the old
 * `MOCK_OPEN_ROLES` derivation, which flatMapped roles out of the project array and
 * therefore could not exist without the whole project list in memory.
 *
 * The backend field is `projectCoverImageUrl`. The frontend mocks called it
 * `coverImageSrc`, which exists nowhere in the backend.
 */
export const OpenRoleSchema = z
  .object({
    id: z.string(),
    projectSlug: z.string(),
    projectName: z.string(),
    projectStage: ProjectStageSchema,
    projectCoverImageUrl: z.string().nullable(),
    roleTitle: z.string(),
    skills: z.string().array(),
    commitment: RoleCommitmentSchema,
    status: z.enum(OPEN_ROLE_STATUSES),
    slotsTotal: z.number(),
    slotsFilledCount: z.number(),
    description: z.string().nullable(),
    // Resolved from the project — a role never carries a client-chosen currency.
    currency: z.string(),
    compensation: OpenRoleCompensationStrandSchema.array(),
    createdAt: z.string(),
  })
  .strip();
export type OpenRole = z.infer<typeof OpenRoleSchema>;

export const RESEARCH_CATEGORY_STATUSES = ["pending", "approved", "rejected", "merged"] as const;

/**
 * A taxonomy facet. The DB column is `label`; the wire field is `displayLabel`,
 * aliased at the projection boundary because three clients render it and "label"
 * reads like a form label rather than the name of a taxonomy node.
 */
export const ResearchCategorySchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    displayLabel: z.string(),
    pinIconKey: CategoryPinIconKeySchema,
    status: z.enum(RESEARCH_CATEGORY_STATUSES),
  })
  .strip();
export type ResearchCategory = z.infer<typeof ResearchCategorySchema>;

/**
 * Note `skill` is a SINGLE value here, unlike `/discovery/talent`'s repeatable
 * `?skill=`. Passing an array would repeat the key and the `.strict()` object schema
 * rejects the second occurrence. If a multi-skill role filter is wanted, the backend
 * schema has to widen first.
 */
export interface ListOpenRolesFilter {
  readonly commitment?: z.infer<typeof RoleCommitmentSchema>;
  readonly skill?: string;
  readonly category?: string;
  readonly minEquityBasisPoints?: number;
  readonly page?: number;
  readonly limit?: number;
}
