import { z } from "zod";

// Shapes shared by more than one research-and-development domain, plus the enum
// tuples the backend's pgEnums define.
//
// EVERY VALUE HERE WAS READ OFF THE BACKEND, not off R_AND_D_BACKEND_STRUCTURE.md.
// The doc is a design record and drifts from the shipped enums in a few places (see
// docs/R_AND_D_STRUCTURE.md §13); `src/db/schema.ts` and the service view interfaces
// are the contract. When a value below looks wrong, re-read the pgEnum.
//
// Every object schema ends `.strip()` so a backend minor release that adds a field
// is a no-op here rather than a parse failure (CLAUDE.md Pattern 2).

/** `pagination`, a sibling of `data` on every offset-paginated list. */
export const PaginationMetaSchema = z
  .object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  })
  .strip();

// --- Enum tuples (backend `src/db/schema.ts`) --------------------------------

export const PROJECT_STAGES = [
  "market_research",
  "problem_validation",
  "team_building",
  "building_mvp",
  "raising_funding",
  "go_to_market",
] as const;
export const ProjectStageSchema = z.enum(PROJECT_STAGES);
export type ProjectStage = z.infer<typeof ProjectStageSchema>;

export const RESEARCH_PROJECT_STATUSES = ["draft", "active", "archived"] as const;
export const ResearchProjectStatusSchema = z.enum(RESEARCH_PROJECT_STATUSES);

export const ROLE_COMMITMENTS = ["full_time", "part_time", "hobby"] as const;
export const RoleCommitmentSchema = z.enum(ROLE_COMMITMENTS);
export type RoleCommitment = z.infer<typeof RoleCommitmentSchema>;

export const TREND_DIRECTIONS = ["up", "down", "flat"] as const;
export const TrendDirectionSchema = z.enum(TREND_DIRECTIONS);
export type TrendDirection = z.infer<typeof TrendDirectionSchema>;

export const COMPENSATION_KINDS = ["salary", "one_time", "equity"] as const;
export const CompensationKindSchema = z.enum(COMPENSATION_KINDS);

/**
 * The first two values are RETIRED — readable on historical rows, never writable.
 * They must not appear in any picker; `slicing_pie_vesting` is the only equity
 * policy and cash is reported, not disbursed by Qatoto.
 */
export const COMPENSATION_EARNED_AS_POLICIES = [
  "milestone_escrow_release",
  "on_completion_escrow_release",
  "slicing_pie_vesting",
  "off_platform_payroll",
  "direct_transfer",
] as const;
export const CompensationEarnedAsPolicySchema = z.enum(COMPENSATION_EARNED_AS_POLICIES);
export type CompensationEarnedAsPolicy = z.infer<typeof CompensationEarnedAsPolicySchema>;

export const CATEGORY_PIN_ICON_KEYS = [
  "water",
  "energy",
  "health",
  "agriculture",
  "housing",
  "transport",
  "waste",
  "connectivity",
  "manufacturing",
  "education",
  "other",
] as const;
export const CategoryPinIconKeySchema = z.enum(CATEGORY_PIN_ICON_KEYS);
export type CategoryPinIconKey = z.infer<typeof CategoryPinIconKeySchema>;

export const DISCOVERY_REGION_KINDS = ["global", "macro_region", "country"] as const;
export const DiscoveryRegionKindSchema = z.enum(DISCOVERY_REGION_KINDS);

// --- Nested reference projections -------------------------------------------

/** A category as it appears nested on a cluster, insight or demand signal. */
export const DiscoveryCategoryRefSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    displayLabel: z.string(),
    pinIconKey: CategoryPinIconKeySchema,
  })
  .strip();
export type DiscoveryCategoryRef = z.infer<typeof DiscoveryCategoryRefSchema>;

export const DiscoveryRegionRefSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    displayLabel: z.string(),
    kind: DiscoveryRegionKindSchema,
    countryCode: z.string().nullable(),
    parentRegionId: z.string().nullable(),
  })
  .strip();
export type DiscoveryRegionRef = z.infer<typeof DiscoveryRegionRefSchema>;

/**
 * One advertised compensation strand on an open role.
 *
 * A discriminated union would be the better shape, but the backend returns the raw
 * `open_role_compensation` row — every money column present and null for the kinds
 * that don't use it — so the schema mirrors that rather than pretending otherwise.
 * Read the field that matches `kind`; the rest are null by construction, enforced by
 * a DB CHECK.
 *
 * These are OFFERS, never grants. Equity is computed by the §9 slice ledger and by
 * nothing else — no endpoint sets a member's share from a body.
 */
export const OpenRoleCompensationStrandSchema = z
  .object({
    id: z.string(),
    kind: CompensationKindSchema,
    salaryMinInCentsPerMonth: z.number().nullable(),
    salaryMaxInCentsPerMonth: z.number().nullable(),
    oneTimeMinInCents: z.number().nullable(),
    oneTimeMaxInCents: z.number().nullable(),
    equityBasisPointsMin: z.number().nullable(),
    equityBasisPointsMax: z.number().nullable(),
    earnedAsPolicy: CompensationEarnedAsPolicySchema,
    earnedAsNote: z.string().nullable(),
  })
  .strip();
export type OpenRoleCompensationStrand = z.infer<typeof OpenRoleCompensationStrandSchema>;
