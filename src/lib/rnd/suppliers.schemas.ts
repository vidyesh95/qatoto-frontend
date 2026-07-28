import { z } from "zod";
import { ProjectStageSchema } from "@/lib/rnd/shared.schemas";

// Go-to-market: `GET /suppliers`, `/supplier-capabilities`, `/launch-ready-projects`
// and the member-only `/research-projects/:slug/launch-readiness`.
// Mirrors `suppliers.service.ts` and `launch-readiness.service.ts`.
//
// THREE OF THESE ENUMS DISAGREE WITH THE PRE-EXISTING FRONTEND TYPES in
// `src/types/research-and-development/discovery.ts`, whose header claims the
// go-to-market shapes were "authored in §11 wire format from the start" with nothing
// to migrate. They were not:
//
//   verificationState  frontend had 3 values, backend has 4 (`documents_pending`)
//   capability kind    frontend had 4 values, backend has 8
//   contactPolicy      frontend had open/request_only/closed — backend uses
//                      via_platform/direct_email/no_contact. Entirely different values.
//
// The values below are the shipped ones. Recorded in docs/R_AND_D_STRUCTURE.md §13.

/**
 * How far a listing has been checked. Defaults to `unverified` and is NEVER
 * client-settable — a directory whose rows assert their own trust level is worse than
 * no directory. Only a platform moderator moves it.
 */
export const SUPPLIER_VERIFICATION_STATES = [
  "unverified",
  "documents_pending",
  "verified",
  "suspended",
] as const;
export const SupplierVerificationStateSchema = z.enum(SUPPLIER_VERIFICATION_STATES);
export type SupplierVerificationState = z.infer<typeof SupplierVerificationStateSchema>;

export const SUPPLIER_CAPABILITY_KINDS = [
  "manufacturing",
  "assembly",
  "tooling",
  "packaging",
  "logistics",
  "certification",
  "design",
  "sourcing",
] as const;
export const SupplierCapabilityKindSchema = z.enum(SUPPLIER_CAPABILITY_KINDS);
export type SupplierCapabilityKind = z.infer<typeof SupplierCapabilityKindSchema>;

/**
 * How a supplier agreed to be approached. `no_contact` exists because a curated
 * directory lists entities that never asked to be listed — a moderator-added row from
 * public information must be able to say "reference only" rather than becoming an
 * inbox nobody consented to.
 */
export const SUPPLIER_CONTACT_POLICIES = ["via_platform", "direct_email", "no_contact"] as const;
export const SupplierContactPolicySchema = z.enum(SUPPLIER_CONTACT_POLICIES);
export type SupplierContactPolicy = z.infer<typeof SupplierContactPolicySchema>;

/** One entry of the SEEDED capability vocabulary. There is no POST for these. */
export const SupplierCapabilitySchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    displayLabel: z.string(),
    kind: SupplierCapabilityKindSchema,
  })
  .strip();
export type SupplierCapability = z.infer<typeof SupplierCapabilitySchema>;

/**
 * A manufacturing / ODM partner. Deliberately carries NO money field: currency
 * derives from a project and a supplier belongs to none, so a directory-level price
 * would have to invent one. A quote belongs to an engagement, priced in that
 * project's currency — and the backend has no price column here either.
 *
 * `slug` is unwritable after creation; clients link to it.
 */
export const SupplierSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    summary: z.string().nullable(),
    regionSlug: z.string().nullable(),
    regionDisplayLabel: z.string().nullable(),
    verificationState: SupplierVerificationStateSchema,
    contactPolicy: SupplierContactPolicySchema,
    websiteUrl: z.string().nullable(),
    // Integer days, never "12 days".
    leadTimeDays: z.number().nullable(),
    minimumOrderQuantity: z.number().nullable(),
    capabilities: SupplierCapabilitySchema.array(),
    createdAt: z.string(),
  })
  .strip();
export type Supplier = z.infer<typeof SupplierSchema>;

/**
 * A launch-ready project and what it ACTUALLY listed, joined through
 * `product.researchProjectId`. Listing creation is the studio's job, not R&D's.
 *
 * The two stats are NULL until §9's jobs have run and are never coerced to 0 —
 * zero would assert "this project has no verified effort" when the truth is "no job
 * has looked".
 */
export const LaunchReadyProjectSchema = z
  .object({
    projectSlug: z.string(),
    projectName: z.string(),
    projectCoverImageUrl: z.string().nullable(),
    projectTagline: z.string(),
    verifiedEffortMinutesTotal: z.number().nullable(),
    allocatedEquityBasisPoints: z.number().nullable(),
    statsComputedAt: z.string().nullable(),
    launchedProducts: z
      .object({
        productId: z.string(),
        title: z.string(),
        status: z.string(),
      })
      .strip()
      .array(),
  })
  .strip();
export type LaunchReadyProject = z.infer<typeof LaunchReadyProjectSchema>;

// --- Launch readiness (member-only, per project) -----------------------------

export const LAUNCH_READINESS_ITEM_KEYS = [
  "stage_is_go_to_market",
  "verified_effort_recorded",
  "equity_allocated",
  "cap_table_baked",
  "supplier_engaged",
  "store_listing_exists",
] as const;
export const LaunchReadinessItemKeySchema = z.enum(LAUNCH_READINESS_ITEM_KEYS);
export type LaunchReadinessItemKey = z.infer<typeof LaunchReadinessItemKeySchema>;

/**
 * Three states, not four. `waived` is representable but CURRENTLY UNREACHABLE —
 * there is no waiver table and no endpoint that grants one. It stays in the union
 * because a waiver, when it lands, is a recorded decision by a named person rather
 * than a fourth flavour of `met`. No UI may imply a waiver path exists today.
 */
export const LAUNCH_READINESS_STATES = ["met", "not_met", "waived"] as const;
export const LaunchReadinessStateSchema = z.enum(LAUNCH_READINESS_STATES);
export type LaunchReadinessState = z.infer<typeof LaunchReadinessStateSchema>;

export const LaunchReadinessItemSchema = z
  .object({
    key: LaunchReadinessItemKeySchema,
    state: LaunchReadinessStateSchema,
    // The integer the state was decided from, or NULL when the underlying signal has
    // never been computed. Integers only — the client composes the sentence.
    observedCount: z.number().nullable(),
  })
  .strip();
export type LaunchReadinessItem = z.infer<typeof LaunchReadinessItemSchema>;

/**
 * DERIVED, never stored — there is no readiness table and no body that sets a state.
 * `asOf` ships because two of the six items read job-computed columns that advance
 * with no write, so a checklist without it asserts freshness it does not have.
 */
export const LaunchReadinessSchema = z
  .object({
    projectSlug: z.string(),
    stage: ProjectStageSchema,
    items: LaunchReadinessItemSchema.array(),
    metCount: z.number(),
    totalCount: z.number(),
    asOf: z.string().nullable(),
  })
  .strip();
export type LaunchReadiness = z.infer<typeof LaunchReadinessSchema>;

/** `capability` REPEATS and the backend ANDs the values: every slug must match. */
export interface ListSuppliersFilter {
  readonly capability?: readonly string[];
  readonly region?: string;
  readonly verificationState?: SupplierVerificationState;
  readonly page?: number;
  readonly limit?: number;
}
