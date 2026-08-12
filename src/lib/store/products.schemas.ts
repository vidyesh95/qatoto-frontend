// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for the product detail page: `GET /store/products/:productSlug` and the five
// reads that hang off it — companions, reviews, questions, one question's answers, and the
// indicative delivery estimate.
//
// Transcribed from `store-catalog.service.ts` (`StoreProductDetailProjection` :181 and the
// variant/media/tier/highlight/customization projections :105-179), `store-reviews.service.ts`
// (:42-138), `commerce-product-qa.service.ts` (:44-119), `commerce-product-engagement.service.ts`
// (:53-83) and `commerce-product-relations.service.ts` (:61-71).
//
// THE FOUR RULES THIS FILE ENCODES, each one a thing the mock product page got wrong:
//
//  1. `viewer` IS NULLABLE AND NULL IS NOT `false`. Engagement state, review votes and answer votes
//     all carry a per-caller object that is `null` for anyone without an active commerce
//     organization. "You have not saved this" and "we do not know who you are" are different facts,
//     and a toggle rendered as off for a signed-out visitor is a negative the client has no basis
//     for. It is also the honest answer about what the caller MAY do: the vote tables are keyed on
//     the organization, so a signed-in visitor without one cannot vote at all.
//  2. THERE IS NO `commentCount`, AND THERE NEVER WILL BE. Product comments were decided against
//     rather than deferred (backend Appendix A10) — a listing already carries reviews, which need a
//     completed order, Q&A, which needs a seller relationship or a verified purchase, and private
//     inquiries, which need a buyer organization. `questionCount` is the honest figure beside the
//     three engagement counters.
//  3. `sourceKind` ON A COMPANION IS LOAD-BearING. A `seller_declared` relation is the seller's
//     claim that its part fits; only `moderator_curated` has been checked. Fitment is a safety
//     claim in every category where it matters, so the wording must differ.
//  4. `samplePriceInCents: null` IS NOT FREE, and `estimates: []` IS NOT FREE DELIVERY. An unstated
//     price and a zero price are different answers, and the mock rendered the second for both.

import { z } from "zod";

import {
  PRODUCT_CONDITIONS,
  PRODUCT_SAMPLE_POLICIES,
  STORE_STOCK_STATES,
  StoreProductCardSchema,
} from "@/lib/store/organizations.schemas";
import { StoreCategorySchema } from "@/lib/store/catalog.schemas";
import { FreightLanePlanSchema } from "@/lib/store/freight.schemas";
import { DeliveryEstimateBasisSchema, DeliveryEstimateSchema } from "@/lib/store/cart.schemas";
import { PRODUCT_RELATION_KINDS } from "@/lib/store/merchandising.schemas";
import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

// --- Wire enums -------------------------------------------------------------

/**
 * `video` WAS REMOVED by migration `0090`. A product gallery carries photos and 360 spins; moving
 * video is a review-media concern and even there it is a YouTube id, never a first-party asset.
 */
export const PRODUCT_MEDIA_KINDS = ["photo", "spin_360"] as const;
export type ProductMediaKind = (typeof PRODUCT_MEDIA_KINDS)[number];

/**
 * `file_upload`, NOT `upload` — read off `commerce_product_customization_kind` in the backend's
 * `src/db/schema.ts`, which is the authority. A doc paraphrase said "upload"; the pgEnum label is
 * what `z.enum` has to byte-match, and a near-miss here fails the whole product parse.
 */
export const PRODUCT_CUSTOMIZATION_KINDS = ["file_upload", "choice"] as const;
export type ProductCustomizationKind = (typeof PRODUCT_CUSTOMIZATION_KINDS)[number];

/**
 * Which contact control to render, decided by the SERVER.
 *
 * `chat` needs an active buyer organization, because thread participants are derived from
 * organization memberships. `ask_question` is the honest middle rung for a signed-in visitor
 * without one. `sign_in` is the anonymous case. This is a fact about the CALLER, which the caller
 * already knows, so stating it leaks nothing — and the alternative is a client inferring
 * eligibility from an incomplete picture and putting a button in front of a wall.
 */
export const PRODUCT_CONTACT_AFFORDANCES = ["chat", "ask_question", "sign_in"] as const;
export type ProductContactAffordance = (typeof PRODUCT_CONTACT_AFFORDANCES)[number];

/** Whether a companion relation was declared by the seller, checked, or derived from behaviour. */
export const PRODUCT_RELATION_SOURCE_KINDS = [
  "seller_declared",
  "moderator_curated",
  "derived_cooccurrence",
] as const;
export type ProductRelationSourceKind = (typeof PRODUCT_RELATION_SOURCE_KINDS)[number];

export const REVIEW_MEDIA_KINDS = ["photo", "youtube_video"] as const;
export type ReviewMediaKind = (typeof REVIEW_MEDIA_KINDS)[number];

export const PRODUCT_ANSWER_AUTHOR_KINDS = ["seller", "verified_buyer"] as const;
export type ProductAnswerAuthorKind = (typeof PRODUCT_ANSWER_AUTHOR_KINDS)[number];

export const REVIEW_SORTS = ["recent", "helpful", "rating_high", "rating_low"] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

// --- Product detail ---------------------------------------------------------

/** A5. Integers in named units — never a formatted string a client cannot compare. */
export const ProductPackagingSchema = z
  .object({
    packageLengthMm: z.number().int().nullable(),
    packageWidthMm: z.number().int().nullable(),
    packageHeightMm: z.number().int().nullable(),
    packageGrossWeightGrams: z.number().int().nullable(),
    unitsPerPackage: z.number().int().nullable(),
  })
  .strip();

/** A2. `mediaKind` is what makes a 360 spin expressible at all. */
export const ProductMediaSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    mediaKind: z.enum(PRODUCT_MEDIA_KINDS),
    altText: z.string().nullable(),
    widthPx: z.number().int().nullable(),
    heightPx: z.number().int().nullable(),
    position: z.number().int(),
  })
  .strip();

export const ProductPricingTierSchema = z
  .object({
    unitPriceInCents: z.number().int(),
    minimumOrderQuantity: z.number().int(),
    // A27. This band's OWN maximum lead time, or `null` when it declared none and the product's
    // `leadTimeMaxDays` applies. It is the band the buyer's quantity will be priced from at
    // preparation, so the delivery panel and the promise agree.
    leadTimeDays: z.number().int().nullable(),
    position: z.number().int(),
  })
  .strip();

/**
 * A1. One buyable variation, with its own price, stock, MOQ and gallery.
 *
 * A FLAT LIST, NOT AXES (A26, deferred deliberately). "Sea blue × Large" is one opaque variant
 * name rather than two dimensions a buyer picks independently. The picker renders one strip.
 */
export const ProductVariantSchema = z
  .object({
    id: z.string(),
    publicSlug: z.string(),
    name: z.string(),
    priceInCents: z.number().int(),
    minimumOrderQuantity: z.number().int().nullable(),
    stockState: z.enum(STORE_STOCK_STATES),
    position: z.number().int(),
    images: z.array(ProductMediaSchema),
    pricingTiers: z.array(ProductPricingTierSchema),
  })
  .strip();

/** A6. Richer than `keyFeatures`: a title, a body, and an image. */
export const ProductHighlightSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    bodyText: z.string(),
    imageUrl: z.string().nullable(),
    position: z.number().int(),
  })
  .strip();

/**
 * A18/A23. A commercial term the buyer is held to, so the buyer must be able to read it.
 *
 * `checkout/prepare` refuses an order that omits a required slot (`REQUIRED_OPTION_MISSING`), and
 * until this projection existed the buyer was never told the slot was there — enforcement without
 * disclosure, which is a trap rather than a term. Rendering these is what makes such a product
 * checkoutable at all.
 *
 * `state` is deliberately absent from the wire: the read carries ACTIVE options only, and a retired
 * option is not a thing a buyer can choose.
 */
export const ProductCustomizationOptionSchema = z
  .object({
    id: z.string(),
    slotKey: z.string(),
    label: z.string(),
    customizationKind: z.enum(PRODUCT_CUSTOMIZATION_KINDS),
    acceptedMediaTypes: z.array(z.string()),
    choiceValues: z.array(z.string()),
    minimumOrderQuantity: z.number().int(),
    isRequired: z.boolean(),
    position: z.number().int(),
  })
  .strip();

/** A11. What the CALLER has done to this product. `null` for anyone without an organization. */
export const ProductViewerEngagementSchema = z
  .object({ hasSaved: z.boolean(), hasBookmarked: z.boolean() })
  .strip();

/**
 * A11. Integer counts plus per-viewer state. The client formats "3.7k"; the server counts.
 *
 * `uniqueViewerCount` is nullable and NULL IS NOT ZERO — no transaction can maintain a DISTINCT
 * count incrementally, so it is written by the nightly rollup or not at all, and a zero would state
 * a false denominator. There is no `commentCount`; see rule 2 at the top of this file.
 */
export const ProductEngagementSchema = z
  .object({
    savedCount: z.number().int(),
    bookmarkedCount: z.number().int(),
    shareCount: z.number().int(),
    questionCount: z.number().int(),
    answeredQuestionCount: z.number().int(),
    viewCount: z.number().int(),
    uniqueViewerCount: z.number().int().nullable(),
    viewer: ProductViewerEngagementSchema.nullable(),
  })
  .strip();

export const StoreProductDetailSchema = StoreProductCardSchema.extend({
  description: z.string().nullable(),
  keyFeatures: z.array(z.string()),
  modelNumber: z.string().nullable(),
  countryOfOriginCode: z.string().nullable(),
  unitOfMeasure: z.string().nullable(),
  // NULL IS NOT FREE. `samplePolicy` says whether a sample can be had at all; this says what it
  // costs, and an unstated price renders as unstated.
  samplePriceInCents: z.number().int().nullable(),
  packaging: ProductPackagingSchema,
  /** Shared gallery. Variant-scoped media lives on the variant, not here. */
  images: z.array(ProductMediaSchema),
  pricingTiers: z.array(ProductPricingTierSchema),
  variants: z.array(ProductVariantSchema),
  highlights: z.array(ProductHighlightSchema),
  customizationOptions: z.array(ProductCustomizationOptionSchema),
  specifications: z.array(
    z
      .object({
        key: z.string(),
        value: z.string(),
        // A3. Null is ungrouped, which is every pre-Phase-8 row.
        group: z.string().nullable(),
        position: z.number().int(),
      })
      .strip(),
  ),
  categoryTrail: z.array(StoreCategorySchema),
  engagement: ProductEngagementSchema,
  contactAffordance: z.enum(PRODUCT_CONTACT_AFFORDANCES),
}).strip();

// --- Companions -------------------------------------------------------------

export const ProductCompanionSchema = z
  .object({
    relationKind: z.enum(PRODUCT_RELATION_KINDS),
    // Rule 3. Never render a `seller_declared` relation as verified fitment.
    sourceKind: z.enum(PRODUCT_RELATION_SOURCE_KINDS),
    rank: z.number().int(),
    product: StoreProductCardSchema,
  })
  .strip();

export const ProductCompanionGroupSchema = z
  .object({
    relationKind: z.enum(PRODUCT_RELATION_KINDS),
    items: z.array(ProductCompanionSchema),
  })
  .strip();

/** The route nests the array under `groups`. */
export const ProductCompanionsSchema = z
  .object({ groups: z.array(ProductCompanionGroupSchema) })
  .strip();

// --- Delivery estimate ------------------------------------------------------

// THE THREE DELIVERY-ESTIMATE SHAPES LIVE IN `cart.schemas.ts` AND ARE IMPORTED HERE.
//
// This file used to declare its own byte-identical copies — `ProductDeliveryEstimateBasisSchema`,
// `ProductDeliveryEstimateSchema` and an INLINE `derivedFrom` row — beside the ones the checkout
// prepare read already had. Four shapes, two files, one wire contract.
//
// It is the same projection on both routes: `GET /store/products/:slug/delivery-estimate` and the
// `deliveryEstimates` block on `POST /commerce/checkout/prepare` are built by the same service. Two
// copies means two places to update when a field is added, and the one that gets missed fails a
// parse on whichever surface nobody was looking at.
//
// `cart.schemas.ts` OWNS THEM because the checkout copy carried the named
// `DeliveryEstimateSourceOfferingSchema` rather than an inline object, and because nothing in
// `cart.schemas.ts` imports this file — so the dependency runs one way and cannot cycle.
//
// The `Product…` names survive as aliases: they read correctly at the product-page call sites and
// renaming forty references buys nothing.
export const ProductDeliveryEstimateBasisSchema = DeliveryEstimateBasisSchema;
export const ProductDeliveryEstimateSchema = DeliveryEstimateSchema;

/**
 * `estimates: []` MEANS NO PROVIDER COVERS THIS ROUTE. It does not mean free.
 *
 * One entry per currency, never converted — an offering's currency is independent of the order's,
 * and converting without an FX quote would invent a rate.
 */
export const ProductDeliveryEstimatePageSchema = z
  .object({
    estimates: z.array(ProductDeliveryEstimateSchema),
    /**
     * §19's rate-card projection, ADDED ALONGSIDE `estimates` AND NEVER IN PLACE OF IT. The two
     * answer different questions from different data: `estimates` is derived from declared provider
     * COVERAGE and gives a per-currency range; `lanePlan` is derived from purchased RATE CARDS and
     * gives per-leg options a buyer can actually choose between. A16's projection is unchanged, byte
     * for byte, which is why this is a sibling rather than a replacement.
     *
     * NULLABLE, AND THE DOC IS WRONG ABOUT THIS. §19.5 says never-null on a 200; `planFreightJourney`
     * returns `FreightLanePlan | null` when the seller's origin country is unresolved
     * (`commerce-freight-journey.service.ts:416`). Code wins — a non-nullable parse here would fail
     * the whole page for a seller who never published a dispatch country, which is common.
     */
    lanePlan: FreightLanePlanSchema.nullable(),
  })
  .strip();

// --- Reviews ----------------------------------------------------------------

export const ReviewMediaSchema = z
  .object({
    id: z.string(),
    mediaKind: z.enum(REVIEW_MEDIA_KINDS),
    url: z.string().nullable(),
    // There is no first-party video ingest anywhere in this domain. A review video is a YouTube id.
    youtubeVideoId: z.string().nullable(),
    widthPx: z.number().int().nullable(),
    heightPx: z.number().int().nullable(),
    position: z.number().int(),
  })
  .strip();

export const ReviewScoresSchema = z
  .object({
    service: z.number().nullable(),
    shipping: z.number().nullable(),
    quality: z.number().nullable(),
  })
  .strip();

export const ReviewOrganizationSchema = z
  .object({
    organizationId: z.string(),
    slug: z.string(),
    displayName: z.string(),
    logoUrl: z.string().nullable(),
  })
  .strip();

export const ReviewReplySchema = z
  .object({
    body: z.string(),
    respondedAt: IsoDateTimeSchema,
    responder: ReviewOrganizationSchema.nullable(),
  })
  .strip();

export const StoreReviewSchema = z
  .object({
    id: z.string(),
    rating: z.number(),
    body: z.string(),
    createdAt: IsoDateTimeSchema,
    productId: z.string().nullable(),
    // `null` when the reviewing organization is not publicly visible — the card then renders
    // "Verified buyer". A private organization's identity is not disclosed by the act of reviewing.
    reviewer: ReviewOrganizationSchema.extend({ countryCode: z.string() }).strip().nullable(),
    scores: ReviewScoresSchema,
    media: z.array(ReviewMediaSchema),
    helpfulCount: z.number().int(),
    // Rule 1. `null` for a caller with no active organization, NOT `{hasVotedHelpful: false}`.
    viewer: z.object({ hasVotedHelpful: z.boolean() }).strip().nullable(),
    reply: ReviewReplySchema.nullable(),
  })
  .strip();

const ReviewScoreAverageSchema = z
  .object({ average: z.number().nullable(), count: z.number().int() })
  .strip();

/**
 * ALWAYS computed over every visible review in scope — never over the filtered subset.
 *
 * The filter chips display these counts, so a summary that narrowed with the filter would make the
 * chips renumber themselves as you click them and leave no way back to the full picture.
 */
export const StoreReviewSummarySchema = z
  .object({
    averageRating: z.number().nullable(),
    reviewCount: z.number().int(),
    ratingHistogram: z
      .object({
        rating1: z.number().int(),
        rating2: z.number().int(),
        rating3: z.number().int(),
        rating4: z.number().int(),
        rating5: z.number().int(),
      })
      .strip(),
    reviewsWithMediaCount: z.number().int(),
    mediaCount: z.number().int(),
    scoreAverages: z
      .object({
        service: ReviewScoreAverageSchema,
        shipping: ReviewScoreAverageSchema,
        quality: ReviewScoreAverageSchema,
      })
      .strip(),
  })
  .strip();

export const StoreReviewListPageSchema = cursorPageOf(StoreReviewSchema).extend({
  summary: StoreReviewSummarySchema,
});

// --- Questions and answers --------------------------------------------------

export const ProductAnswerSchema = z
  .object({
    id: z.string(),
    questionId: z.string(),
    // DERIVED, never sent on a write. The server decides whether an answer is the seller's.
    authorKind: z.enum(PRODUCT_ANSWER_AUTHOR_KINDS),
    bodyText: z.string(),
    createdAt: IsoDateTimeSchema,
    helpfulCount: z.number().int(),
    // Rule 1, again. Keyed on the ORGANIZATION, because the vote table is.
    viewer: z.object({ hasVotedHelpful: z.boolean() }).strip().nullable(),
    author: ReviewOrganizationSchema.nullable(),
  })
  .strip();

export const ProductQuestionSchema = z
  .object({
    id: z.string(),
    bodyText: z.string(),
    createdAt: IsoDateTimeSchema,
    answerCount: z.number().int(),
    hasSellerAnswer: z.boolean(),
    /** The asker's display handle. Their EMPLOYER is never projected. */
    askedBy: z.object({ name: z.string(), handle: z.string().nullable() }).strip().nullable(),
    /**
     * At most one answer, the seller's first. The full list is its own paginated route, because a
     * cursor over a computed preference rank is how pagination starts skipping rows.
     */
    topAnswer: ProductAnswerSchema.nullable(),
  })
  .strip();

export const ProductQuestionListPageSchema = cursorPageOf(ProductQuestionSchema);
export const ProductAnswerListPageSchema = cursorPageOf(ProductAnswerSchema);

// --- Filter inputs ----------------------------------------------------------
//
// Hand-written interfaces mirroring the backend's `.strict()` query schemas key-for-key. An unknown
// key is a 422 that kills the whole read, not an ignored parameter.

export interface ReviewListFilter {
  readonly sort?: ReviewSort;
  readonly rating?: number;
  /** Serialised as the STRING "true"/"false" by `buildQueryString` — the backend parses an enum. */
  readonly hasMedia?: boolean;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface QuestionListFilter {
  readonly limit?: number;
  readonly cursor?: string;
}

export interface AnswerListFilter {
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * `destinationCountryCode` is REQUIRED and is an explicit parameter rather than anything
 * server-derived, because the browse-country selector is a display preference the backend must not
 * trust. Nothing gated by this value is a compliance, tax or availability decision.
 */
export interface DeliveryEstimateFilter {
  readonly destinationCountryCode: string;
  readonly quantity?: number;
}

export type ProductPackaging = z.infer<typeof ProductPackagingSchema>;
export type ProductMedia = z.infer<typeof ProductMediaSchema>;
export type ProductPricingTier = z.infer<typeof ProductPricingTierSchema>;
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export type ProductHighlight = z.infer<typeof ProductHighlightSchema>;
export type ProductCustomizationOption = z.infer<typeof ProductCustomizationOptionSchema>;
export type ProductEngagement = z.infer<typeof ProductEngagementSchema>;
export type StoreProductDetail = z.infer<typeof StoreProductDetailSchema>;
export type ProductCompanion = z.infer<typeof ProductCompanionSchema>;
export type ProductCompanionGroup = z.infer<typeof ProductCompanionGroupSchema>;
export type ProductCompanions = z.infer<typeof ProductCompanionsSchema>;
export type ProductDeliveryEstimate = z.infer<typeof ProductDeliveryEstimateSchema>;
export type ProductDeliveryEstimatePage = z.infer<typeof ProductDeliveryEstimatePageSchema>;
export type ReviewMedia = z.infer<typeof ReviewMediaSchema>;
export type StoreReview = z.infer<typeof StoreReviewSchema>;
export type StoreReviewSummary = z.infer<typeof StoreReviewSummarySchema>;
export type StoreReviewListPage = z.infer<typeof StoreReviewListPageSchema>;
export type ProductAnswer = z.infer<typeof ProductAnswerSchema>;
export type ProductQuestion = z.infer<typeof ProductQuestionSchema>;
export type ProductQuestionListPage = z.infer<typeof ProductQuestionListPageSchema>;
export type ProductAnswerListPage = z.infer<typeof ProductAnswerListPageSchema>;

// --- Display maps -----------------------------------------------------------

export const PRODUCT_MEDIA_KIND_LABELS: Record<ProductMediaKind, string> = {
  photo: "Photo",
  spin_360: "360° view",
};

export const REVIEW_SORT_LABELS: Record<ReviewSort, string> = {
  recent: "Most recent",
  helpful: "Most helpful",
  rating_high: "Highest rated",
  rating_low: "Lowest rated",
};

export const PRODUCT_ANSWER_AUTHOR_KIND_LABELS: Record<ProductAnswerAuthorKind, string> = {
  seller: "Seller",
  verified_buyer: "Verified buyer",
};

export const PRODUCT_CONDITION_LABELS: Record<(typeof PRODUCT_CONDITIONS)[number], string> = {
  new: "New",
  refurbished: "Refurbished",
  used: "Used",
};

/**
 * What a buyer can expect about samples.
 *
 * `unavailable` is a stated refusal and reads as one. It is NOT the same as `paid` with a null
 * price, which is "samples are available and the seller has not published the price".
 */
export const PRODUCT_SAMPLE_POLICY_LABELS: Record<
  (typeof PRODUCT_SAMPLE_POLICIES)[number],
  string
> = {
  unavailable: "Samples not offered",
  paid: "Paid sample",
  refundable: "Sample cost refunded on order",
};

/**
 * How a companion relates, in buyer-facing words.
 *
 * NONE OF THESE CONFIRM FITMENT — that rides on `sourceKind`, not here. See
 * `companionSourceCaption` below, which is what actually differs between a claim and a check.
 */
export function companionSourceCaption(sourceKind: ProductRelationSourceKind): string {
  switch (sourceKind) {
    case "moderator_curated":
      return "Checked by Qatoto";
    case "seller_declared":
      return "Stated by the seller";
    case "derived_cooccurrence":
      return "Often bought together";
    default: {
      const exhaustiveCheck: never = sourceKind;
      return exhaustiveCheck;
    }
  }
}
