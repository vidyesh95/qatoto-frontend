// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for the public catalog: `GET /store/categories`,
// `GET /store/categories/:slug` and `GET /store/search`.
//
// Every field below is TRANSCRIBED from the backend projection, not designed here:
// `StoreCategoryProjection` / `StoreCategoryFacets` in `store-catalog.service.ts:42,196`
// and `StoreSearchHit` in `store-search.service.ts:107`. `.strip()` throughout, so a
// backend minor release that adds a field is ignored rather than fatal.
//
// TWO THINGS THIS FILE REFUSES TO MODEL, AND THE REASONS MATTER:
//
//  1. THERE IS NO ANCESTOR TRAIL. `getCategoryBySlug` returns `{ category, children }`
//     and nothing above the current node, so a breadcrumb can only be inferred from the
//     visitor's own URL. That inference is fenced in `catalog-breadcrumb.tsx`, which
//     refuses to render a trail whose last segment disagrees with the resolved category —
//     otherwise `/store/categories/nonsense/chairs` prints a hierarchy that does not
//     exist. A real `ancestors[]` is a ~15-line backend addition and is filed as an ask.
//  2. THE FILTER SET IS THE BACKEND'S QUERY SCHEMA, VERBATIM. `SearchQuerySchema`
//     (`store.controller.ts:43`) is `.strict()`, so an extra param is a **422**, not a
//     silently ignored value. STORE_STRUCTURE §7.3 lists eleven filters; six exist. Price
//     range, lead time, condition and verification state are recorded as backend asks and
//     are NOT chips — a control that 422s is worse than a missing one.

import { z } from "zod";

import { StoreProductCardSchema } from "@/lib/store/organizations.schemas";
import { CursorPageSchema, cursorPageOf, PROVIDER_KINDS } from "@/lib/store/shared.schemas";

// --- Categories -------------------------------------------------------------

/**
 * One node of the category tree.
 *
 * `parentCategoryId` is an ID and not a slug, so it cannot be turned into a link without
 * a second read — which is exactly why the ancestor trail has to come from the server.
 * `siblingOrder` is the server's ordering; never re-sort a fetched page client-side.
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

export const StoreCategoryListSchema = z.object({ items: z.array(StoreCategorySchema) }).strip();

/**
 * A facet bucket: the value as the backend spells it, plus how many rows carry it.
 *
 * The count is the honest denominator for the chip label. A chip whose count the search
 * cannot actually filter on is not shipped — see the header note.
 */
export const StoreFacetBucketSchema = z
  .object({
    value: z.string(),
    count: z.number().int(),
  })
  .strip();

/**
 * The four facets `getCategoryFacets` computes.
 *
 * `priceRangesInCents` is a single bucket describing the whole category, not a histogram:
 * min, max and how many listings are priced at all. Both ends are nullable because a
 * category whose every listing is quote-only has no price range — that is an absence, and
 * rendering it as `$0` would advertise free goods.
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
        count: z.number().int(),
      })
      .strip(),
  })
  .strip();

/**
 * `GET /store/categories/:slug`.
 *
 * Note the shape: a paginated PRODUCT GRID with facets, plus the node's children. The
 * mock this replaces rendered three rails of four products per category, which was an
 * artifact of having no backend — a rail is a curated strip and a category is a filtered
 * result set, and the two are not the same control.
 */
/**
 * STORE §20. One question a category asks of every listing under it.
 *
 * ⚠️ `attributeKey` AND `choiceValue` ARE snake_case WIRE IDENTITIES, not labels, and are never
 * re-cased. A stored value points at the key and a saved filter link names it; kebab-casing one
 * would be a 422 from the backend's own CHECK. `label` is the display string — that is what
 * changes when the wording changes.
 */
export const CATEGORY_ATTRIBUTE_VALUE_KINDS = ["enum", "number", "text"] as const;
export type CategoryAttributeValueKind = (typeof CATEGORY_ATTRIBUTE_VALUE_KINDS)[number];

export const CategoryAttributeChoiceSchema = z
  .object({
    choiceValue: z.string(),
    label: z.string(),
    position: z.number().int(),
  })
  .strip();

export const CategoryAttributeSchema = z
  .object({
    attributeKey: z.string(),
    label: z.string(),
    /** Becomes the tab on the buyer's spec sheet. Null is ungrouped. */
    groupLabel: z.string().nullable(),
    valueKind: z.enum(CATEGORY_ATTRIBUTE_VALUE_KINDS),
    /** `number` only — rendered as a suffix, never parsed back out of the value. */
    unitLabel: z.string().nullable(),
    /** `number` only. The stored integer is the real value multiplied by 10^scale. */
    numericScale: z.number().int().nullable(),
    /** Only `enum` and `number` can be true — a free-text filter is worse than none. */
    isFilterable: z.boolean(),
    isRequiredForPublish: z.boolean(),
    position: z.number().int(),
    choices: z.array(CategoryAttributeChoiceSchema),
  })
  .strip();

export const CategoryAttributeListSchema = z
  .object({ attributes: z.array(CategoryAttributeSchema) })
  .strip();

/**
 * STORE §20.6. One attribute's facet.
 *
 * A DISCRIMINATED UNION on `valueKind`, mirroring the backend rather than a looser shape: an enum
 * facet has buckets and no bounds, a number facet has bounds and no buckets, and a renderer must
 * not have to guess which. `text` never appears — a free-text attribute is display-only.
 */
export const AttributeFacetSchema = z.discriminatedUnion("valueKind", [
  z
    .object({
      valueKind: z.literal("enum"),
      attributeKey: z.string(),
      label: z.string(),
      groupLabel: z.string().nullable(),
      buckets: z.array(
        z.object({ value: z.string(), label: z.string(), count: z.number().int() }).strip(),
      ),
    })
    .strip(),
  z
    .object({
      valueKind: z.literal("number"),
      attributeKey: z.string(),
      label: z.string(),
      groupLabel: z.string().nullable(),
      unitLabel: z.string().nullable(),
      numericScale: z.number().int(),
      minScaled: z.number().nullable(),
      maxScaled: z.number().nullable(),
      count: z.number().int(),
    })
    .strip(),
]);

export type CategoryAttribute = z.infer<typeof CategoryAttributeSchema>;
export type CategoryAttributeChoice = z.infer<typeof CategoryAttributeChoiceSchema>;
export type AttributeFacet = z.infer<typeof AttributeFacetSchema>;

/**
 * A scaled integer back to a readable number.
 *
 * The wire carries `4700` with a scale of 2; a person reads `47`. Formatting happens here and
 * nowhere else, the same arrangement integer cents follow.
 */
export function formatScaledAttributeValue(
  numericValueScaled: number,
  numericScale: number,
  unitLabel: string | null,
): string {
  const value = numericValueScaled / 10 ** numericScale;
  const formatted = value.toLocaleString("en-US", { maximumFractionDigits: numericScale });
  return unitLabel === null ? formatted : `${formatted} ${unitLabel}`;
}

export const StoreCategoryDetailSchema = z
  .object({
    category: StoreCategorySchema,
    children: z.array(StoreCategorySchema),
    facets: StoreCategoryFacetsSchema,
    products: z
      .object({
        items: z.array(StoreProductCardSchema),
        page: CursorPageSchema,
      })
      .strip(),
  })
  .strip();

// --- Search -----------------------------------------------------------------

/**
 * What a search document can be. THREE kinds — and the third is why this comment was rewritten.
 *
 * This used to say "two kinds, and `organization` is NOT among them", on the premise that a
 * seller organization was not indexed. That premise stopped being true when the backend added
 * the `organization` document kind: `store-search.service.ts` indexes organizations, the route's
 * query schema accepts the filter, and — the part that bit — the backend applies a `documentKind`
 * predicate ONLY when the caller supplies one. So an unfiltered `/store/search` returns
 * organization hits by default.
 *
 * THAT MISMATCH WAS A DEAD SEARCH PAGE, not a dropped row. `items` is parsed as an array inside
 * `StoreSearchPageSchema`, so ONE unrecognised `documentKind` fails the whole page — and on live
 * data 9 of the first 20 hits were organizations. A missing enum member is not a cosmetic gap
 * when the value is already on the wire.
 */
export const SEARCH_DOCUMENT_KINDS = ["product", "provider_offering", "organization"] as const;

export type SearchDocumentKind = (typeof SEARCH_DOCUMENT_KINDS)[number];

/**
 * `relevance` and `discovery` are SEPARATE sorts, never blended.
 *
 * The backend is explicit that relevance never reads the ranking score and discovery
 * never reads `ts_rank_cd`. A combined sort would be a third, explicitly named option or
 * it is not offered — so this tuple has exactly two members and no default beyond the
 * backend's own.
 */
export const SEARCH_SORTS = ["relevance", "discovery"] as const;

export type SearchSort = (typeof SEARCH_SORTS)[number];

/**
 * One search hit, product or offering, in ONE row shape.
 *
 * The flat shape is the backend's: a search document is denormalized on purpose so one
 * index serves both entities. Consequences the UI must respect rather than paper over —
 * `priceInCents` and `currency` are BOTH nullable and travel together (a quote-only
 * offering has neither, and a price without its currency is unrenderable), `categorySlug`
 * is null on an offering, and `providerKind` is null on a product. Branch on
 * `documentKind`; never test a nullable field to guess which kind you have.
 *
 * `relevanceScore` is diagnostic only. Do not render it, do not sort by it client-side —
 * the server already ordered the page, and re-sorting a keyset page breaks the cursor.
 */
export const StoreSearchHitSchema = z
  .object({
    documentKind: z.enum(SEARCH_DOCUMENT_KINDS),
    entityId: z.string(),
    publicSlug: z.string(),
    title: z.string(),
    summary: z.string().nullable(),
    organizationSlug: z.string(),
    organizationDisplayName: z.string(),
    organizationCountryCode: z.string(),
    categorySlug: z.string().nullable(),
    providerKind: z.enum(PROVIDER_KINDS).nullable(),
    priceInCents: z.number().int().nullable(),
    currency: z.string().nullable(),
    minimumOrderQuantity: z.number().int().nullable(),
    /**
     * The A25 columns the backend projects on every hit and this schema used to drop.
     *
     * They are what lets a row SHOW the thing a facet just filtered on — a buyer who clicked
     * "Made to order · 11" should see which eleven. All nullable: an offering has no stock state
     * and a product has no provider verification, so branch on `documentKind` rather than reading
     * a null as a value.
     */
    stockState: z.string().nullable(),
    samplePolicy: z.string().nullable(),
    condition: z.string().nullable(),
    sellingState: z.string().nullable(),
    providerVerificationState: z.string().nullable(),
    leadTimeMaxDays: z.number().int().nullable(),
    relevanceScore: z.number().nullable(),
    /**
     * When the listing last changed. A REAL content clock, not a refresh stamp — the backend
     * re-projects a search document only after the product, offering or organization behind it
     * mutates, so this is safe to hand a crawler as `lastModified`.
     *
     * `z.iso.datetime()`, not `z.string()`: `sitemap.ts` puts this value straight into the XML,
     * and a malformed date there is worse than an absent one.
     */
    updatedAt: z.iso.datetime(),
  })
  .strip();

/**
 * The NINE dimensions `/store/search` computes, against the FOUR `/store/categories/:slug` does.
 *
 * THE DIFFERENCE IS NOT COSMETIC — it is why these can be chips and the category ones cannot.
 * A facet is only clickable if the route accepts it as a query key, and the category route accepts
 * exactly `limit` and `cursor`. Search accepts all of them, so every bucket below is a filter a
 * buyer can actually apply. (`catalog-facet-summary.tsx` says the same thing from the other side.)
 *
 * A BUCKET ABSENT IS NOT A BUCKET AT ZERO. The backend omits values no result carries rather than
 * padding them, so "not listed" means "nothing here matches", and rendering a 0 chip would offer a
 * click that returns an empty page.
 *
 * Bucket `value` stays a plain string. It is a `pgEnum` label the backend does not narrow — a facet
 * vocabulary is whatever the rows contain — so the UI widens its label maps rather than asserting
 * into an enum, which would be a claim about the network (Pattern 2) and would break the first time
 * a new member is seeded.
 */
export const StoreSearchFacetsSchema = z
  .object({
    sellerCountryCodes: z.array(StoreFacetBucketSchema),
    stockStates: z.array(StoreFacetBucketSchema),
    samplePolicies: z.array(StoreFacetBucketSchema),
    conditions: z.array(StoreFacetBucketSchema),
    sellingStates: z.array(StoreFacetBucketSchema),
    /**
     * §20.6. EMPTY UNLESS A CATEGORY IS IN SCOPE, and empty for a category that defines no
     * filterable attributes. That is the rule the whole design rests on: a category with no
     * attributes renders no new control, so Books & Media costs a buyer nothing.
     */
    attributeFacets: z.array(AttributeFacetSchema),
    verificationStates: z.array(StoreFacetBucketSchema),
    documentKinds: z.array(StoreFacetBucketSchema),
    providerKinds: z.array(StoreFacetBucketSchema),
    /**
     * BUCKETED, not a min/max pair like price — the backend's own note says a scalar cannot be
     * clicked. The values are day thresholds (7, 15, 30, 60, 90) and read as "within N days".
     */
    leadTimeMaxDays: z.array(StoreFacetBucketSchema),
    priceRangesInCents: z
      .object({
        minInCents: z.number().int().nullable(),
        maxInCents: z.number().int().nullable(),
        count: z.number().int(),
      })
      .strip(),
  })
  .strip();
export type StoreSearchFacets = z.infer<typeof StoreSearchFacetsSchema>;

/**
 * `GET /store/search`. `cursorPageOf` gives `items` + `page`; the facets ride alongside them.
 *
 * They were `.strip()`ped until now, which meant the drill-down could not see its own denominator:
 * thirteen filters and no counts to choose between them.
 */
export const StoreSearchPageSchema = cursorPageOf(StoreSearchHitSchema).extend({
  facets: StoreSearchFacetsSchema,
});

// --- Filter inputs ----------------------------------------------------------

/**
 * The search filter, matching `SearchQuerySchema` key for key.
 *
 * camelCase keys because the backend's query keys are camelCase and its enum VALUES are
 * snake_case — two different casings in one URL, on purpose, and neither is a mistake to
 * be corrected. Adding a key here that the backend does not accept turns a chip into a
 * 422.
 */
export interface StoreSearchFilter {
  readonly query?: string;
  readonly category?: string;
  readonly sellerCountryCode?: string;
  readonly providerKind?: string;
  readonly documentKind?: SearchDocumentKind;
  readonly minOrderQuantityMax?: number;
  // --- The seven the backend has always accepted and this interface did not declare.
  // Without them a facet is a number you can read and not a filter you can apply, which is the
  // half of A39 that was missing. Enum VALUES stay snake_case; only the keys are camelCase.
  readonly priceMinInCents?: number;
  readonly priceMaxInCents?: number;
  readonly stockState?: string;
  readonly samplePolicy?: string;
  readonly condition?: string;
  /**
   * §21.2. ABSENT IS NOT NEUTRAL HERE. Omitting it excludes `discontinued` server-side; naming a
   * value narrows to exactly that state, which is how a buyer asks to see retired listings.
   */
  readonly sellingState?: string;
  /**
   * §20.5. `attributeKey:choiceValue`, repeatable, max 6. OR within one key, AND across keys.
   * ⚠️ Sending an attribute filter forces `documentKind=product` server-side — offerings and
   * suppliers have no category attributes.
   */
  readonly attribute?: readonly string[];
  /** `attributeKey:minScaled:maxScaled`, repeatable, max 4. Bounds are ALREADY scaled. */
  readonly attributeRange?: readonly string[];
  readonly verificationState?: string;
  /** A day threshold, not a range — matches the bucketed facet. */
  readonly leadTimeMaxDays?: number;
  readonly sort?: SearchSort;
  readonly limit?: number;
  readonly cursor?: string;
}

/** `GET /store/categories/:slug` takes only a page window — the facets are not yet inputs. */
export interface CategoryDetailFilter {
  readonly limit?: number;
  readonly cursor?: string;
}

/** `GET /store/categories` — root level when `parentCategoryId` is omitted. */
export interface CategoryListFilter {
  readonly parentCategoryId?: string;
  /**
   * How many to return, in the server's `siblingOrder`. The home rail passes 8; the
   * category index passes nothing and gets the level.
   *
   * NOT a client-side slice. Sending this is what lets the admin's arrangement decide
   * which categories reach the rail — trimming a fetched array here would mean the rail
   * and the admin screen could disagree about the order and neither would be wrong.
   */
  readonly limit?: number;
}

export type StoreCategory = z.infer<typeof StoreCategorySchema>;
export type StoreCategoryFacets = z.infer<typeof StoreCategoryFacetsSchema>;
export type StoreFacetBucket = z.infer<typeof StoreFacetBucketSchema>;
export type StoreCategoryDetail = z.infer<typeof StoreCategoryDetailSchema>;
export type StoreSearchHit = z.infer<typeof StoreSearchHitSchema>;
export type StoreSearchPage = z.infer<typeof StoreSearchPageSchema>;

// --- Display maps -----------------------------------------------------------

export const SEARCH_DOCUMENT_KIND_LABELS: Record<SearchDocumentKind, string> = {
  product: "Products",
  provider_offering: "Services",
  // "Suppliers" rather than "Organizations": the row is a seller a buyer might source from, and
  // that is the word the rest of the store uses for them.
  organization: "Suppliers",
};

export const SEARCH_SORT_LABELS: Record<SearchSort, string> = {
  relevance: "Best match",
  discovery: "Trending",
};

/**
 * A cursor page of product cards, as `GET /commerce/saved-products` answers it.
 *
 * The row is the SAME `StoreProductCardSchema` every browse surface uses — one vocabulary for a
 * product card, so a wishlist row and a search row cannot drift apart.
 */
export const StoreProductCardPageSchema = cursorPageOf(StoreProductCardSchema);

export type StoreProductCardPage = z.infer<typeof StoreProductCardPageSchema>;

/**
 * `GET /commerce/bookmarked-products` — the caller's wishlist.
 *
 * THERE IS NO `kind`, AND THAT IS THE CONTRACT, not an omission. The route took one until the
 * backend's migration 0120, and its absence meant BOTH kinds — which is how a heart tap ended up
 * filing a product in the wishlist. A like is a public counter that is never listed back to the
 * person who made it, so `bookmarked` is the only list there is and there is nothing to select.
 *
 * The backend's query schema is `.strict()`, so sending `kind` anyway is a 422 rather than a
 * quietly different list.
 */
export interface ListBookmarkedProductsFilter {
  readonly limit?: number;
  readonly cursor?: string;
}
