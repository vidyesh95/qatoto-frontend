// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for merchandising: `GET /store/pathways`, `GET /store/pathways/:pathwaySlug` and
// `GET /store/rails/:railSlug`.
//
// Transcribed from `store-pathways.service.ts` (`StorePathwayCardProjection` :126,
// `StorePathwaySetProjection` :137, the slot/candidate/pricing unions :41-123) and
// `store-merchandising.service.ts` (`MerchandisingItemProjection` :16).
//
// A PATHWAY IS A SET, NOT A RAIL, and the two shapes in this file are different for that reason. A
// rail ranks products that happen to be good and the buyer picks one. A pathway's members relate to
// each other and the buyer's intent is THE WHOLE THING — "everything to fit out a hotel room",
// "everything to assemble 500 bicycles". That is multi-SKU kit sourcing, which single-SKU search is
// worst at, and it is why a pathway carries slots rather than items.
//
// THE THREE RULES THIS FILE ENCODES:
//
//  1. A SLOT IS A ROLE, AND AN UNFILLABLE ONE IS STILL A SLOT. `state: "unavailable"` with an
//     `unavailableReason` is a fact the buyer needs; omitting the slot would make a five-piece kit
//     render as three pieces and look complete. The set-level `completeness` counts are computed
//     over EVERY slot, not the page, so "3 of 5 pieces available" survives pagination.
//  2. THERE IS NO SINGLE SET TOTAL. `currencyTotals` is an array, one entry per currency, because a
//     kit sourced from three countries has three totals — and inventing one number would mean
//     converting currencies without an FX quote.
//  3. `sourceKind` DISTINGUISHES A CURATED CANDIDATE FROM A DERIVED ONE. `derived` comes from the
//     relation graph at read time and rides with a `relationKind`; a `seller_declared` compatibility
//     claim behind it is a CLAIM and may never be rendered as verified fitment.

import { z } from "zod";

import { StoreCategorySchema } from "@/lib/store/catalog.schemas";
import {
  STORE_STOCK_STATES,
  StoreProductCardSchema,
  StoreSellerSummarySchema,
} from "@/lib/store/organizations.schemas";
import { PublicOfferingCardSchema, PublicProviderCardSchema } from "@/lib/store/providers.schemas";
import {
  AccentTokenSchema,
  cursorPageOf,
  MERCHANDISING_ENTITY_KINDS,
  RAIL_STRATEGIES,
} from "@/lib/store/shared.schemas";

// --- Pricing failure, as it reaches a slot ----------------------------------

/**
 * Why a line could not be priced. The same tags the cart and checkout use.
 *
 * Carried here so a slot can say WHY it is unavailable — "the seller retired the variant" and "there
 * are only 4 left" are different problems and a buyer can act on one of them. A generic
 * "unavailable" would flatten all ten into a shrug.
 */
export const CommercePricingErrorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PRODUCT_NOT_FOUND") }).strip(),
  z.object({ type: z.literal("PRODUCT_NOT_PURCHASABLE") }).strip(),
  z
    .object({
      type: z.literal("BELOW_MINIMUM_ORDER_QUANTITY"),
      minimumOrderQuantity: z.number().int(),
    })
    .strip(),
  z.object({ type: z.literal("INSUFFICIENT_STOCK"), availableQuantity: z.number().int() }).strip(),
  z.object({ type: z.literal("SELLER_ORGANIZATION_MISSING") }).strip(),
  z.object({ type: z.literal("VARIANT_REQUIRED") }).strip(),
  z.object({ type: z.literal("VARIANT_NOT_APPLICABLE") }).strip(),
  z.object({ type: z.literal("VARIANT_NOT_FOUND") }).strip(),
  z.object({ type: z.literal("VARIANT_NOT_PURCHASABLE") }).strip(),
  z.object({ type: z.literal("SAMPLE_NOT_AVAILABLE") }).strip(),
]);

// --- Pathway index ----------------------------------------------------------

/**
 * A pathway as it appears on the index and in a rail.
 *
 * `cardImageUrl` is a REAL SERVER-OWNED VALUE now. `store_pathway` had no image column at all until
 * Phase 9, which is the entire reason the frontend used to synthesise a local placeholder banner per
 * slug — that helper deletes itself here.
 *
 * `isAnchored` distinguishes the two shapes one model carries: a curated set whose slots a
 * merchandiser typed, and an anchored set whose slots were RESOLVED from the relation graph against
 * one product. Same route, same wire shape, same renderer — an anchored set is not a second feature.
 */
export const StorePathwayCardSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string().nullable(),
    accent: AccentTokenSchema,
    cardImageUrl: z.string().nullable(),
    isAnchored: z.boolean(),
    slotCount: z.number().int(),
  })
  .strip();

export const StorePathwayIndexPageSchema = cursorPageOf(StorePathwayCardSchema);

// --- Pathway set ------------------------------------------------------------

export const PATHWAY_SLOT_STATES = ["available", "substituted", "unavailable"] as const;

export type PathwaySlotState = (typeof PATHWAY_SLOT_STATES)[number];

/** `curated` was typed by an author; `derived` was resolved from the relation graph at read time. */
export const PATHWAY_CANDIDATE_SOURCE_KINDS = ["curated", "derived"] as const;

export type PathwayCandidateSourceKind = (typeof PATHWAY_CANDIDATE_SOURCE_KINDS)[number];

export const PRODUCT_RELATION_KINDS = [
  "accessory_of",
  "spare_part_of",
  "consumable_for",
  "compatible_with",
  "complements",
  "replaces",
] as const;

export type ProductRelationKind = (typeof PRODUCT_RELATION_KINDS)[number];

/**
 * Why a required slot could not be filled.
 *
 * Three distinct answers, and the buyer can act on two of them: `VARIANT_SELECTION_REQUIRED` means
 * pick a variant, `PRICING_FAILED` carries the underlying pricing tag, and
 * `NO_ELIGIBLE_CANDIDATE` means the set is genuinely short a piece.
 */
export const PathwaySlotUnavailableReasonSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("NO_ELIGIBLE_CANDIDATE") }).strip(),
  z.object({ type: z.literal("VARIANT_SELECTION_REQUIRED") }).strip(),
  z.object({ type: z.literal("PRICING_FAILED"), pricingError: CommercePricingErrorSchema }).strip(),
]);

/**
 * What a candidate costs in this slot, at this quantity — or why it has no price.
 *
 * `lineTotalInCents` is the slot's `quantity` × the unit price, computed by the SERVER. A bicycle
 * takes one saddle and twelve bolts, and multiplying on the client is how a set total starts
 * disagreeing with the cart it seeds.
 */
export const PathwayCandidatePricingSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("priced"),
      currency: z.string(),
      unitPriceInCents: z.number().int(),
      lineTotalInCents: z.number().int(),
      minimumOrderQuantity: z.number().int(),
      stockState: z.enum(STORE_STOCK_STATES),
    })
    .strip(),
  // Not an error: a candidate the server did not price on this read, e.g. beyond the priced window.
  z.object({ status: z.literal("unpriced") }).strip(),
  z.object({ status: z.literal("unavailable"), pricingError: CommercePricingErrorSchema }).strip(),
  z.object({ status: z.literal("variant_selection_required") }).strip(),
]);

/**
 * One product that can fill a slot.
 *
 * `variantId` is on the candidate and not optional-by-accident: A1's rule refuses a cart line naming
 * no variant for a product that has active variants, so a candidate without one would be a piece the
 * set advertises and cannot sell.
 *
 * `key` is the server's identity for the candidate — `chosenCandidateKey` on the slot points at it.
 * A derived candidate's key is synthesised (`derived:<productId>`), so it is NOT a database id and
 * must never be sent anywhere as one.
 */
export const StorePathwayCandidateSchema = z
  .object({
    key: z.string(),
    rank: z.number().int(),
    sourceKind: z.enum(PATHWAY_CANDIDATE_SOURCE_KINDS),
    // Null on a curated candidate — a merchandiser's choice needs no relation to justify it.
    relationKind: z.enum(PRODUCT_RELATION_KINDS).nullable(),
    productId: z.string(),
    variantId: z.string().nullable(),
    variantName: z.string().nullable(),
    product: StoreProductCardSchema,
    pricing: PathwayCandidatePricingSchema,
  })
  .strip();

export const StorePathwaySlotSchema = z
  .object({
    id: z.string(),
    // Display copy, not an enum: the roles in a hotel refit and a bicycle build share nothing.
    roleLabel: z.string(),
    isRequired: z.boolean(),
    quantity: z.number().int(),
    siblingOrder: z.number().int(),
    derivedRelationKind: z.enum(PRODUCT_RELATION_KINDS).nullable(),
    state: z.enum(PATHWAY_SLOT_STATES),
    chosenCandidateKey: z.string().nullable(),
    unavailableReason: PathwaySlotUnavailableReasonSchema.nullable(),
    candidates: z.array(StorePathwayCandidateSchema),
  })
  .strip();

/**
 * A per-currency subtotal, with how many slots contributed to it.
 *
 * `slotCount` matters: a total over 3 of 5 slots is not the price of the set, and stating the count
 * beside the number is what stops it reading as one.
 */
export const StorePathwayCurrencyTotalSchema = z
  .object({
    currency: z.string(),
    subtotalInCents: z.number().int(),
    slotCount: z.number().int(),
  })
  .strip();

export const StorePathwaySetSchema = z
  .object({
    pathway: z
      .object({
        id: z.string(),
        slug: z.string(),
        title: z.string(),
        summary: z.string().nullable(),
        accent: AccentTokenSchema,
        heroImageUrl: z.string().nullable(),
        cardImageUrl: z.string().nullable(),
        // Non-null makes this an anchored set: the slots were resolved against this product.
        anchorProduct: StoreProductCardSchema.nullable(),
      })
      .strip(),
    slots: z.array(StorePathwaySlotSchema),
    currencyTotals: z.array(StorePathwayCurrencyTotalSchema),
    // Computed over EVERY slot, never the page — see the header.
    completeness: z
      .object({
        slotCount: z.number().int(),
        requiredSlotCount: z.number().int(),
        filledRequiredSlotCount: z.number().int(),
        isComplete: z.boolean(),
      })
      .strip(),
    page: z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() }).strip(),
  })
  .strip();

// --- Rails ------------------------------------------------------------------

/**
 * What a merchandising placement points at. FOUR ARMS, and the last two are the point.
 *
 * `category` and `organization` were admitted by the enum since Phase 1 and DROPPED SILENTLY by the
 * resolver until Phase 8 — a merchandiser could place a category in a rail, see nothing rendered,
 * and get no error anywhere. That was the worst of the four A19 integrity bugs. An exhaustive switch
 * over this union on the client is what keeps the same class of bug from recurring here.
 */
export const MerchandisingItemSchema = z.discriminatedUnion("entityKind", [
  z
    .object({
      entityKind: z.literal("product"),
      entityId: z.string(),
      product: StoreProductCardSchema,
    })
    .strip(),
  z
    .object({
      entityKind: z.literal("provider_offering"),
      entityId: z.string(),
      offering: PublicOfferingCardSchema,
      provider: PublicProviderCardSchema,
    })
    .strip(),
  z
    .object({
      entityKind: z.literal("category"),
      entityId: z.string(),
      category: StoreCategorySchema,
    })
    .strip(),
  z
    .object({
      entityKind: z.literal("organization"),
      entityId: z.string(),
      organization: StoreSellerSummarySchema,
    })
    .strip(),
]);

/**
 * `GET /store/rails/:railSlug`.
 *
 * `strategy` is a plain string rather than `z.enum(RAIL_STRATEGIES)` because the backend types it
 * `string` on this projection, and a strategy added server-side should not fail the page. Note
 * `trending_placeholder` returns an EMPTY LIST unconditionally and always will — a rail carrying it
 * is not broken and must render as empty, not as an error.
 */
export const StoreRailPageSchema = z
  .object({
    rail: z.object({ slug: z.string(), title: z.string(), strategy: z.string() }).strip(),
    items: z.array(MerchandisingItemSchema),
    page: z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() }).strip(),
  })
  .strip();

// --- Store home ---------------------------------------------------------------

/**
 * One hero slide, from `store_hero_slide`.
 *
 * `linkTargetKind` and `linkTargetSlug` are ALL-OR-NOTHING on the wire — the table carries a CHECK
 * that either all three link columns are null or all three are set, so a slide either points
 * somewhere or is decoration. Build the href from the pair; never synthesise one from the title.
 *
 * `linkTargetId` is deliberately absent: the id addresses nothing the client can route to, and the
 * slug is what every store URL is keyed on.
 */
export const StoreHeroSlideSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    subtitle: z.string().nullable(),
    accent: AccentTokenSchema,
    imageUrl: z.string().nullable(),
    linkTargetKind: z.enum(MERCHANDISING_ENTITY_KINDS).nullable(),
    linkTargetSlug: z.string().nullable(),
  })
  .strip();

/**
 * A pathway as the HOME page carries it — the index card WITHOUT `slotCount`.
 *
 * A separate schema rather than `StorePathwayCardSchema.partial()`: the home projection selects
 * seven columns and the index read computes an eighth, so parsing home rows against the index shape
 * would fail every time. Two reads, two shapes, and the difference is real.
 */
export const StoreHomePathwayCardSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string().nullable(),
    accent: AccentTokenSchema,
    cardImageUrl: z.string().nullable(),
    isAnchored: z.boolean(),
  })
  .strip();

/**
 * A rail on the home page. NO `id` and NO `page` envelope — the home read returns the first twelve
 * items of each rail and nothing more. Paging one open means navigating to `/store/rails/:slug`,
 * which is the read that carries a cursor.
 */
export const StoreHomeRailSchema = z
  .object({
    slug: z.string(),
    title: z.string(),
    strategy: z.string(),
    items: z.array(MerchandisingItemSchema),
  })
  .strip();

/**
 * `GET /store/home`.
 *
 * `categories` arrives here already, so the home page does NOT need a second
 * `listStoreCategories` call — one read, one answer. `providerShortcuts` is the connector
 * directory's first eight entries and has no counterpart in the legacy shape at all.
 *
 * There is no `b2bLinks` member and there never was one on the backend: the business-tools rail is
 * a static frontend manifest (`src/lib/store/business-tools.ts`), not merchandising data, and
 * pretending it came from the wire is what the legacy getter did.
 */
export const StoreHomeSchema = z
  .object({
    heroSlides: z.array(StoreHeroSlideSchema),
    categories: z.array(StoreCategorySchema),
    pathways: z.array(StoreHomePathwayCardSchema),
    providerShortcuts: z.array(PublicProviderCardSchema),
    rails: z.array(StoreHomeRailSchema),
  })
  .strip();

// --- Filter inputs ----------------------------------------------------------

export interface PathwayIndexFilter {
  readonly limit?: number;
  readonly cursor?: string;
}

export interface PathwaySetFilter {
  readonly limit?: number;
  readonly cursor?: string;
}

export interface RailPageFilter {
  readonly limit?: number;
  readonly cursor?: string;
}

export type StorePathwayCard = z.infer<typeof StorePathwayCardSchema>;
export type StorePathwayIndexPage = z.infer<typeof StorePathwayIndexPageSchema>;
export type StorePathwayCandidate = z.infer<typeof StorePathwayCandidateSchema>;
export type StorePathwaySlot = z.infer<typeof StorePathwaySlotSchema>;
export type StorePathwayCurrencyTotal = z.infer<typeof StorePathwayCurrencyTotalSchema>;
export type StorePathwaySet = z.infer<typeof StorePathwaySetSchema>;
export type MerchandisingItem = z.infer<typeof MerchandisingItemSchema>;
export type StoreRailPage = z.infer<typeof StoreRailPageSchema>;
export type StoreHeroSlide = z.infer<typeof StoreHeroSlideSchema>;
export type StoreHomePathwayCard = z.infer<typeof StoreHomePathwayCardSchema>;
export type StoreHomeRail = z.infer<typeof StoreHomeRailSchema>;
export type StoreHome = z.infer<typeof StoreHomeSchema>;
export type CommercePricingErrorValue = z.infer<typeof CommercePricingErrorSchema>;

// --- Display maps -----------------------------------------------------------

/**
 * A relation kind as a buyer-facing phrase.
 *
 * NONE OF THESE CONFIRM FITMENT. A `seller_declared` relation is the seller's claim that its bolt
 * fits a given bicycle, and only a `moderator_curated` one has been checked — a distinction that
 * rides on `sourceKind`, not here. So `compatible_with` reads "the seller says it fits" wherever the
 * source is not moderated. Fitment is a safety claim in every category where it matters.
 */
export const PRODUCT_RELATION_KIND_LABELS: Record<ProductRelationKind, string> = {
  accessory_of: "Accessory",
  spare_part_of: "Spare part",
  consumable_for: "Consumable",
  compatible_with: "Stated as compatible",
  complements: "Goes with",
  replaces: "Replacement",
};

export const PATHWAY_SLOT_STATE_LABELS: Record<PathwaySlotState, string> = {
  available: "Available",
  substituted: "Substituted",
  unavailable: "Not available",
};

/**
 * Why a line could not be priced, in words a buyer can act on.
 *
 * THE COPY IS CONTEXT-NEUTRAL, and it has to be: this function is shared by the pathway slot list and
 * the cart line. An earlier version said "than this set needs", which is pathway wording, and it
 * shipped onto the cart reading "Only 3 left, fewer than this set needs." on a page with no set on it.
 * Anything referring to the surrounding surface belongs at the call site, not here.
 */
export function pricingErrorLabel(pricingError: CommercePricingErrorValue): string {
  switch (pricingError.type) {
    case "PRODUCT_NOT_FOUND":
      return "This listing is gone.";
    case "PRODUCT_NOT_PURCHASABLE":
      return "This listing is not currently buyable.";
    case "BELOW_MINIMUM_ORDER_QUANTITY":
      return `The seller's minimum order is ${pricingError.minimumOrderQuantity} units, more than the quantity requested.`;
    case "INSUFFICIENT_STOCK":
      return `Only ${pricingError.availableQuantity} left, fewer than the quantity requested.`;
    case "SELLER_ORGANIZATION_MISSING":
      return "This listing has no active seller.";
    case "VARIANT_REQUIRED":
      return "Choose a variant before adding this piece.";
    case "VARIANT_NOT_APPLICABLE":
      return "This listing has no variants to choose.";
    case "VARIANT_NOT_FOUND":
      return "The chosen variant no longer exists.";
    case "VARIANT_NOT_PURCHASABLE":
      return "The chosen variant has been retired.";
    case "SAMPLE_NOT_AVAILABLE":
      return "This seller does not offer a sample of this item.";
    default: {
      const exhaustiveCheck: never = pricingError;
      return exhaustiveCheck;
    }
  }
}

// `RAIL_STRATEGIES` is imported for the doc reference on `StoreRailPageSchema.strategy` and for
// callers that want to recognise a known strategy without failing on an unknown one.
void RAIL_STRATEGIES;
