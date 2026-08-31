// Client contract for AUTHORING a pathway — the seven `/commerce/pathways` routes plus the two
// `/commerce/admin/pathways` moderation routes.
//
// ⚠️ **ITS OWN FILE, NOT AN EXTENSION OF `merchandising.schemas.ts`, AND THE TWO PROJECTIONS ARE
// GENUINELY DIFFERENT SHAPES.** The public read resolves a set for a shopper: a candidate arrives
// with a full product card, live pricing, a `state` and a `chosenCandidateKey`, and its `key` is a
// SYNTHESISED string (`derived:<productId>`) that is not a database id and must never be sent
// back. The authoring read is the stored plan: a candidate is a real row id, a product id, an
// optional variant and a rank. Sharing one schema would mean one of the two lying about what it
// holds.
//
// What IS shared, and is imported rather than copied: `PRODUCT_RELATION_KINDS` and its label map.
// A slot's `derivedRelationKind` names the same graph edge the reader resolves against.

import { z } from "zod";

import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";
import { PRODUCT_RELATION_KINDS } from "@/lib/store/merchandising.schemas";

/**
 * The five accents a pathway may be SAVED with.
 *
 * ⚠️ **DELIBERATELY NOT `AccentTokenSchema`, WHICH IS `z.string()` ON PURPOSE.** That schema is the
 * READ side, and it is permissive because "a `z.enum` here would fail the whole page for an accent
 * nobody has styled yet" — a read must survive a value the frontend has no class for. A WRITE has
 * the opposite duty: the backend body is a strict five-value enum, so offering a sixth swatch would
 * be building a control whose only outcome is a 422. Keep the two apart.
 */
export const PATHWAY_ACCENTS = ["amber", "slate", "emerald", "sky", "rose"] as const;

export type PathwayAccent = (typeof PATHWAY_ACCENTS)[number];

/**
 * `store_merchandising_state`. Only two of the five are editable.
 *
 * ⚠️ **`active` IS TERMINAL AND THERE IS NO WAY BACK.** No route deletes, withdraws or unpublishes
 * a pathway; `retired` exists in the enum and nothing ever sets it. Once a moderator publishes,
 * every edit route answers `INVALID_STATE` forever and the slug is permanently taken. The only
 * lever that can ever remove a published set from the storefront is `endsAt`, and that can only be
 * written while the set is still editable — i.e. BEFORE it is submitted.
 */
export const PATHWAY_STATES = ["draft", "pending_review", "active", "rejected", "retired"] as const;

export type PathwayState = (typeof PATHWAY_STATES)[number];

/** The two states `updatePathway`, the image routes and both replace-sets will accept. */
export const EDITABLE_PATHWAY_STATES: readonly PathwayState[] = ["draft", "rejected"];

export function isEditablePathwayState(state: PathwayState): boolean {
  return EDITABLE_PATHWAY_STATES.includes(state);
}

export const PATHWAY_IMAGE_SLOTS = ["hero", "card"] as const;

export type PathwayImageSlot = (typeof PATHWAY_IMAGE_SLOTS)[number];

/**
 * One candidate as the AUTHOR sees it.
 *
 * The three name fields are a backend addition made for this surface: the row stores only ids, and
 * no read anywhere resolves a product id to a title for an arbitrary caller — the public product
 * read is keyed on slug, and `GET /products/:id` 404s on another seller's listing, which is exactly
 * the case that matters because a curated set is supposed to mix other people's products with your
 * own. Without them an editor could only render uuids.
 */
export const PathwayCandidateAuthoringSchema = z
  .object({
    id: z.string(),
    productId: z.string(),
    variantId: z.string().nullable(),
    rank: z.number().int(),
    productTitle: z.string().nullable(),
    productPublicSlug: z.string().nullable(),
    variantName: z.string().nullable(),
    /**
     * ⚠️ The floor a slot's `quantity` must reach. The variant's own minimum when the candidate
     * names one, the product's otherwise. `null` is UNSTATED, which imposes no floor — not one.
     */
    minimumOrderQuantity: z.number().int().nullable(),
  })
  .strip();

export type PathwayCandidateAuthoring = z.infer<typeof PathwayCandidateAuthoringSchema>;

/**
 * One slot as the author sees it.
 *
 * ⚠️ **`id` IS NOT STABLE ACROSS A SAVE.** `PUT …/slots` deletes every slot and re-inserts, so an
 * id read here is dead the moment the next save lands. Nothing may cache one, and the editor keys
 * its local rows POSITIONALLY. See the api file.
 */
export const PathwaySlotAuthoringSchema = z
  .object({
    id: z.string(),
    roleLabel: z.string(),
    isRequired: z.boolean(),
    quantity: z.number().int(),
    siblingOrder: z.number().int(),
    derivedRelationKind: z.enum(PRODUCT_RELATION_KINDS).nullable(),
    startsAt: IsoDateTimeSchema.nullable(),
    endsAt: IsoDateTimeSchema.nullable(),
    candidates: z.array(PathwayCandidateAuthoringSchema),
  })
  .strip();

export type PathwaySlotAuthoring = z.infer<typeof PathwaySlotAuthoringSchema>;

export const PathwayAuthoringSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string().nullable(),
    // The READ stays permissive — a set saved before a swatch existed must still parse.
    accent: z.string(),
    state: z.enum(PATHWAY_STATES),
    anchorProductId: z.string().nullable(),
    anchorProductTitle: z.string().nullable(),
    heroImageUrl: z.string().nullable(),
    cardImageUrl: z.string().nullable(),
    ownerOrganizationId: z.string().nullable(),
    submittedAt: IsoDateTimeSchema.nullable(),
    reviewedAt: IsoDateTimeSchema.nullable(),
    reviewNote: z.string().nullable(),
    startsAt: IsoDateTimeSchema.nullable(),
    endsAt: IsoDateTimeSchema.nullable(),
    slots: z.array(PathwaySlotAuthoringSchema),
  })
  .strip();

export type PathwayAuthoring = z.infer<typeof PathwayAuthoringSchema>;

/**
 * The moderation queue row: the whole authoring projection plus the self-dealing signal.
 *
 * ⚠️ **`ownCandidateShare` IS SURFACED, NEVER ACTED ON.** The backend's own words: without review "a
 * seller composes a set entirely from its own SKUs and a curated look becomes an advertisement" —
 * but "a bicycle maker legitimately supplies most of a bicycle kit, and only a reviewer can tell
 * that from self-dealing." So the console renders the number and never thresholds on it.
 *
 * ⚠️ **`null` DOES NOT MEAN ZERO.** It is null for a platform-curated set with no owner, and null
 * for one with no stored candidates at all — including a set built entirely from DERIVED slots,
 * whose candidates are resolved at read time and never stored. A fully-derived set therefore
 * reports null however self-dealing it is, which is a limit of the signal rather than a bug.
 */
export const PathwayModerationSchema = PathwayAuthoringSchema.extend({
  ownCandidateShare: z.number().nullable(),
  candidateCount: z.number().int(),
}).strip();

export type PathwayModeration = z.infer<typeof PathwayModerationSchema>;

export const PathwayAuthoringPageSchema = cursorPageOf(PathwayAuthoringSchema);
export const PathwayModerationPageSchema = cursorPageOf(PathwayModerationSchema);

export type PathwayAuthoringPage = z.infer<typeof PathwayAuthoringPageSchema>;
export type PathwayModerationPage = z.infer<typeof PathwayModerationPageSchema>;

/**
 * `POST /commerce/pathways`.
 *
 * ⚠️ **`slug` IS SET ONCE AND NEVER AGAIN.** `UpdatePathwaySchema` has no `slug` key and the body is
 * `.strict()`, so it is not merely ignored later — it is a 422. A slug is a public URL identity.
 */
export interface CreatePathwayInput {
  readonly slug: string;
  readonly title: string;
  readonly summary?: string;
  readonly accent?: PathwayAccent;
  readonly anchorProductId?: string;
  readonly startsAt?: string;
  readonly endsAt?: string;
}

/**
 * `PATCH /commerce/pathways/:pathwayId` — SPARSE.
 *
 * An omitted key is untouched; an explicit `null` clears a nullable one. The body refines to "at
 * least one field", so an empty patch is a 422 rather than a no-op — the form refuses it locally
 * instead, the way `OfferingEditForm` does.
 */
export interface UpdatePathwayInput {
  readonly title?: string;
  readonly summary?: string | null;
  readonly accent?: PathwayAccent;
  readonly anchorProductId?: string | null;
  readonly startsAt?: string | null;
  readonly endsAt?: string | null;
}

/**
 * One slot in a `PUT …/slots` body.
 *
 * ⚠️ **NO `id`, AND ADDING ONE IS A 422.** Identity is the array index: the server writes
 * `siblingOrder: index` and mints a fresh row id for every slot on every save.
 */
export interface PathwaySlotInput {
  readonly roleLabel: string;
  readonly isRequired?: boolean;
  readonly quantity?: number;
  readonly derivedRelationKind?: (typeof PRODUCT_RELATION_KINDS)[number];
  readonly startsAt?: string;
  readonly endsAt?: string;
}

/** One candidate in a `PUT …/slots/:slotId/candidates` body. Also no `id`. */
export interface PathwayCandidateInput {
  readonly productId: string;
  readonly variantId?: string;
  readonly rank?: number;
}

/** `POST /commerce/admin/pathways/:pathwayId/moderate`. A rejection MUST say why. */
export interface ModeratePathwayInput {
  readonly decision: "publish" | "reject";
  readonly reviewNote?: string;
}

export const PATHWAY_STATE_LABELS: Record<PathwayState, string> = {
  draft: "Draft — only your organization can see it",
  pending_review: "Waiting for review",
  active: "Published",
  rejected: "Sent back — you can edit and resubmit",
  retired: "Retired",
};

/** Server caps, mirrored so the editor refuses before the server has to. */
export const MAXIMUM_SLOTS_PER_PATHWAY = 100;
export const MAXIMUM_CANDIDATES_PER_SLOT = 12;
