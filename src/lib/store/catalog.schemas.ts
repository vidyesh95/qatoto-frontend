import { z } from "zod";
import {
  CursorPageSchema,
  StoreAccentTokenSchema,
  StoreFulfillmentMetricsSchema,
  StoreReviewMetricsSchema,
  StoreSellerSchema,
} from "@/lib/store/shared.schemas";
import {
  COMMERCE_PROVIDER_KINDS,
  PROVIDER_VERIFICATION_STATES,
  SAMPLE_POLICIES,
  SERVICE_PRICING_MODELS,
  STOCK_STATES,
  STORE_MERCHANDISING_ENTITY_KINDS,
  STORE_RAIL_STRATEGIES,
  STORE_SEARCH_DOCUMENT_KINDS,
  STORE_SEARCH_SORTS,
} from "@/lib/store/labels";

/**
 * Buyer-facing `/store/*` response schemas.
 *
 * THE AUTHORITY IS THE BACKEND SERVICE, NOT THIS DOC-DERIVED FILE'S PREDECESSOR.
 * `src/controllers/store.controller.ts` sends `data: result.value` with no remapping layer,
 * so the projection interfaces in `store-catalog.service.ts`,
 * `store-merchandising.service.ts`, `store-search.service.ts` and
 * `commerce-providers.service.ts` ARE the wire. Every schema below mirrors one of them
 * field for field. See STORE_STRUCTURE §5.4 for the ledger of what the earlier guesses got
 * wrong and why every store page rendered its error branch.
 *
 * Parsed from `unknown` with `.strip()` — never type-assert a network payload, and never
 * add a field the backend does not send just because the UI would like it.
 */

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * `StoreCategoryProjection`. One shape for roots, children, and trail nodes.
 *
 * There is no `childCount` and no `accent` — a category card cannot show either.
 */
export const StoreCategorySchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    parentCategoryId: z.string().nullable(),
    siblingOrder: z.number().int(),
    imageUrl: z.string().nullable(),
  })
  .strip();
export type StoreCategory = z.infer<typeof StoreCategorySchema>;

/** `GET /store/categories` answers an envelope, not a bare array. */
export const StoreCategoryListSchema = z
  .object({
    items: z.array(StoreCategorySchema),
  })
  .strip();
export type StoreCategoryList = z.infer<typeof StoreCategoryListSchema>;

/** A single facet bucket. The backend counts; the client only labels. */
export const StoreFacetBucketSchema = z
  .object({
    value: z.string(),
    count: z.number().int().nonnegative(),
  })
  .strip();
export type StoreFacetBucket = z.infer<typeof StoreFacetBucketSchema>;

/**
 * `StoreCategoryFacets` — an OBJECT of named groups, not a generic `[{key,label,values}]`
 * array. Only these three groups are filterable buckets; `priceRangesInCents` is a summary
 * of the visible range and is NOT a filter, because `/store/search` accepts no price param.
 */
export const StoreCategoryFacetsSchema = z
  .object({
    sellerCountryCodes: z.array(StoreFacetBucketSchema),
    stockStates: z.array(StoreFacetBucketSchema),
    samplePolicies: z.array(StoreFacetBucketSchema),
    priceRangesInCents: z
      .object({
        minInCents: z.number().int().nullable(),
        maxInCents: z.number().int().nullable(),
        count: z.number().int().nonnegative(),
      })
      .strip(),
  })
  .strip();
export type StoreCategoryFacets = z.infer<typeof StoreCategoryFacetsSchema>;

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * `StoreProductCardProjection`.
 *
 * `mainImageUrl` (not `imageUrl`), `priceInCents` (not `minimumUnitPriceInCents`), and
 * `minimumOrderQuantity` is NULLABLE — a product with no declared MOQ is legal, and
 * requiring a positive integer here failed every list on the surface.
 */
export const StoreProductCardSchema = z
  .object({
    id: z.string(),
    publicSlug: z.string(),
    title: z.string(),
    brand: z.string().nullable(),
    currency: z.string(),
    priceInCents: z.number().int().nonnegative(),
    compareAtPriceInCents: z.number().int().nonnegative().nullable(),
    minimumOrderQuantity: z.number().int().nullable(),
    stockState: z.enum(STOCK_STATES),
    samplePolicy: z.enum(SAMPLE_POLICIES),
    leadTimeMinDays: z.number().int().nullable(),
    leadTimeMaxDays: z.number().int().nullable(),
    mainImageUrl: z.string().nullable(),
    seller: StoreSellerSchema,
    category: z.object({ id: z.string(), slug: z.string(), name: z.string() }).strip(),
    reviewMetrics: StoreReviewMetricsSchema,
    fulfillmentMetrics: StoreFulfillmentMetricsSchema,
  })
  .strip();
export type StoreProductCard = z.infer<typeof StoreProductCardSchema>;

export const StoreProductImageSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    position: z.number().int().nonnegative(),
  })
  .strip();
export type StoreProductImage = z.infer<typeof StoreProductImageSchema>;

/** A quantity price break. There is NO `id` on the wire — key rows by `position`. */
export const StorePricingTierSchema = z
  .object({
    unitPriceInCents: z.number().int().nonnegative(),
    minimumOrderQuantity: z.number().int().positive(),
    position: z.number().int().nonnegative(),
  })
  .strip();
export type StorePricingTier = z.infer<typeof StorePricingTierSchema>;

export const StoreProductSpecificationSchema = z
  .object({
    key: z.string(),
    value: z.string(),
    position: z.number().int().nonnegative(),
  })
  .strip();
export type StoreProductSpecification = z.infer<typeof StoreProductSpecificationSchema>;

/**
 * `StoreProductDetailProjection` — the card plus detail-only fields.
 *
 * NOTE there is no `condition` here. The seller `/products` surface stores one, but the
 * public projection does not carry it (STORE_STRUCTURE §5.6 item 6), so the PDP cannot
 * show it. Review counts live under `reviewMetrics`, not as flat `ratingCount` fields.
 */
export const PublicStoreProductSchema = StoreProductCardSchema.extend({
  description: z.string().nullable(),
  keyFeatures: z.array(z.string()),
  modelNumber: z.string().nullable(),
  countryOfOriginCode: z.string().nullable(),
  unitOfMeasure: z.string().nullable(),
  samplePriceInCents: z.number().int().nonnegative().nullable(),
  images: z.array(StoreProductImageSchema),
  pricingTiers: z.array(StorePricingTierSchema),
  specifications: z.array(StoreProductSpecificationSchema),
  categoryTrail: z.array(StoreCategorySchema),
}).strip();
export type PublicStoreProduct = z.infer<typeof PublicStoreProductSchema>;

/** The keyset page of product cards used by category, storefront, and rail reads. */
export const StoreProductPageSchema = z
  .object({
    items: z.array(StoreProductCardSchema),
    page: CursorPageSchema,
  })
  .strip();
export type StoreProductPage = z.infer<typeof StoreProductPageSchema>;

/** `GET /store/categories/:slug`. No canonical `trail` and no `isLeaf` — see §5.6 item 2. */
export const StoreCategoryDetailSchema = z
  .object({
    category: StoreCategorySchema,
    children: z.array(StoreCategorySchema),
    facets: StoreCategoryFacetsSchema,
    products: StoreProductPageSchema,
  })
  .strip();
export type StoreCategoryDetail = z.infer<typeof StoreCategoryDetailSchema>;

/** `GET /store/organizations/:organizationSlug`. FLAT — the organization is not nested. */
export const OrganizationStorefrontSchema = z
  .object({
    organizationId: z.string(),
    slug: z.string(),
    displayName: z.string(),
    summary: z.string().nullable(),
    countryCode: z.string(),
    logoUrl: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    products: StoreProductPageSchema,
  })
  .strip();
export type OrganizationStorefront = z.infer<typeof OrganizationStorefrontSchema>;

// ---------------------------------------------------------------------------
// Providers and service offerings
// ---------------------------------------------------------------------------

/**
 * `PublicProviderCard`. `verificationState` is the PROFILE's state, not per-connector-kind
 * approval — render it with `providerVerificationStateLabel`, never as a bare check mark.
 */
export const PublicProviderCardSchema = z
  .object({
    organizationId: z.string(),
    slug: z.string(),
    displayName: z.string(),
    countryCode: z.string(),
    logoUrl: z.string().nullable(),
    publicSummary: z.string().nullable(),
    verificationState: z.enum(PROVIDER_VERIFICATION_STATES),
    acceptingRequests: z.boolean(),
    serviceRegionSummary: z.string().nullable(),
    averageResponseTimeHours: z.number().nullable(),
    reviewMetrics: StoreReviewMetricsSchema,
    fulfillmentMetrics: StoreFulfillmentMetricsSchema,
  })
  .strip();
export type PublicProviderCard = z.infer<typeof PublicProviderCardSchema>;

export const PublicOfferingCardSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string().nullable(),
    providerKind: z.enum(COMMERCE_PROVIDER_KINDS),
    pricingModel: z.enum(SERVICE_PRICING_MODELS),
    indicativePriceMinInCents: z.number().int().nullable(),
    indicativePriceMaxInCents: z.number().int().nullable(),
    currency: z.string(),
    minimumLeadTimeDays: z.number().int().nullable(),
    maximumLeadTimeDays: z.number().int().nullable(),
  })
  .strip();
export type PublicOfferingCard = z.infer<typeof PublicOfferingCardSchema>;

// ---------------------------------------------------------------------------
// Merchandising
// ---------------------------------------------------------------------------

/**
 * `MerchandisingItemProjection` — what fills every rail and pathway.
 *
 * A rail is NOT a list of products. It is a discriminated list, and a placement that is a
 * `category` or `organization` is dropped server-side rather than projected, so only these
 * two variants reach the client. Render with an exhaustive `switch`.
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
]);
export type MerchandisingItem = z.infer<typeof MerchandisingItemSchema>;

/**
 * A hero slide.
 *
 * `imageUrl` is nullable and there is NO `href` — the destination is
 * `linkTargetKind` + `linkTargetSlug`, both nullable, which a slide may legitimately omit
 * to be decorative. `heroSlideHref` in `links.ts` resolves it.
 */
export const HeroSlideSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    subtitle: z.string().nullable(),
    accent: StoreAccentTokenSchema,
    imageUrl: z.string().nullable(),
    linkTargetKind: z.enum(STORE_MERCHANDISING_ENTITY_KINDS).nullable(),
    linkTargetSlug: z.string().nullable(),
  })
  .strip();
export type HeroSlide = z.infer<typeof HeroSlideSchema>;

/**
 * A curated pathway.
 *
 * No `imageUrl`, no `overlayLabel`, no inline `items` — the items only exist on
 * `GET /store/pathways/:pathwaySlug`, and a pathway card is a text tile.
 */
export const StorePathwaySchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string().nullable(),
    accent: StoreAccentTokenSchema,
  })
  .strip();
export type StorePathway = z.infer<typeof StorePathwaySchema>;

/** A home rail. Unpaginated — deep paging lives on `GET /store/rails/:railSlug`. */
export const StoreHomeRailSchema = z
  .object({
    slug: z.string(),
    title: z.string(),
    strategy: z.enum(STORE_RAIL_STRATEGIES),
    items: z.array(MerchandisingItemSchema),
  })
  .strip();
export type StoreHomeRail = z.infer<typeof StoreHomeRailSchema>;

/** `GET /store/home`. Keys are `heroSlides` and `categories` — not `hero` and `rootCategories`. */
export const StoreHomeSchema = z
  .object({
    heroSlides: z.array(HeroSlideSchema),
    categories: z.array(StoreCategorySchema),
    pathways: z.array(StorePathwaySchema),
    providerShortcuts: z.array(PublicProviderCardSchema),
    rails: z.array(StoreHomeRailSchema),
  })
  .strip();
export type StoreHome = z.infer<typeof StoreHomeSchema>;

/** `GET /store/pathways` — unpaginated. */
export const StorePathwayListSchema = z
  .object({
    items: z.array(StorePathwaySchema),
  })
  .strip();
export type StorePathwayList = z.infer<typeof StorePathwayListSchema>;

/** `GET /store/pathways/:pathwaySlug` — also unpaginated; every item is returned. */
export const StorePathwayDetailSchema = z
  .object({
    pathway: StorePathwaySchema,
    items: z.array(MerchandisingItemSchema),
  })
  .strip();
export type StorePathwayDetail = z.infer<typeof StorePathwayDetailSchema>;

/*
 * There is deliberately no `StoreRailPageSchema` here.
 *
 * `GET /store/rails/:railSlug` is shipped backend-side — it answers
 * `{ rail: { slug, title, strategy }, items, page }`, with `items` and `page` as SIBLINGS of
 * `rail` rather than nested inside it — but no page in this app reads it. A schema nothing
 * parses with is unverified code: it is never exercised, so it drifts silently. Add it back
 * in the same commit that adds the route.
 */

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * `StoreSearchHit` — a flat search document, NOT a product card.
 *
 * Search returns products and provider offerings in one ranked list; `documentKind` decides
 * which route a hit links to. `providerKind` is typed `string | null` server-side rather
 * than the enum, so it is parsed as a string here and labelled defensively.
 *
 * `priceInCents` and `currency` are independently nullable, which means a price without a
 * currency is representable (§5.6 item 7). Render a price only when BOTH are present.
 */
export const StoreSearchHitSchema = z
  .object({
    documentKind: z.enum(STORE_SEARCH_DOCUMENT_KINDS),
    entityId: z.string(),
    publicSlug: z.string(),
    title: z.string(),
    summary: z.string().nullable(),
    organizationSlug: z.string(),
    organizationDisplayName: z.string(),
    organizationCountryCode: z.string(),
    categorySlug: z.string().nullable(),
    providerKind: z.string().nullable(),
    priceInCents: z.number().int().nullable(),
    currency: z.string().nullable(),
    minimumOrderQuantity: z.number().int().nullable(),
    relevanceScore: z.number().nullable(),
  })
  .strip();
export type StoreSearchHit = z.infer<typeof StoreSearchHitSchema>;

/** `GET /store/search`. No facets and no applied-filter count are returned (§5.6 item 3). */
export const StoreSearchResultSchema = z
  .object({
    items: z.array(StoreSearchHitSchema),
    page: CursorPageSchema,
  })
  .strip();
export type StoreSearchResult = z.infer<typeof StoreSearchResultSchema>;

// ---------------------------------------------------------------------------
// Request filters
// ---------------------------------------------------------------------------

/**
 * Exactly the query keys `/store/search` accepts.
 *
 * Its schema is `.strict()`, so an extra key is a 422 rather than an ignored field. There
 * is deliberately no price range, no condition, and no lead-time filter: the backend has
 * none, and sending them broke the page.
 */
export const StoreSearchFilterSchema = z
  .object({
    query: z.string().optional(),
    category: z.string().optional(),
    sellerCountryCode: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
    providerKind: z.enum(COMMERCE_PROVIDER_KINDS).optional(),
    documentKind: z.enum(STORE_SEARCH_DOCUMENT_KINDS).optional(),
    minOrderQuantityMax: z.number().int().nonnegative().max(1_000_000).optional(),
    sort: z.enum(STORE_SEARCH_SORTS).optional(),
    cursor: z.string().optional(),
    limit: z.number().int().positive().max(48).optional(),
  })
  .strip();
export type StoreSearchFilter = z.infer<typeof StoreSearchFilterSchema>;

/** The shared `CursorPageQuerySchema` on category, storefront, and rail reads. */
export interface StoreCursorPageFilter {
  readonly limit?: number | undefined;
  readonly cursor?: string | undefined;
}
