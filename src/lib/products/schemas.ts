import { z } from "zod";

import { PRODUCT_SAMPLE_POLICIES } from "@/lib/store/organizations.schemas";

/**
 * Client-side contract for the store product-listing API. Data truth lives in the
 * Express backend (`/products/*`); these Zod schemas parse untrusted response
 * payloads (CLAUDE.md Pattern 2 — never `as`/`any` on the network). `.strip()`
 * keeps the client forward-compatible with backend minor additions.
 */

/**
 * THERE IS NO CATEGORY ENUM HERE ANY MORE.
 *
 * `PRODUCT_CATEGORY_SLUGS` and its two label maps used to live at the top of this file and
 * named the eight roots migration 0098 RETIRED. The taxonomy is now `commerce_category` rows
 * the store admin owns — it grows from a screen, which no enum can do — so a listing carries
 * a `categoryId` read from `GET /store/categories`, not a value hardcoded in a wizard.
 *
 * Keeping the old tuple "for the labels" would have left a second vocabulary that silently
 * disagreed with the database, which is exactly the bug this change exists to close.
 */

export const PRODUCT_CONDITION_SLUGS = ["new", "refurbished", "used"] as const;
export const PRODUCT_STATUSES = ["draft", "active"] as const;

export const CONDITION_LABELS = ["New", "Refurbished", "Used"] as const;

export const CONDITION_LABEL_TO_SLUG: Record<string, (typeof PRODUCT_CONDITION_SLUGS)[number]> = {
  New: "new",
  Refurbished: "refurbished",
  Used: "used",
};

export const SLUG_TO_CONDITION_LABEL: Record<string, string> = {
  new: "New",
  refurbished: "Refurbished",
  used: "Used",
};

// --- Response schemas -------------------------------------------------------

export const ProductImageSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    position: z.number(),
  })
  .strip();

export const ProductPricingTierSchema = z
  .object({
    id: z.string(),
    unitPriceInCents: z.number(),
    minimumOrderQuantity: z.number(),
    position: z.number(),
  })
  .strip();

/**
 * One structured key/value fact about a listing — "Material: Solid oak", "Voltage: 5 V".
 *
 * ⚠️ `group` IS NULLABLE HERE AND OPTIONAL ON THE WAY IN, and the asymmetry is not an oversight.
 * The backend's read view types it `string | null` (`products.service.ts:114-121`) because NULL is
 * how the column spells "ungrouped". Its WRITE schema types it
 * `z.string().trim().min(1).max(80).optional()` inside a `.strict()` object, so sending
 * `{ group: null }` back is a **422**, not an ignored field — see `CreateProductInput` below,
 * which is where the key has to be omitted rather than nulled.
 *
 * `group` is what the buyer's spec sheet turns into a tab. It is free text on purpose: the useful
 * groupings for a chair ("Dimensions", "Materials") and a transformer ("Electrical", "Thermal")
 * share nothing. A canonical per-category vocabulary is a separate build — see
 * `docs/CATEGORY_ATTRIBUTES_STRUCTURE.md`.
 */
export const ProductSpecificationSchema = z
  .object({
    key: z.string(),
    value: z.string(),
    group: z.string().nullable(),
    position: z.number(),
  })
  .strip();

/**
 * WHAT A LISTING STILL NEEDS BEFORE IT CAN BE PUBLISHED.
 *
 * The backend computes this with `projectListingCompleteness`, and the SAME projection feeds both
 * `PublicProduct.listingCompleteness` and the 422 behind the publish button
 * (`products.service.ts:261`, exposed at `:408`). One function, two consumers — so the checklist
 * the seller reads on the form cannot disagree with the refusal the button gets. Recomputing any
 * part of it here would reintroduce exactly the disagreement that design closed.
 */
export const LISTING_REQUIREMENT_KEYS = [
  "title",
  "price",
  "images",
  "samplePrice",
  "shippingFacts",
] as const;

/**
 * `not_applicable` IS A REAL STATE AND NOT A SYNONYM FOR SATISFIED. `samplePrice` is
 * `not_applicable` whenever `samplePolicy` is `unavailable` — which is the column default — so most
 * listings carry four applicable requirements, not five. Rendering it as satisfied would tell a
 * seller they answered a question nobody asked; rendering it as missing would block publish on one.
 */
export const LISTING_REQUIREMENT_STATES = ["satisfied", "missing", "not_applicable"] as const;

export const ListingRequirementSchema = z
  .object({
    key: z.enum(LISTING_REQUIREMENT_KEYS),
    state: z.enum(LISTING_REQUIREMENT_STATES),
    /**
     * The exact field tokens to fill in — the same vocabulary `INCOMPLETE_FOR_PUBLISH.missing`
     * carries. Empty unless `state` is `missing`. Not typed as an enum: it is a wire vocabulary the
     * backend may extend, and a narrow enum here would fail the parse on an addition rather than
     * fall through to the raw token.
     */
    missingFields: z.array(z.string()),
  })
  .strip();

export const ListingCompletenessSchema = z
  .object({
    requirements: z.array(ListingRequirementSchema),
    requirementCount: z.number().int(),
    /** Requirements that apply to THIS listing — the denominator of `isComplete`. */
    applicableRequirementCount: z.number().int(),
    satisfiedRequirementCount: z.number().int(),
    isComplete: z.boolean(),
  })
  .strip();

export const PublicProductSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    brand: z.string().nullable(),
    /**
     * The LEGACY enum value, and null for every listing created since 0098. Kept on the
     * wire so old clients still parse; `categoryId` is the authoritative field and the only
     * one this app reads.
     */
    category: z.string().nullable(),
    categoryId: z.string(),
    /**
     * Set while this listing sits in Misc awaiting a verdict on a requested category. A
     * non-null value is why the studio says "waiting for review" instead of presenting Misc
     * as a category the seller chose.
     */
    pendingCategoryRequestId: z.string().nullable(),
    condition: z.enum(PRODUCT_CONDITION_SLUGS),
    description: z.string().nullable(),
    priceInCents: z.number(),
    compareAtPriceInCents: z.number().nullable(),
    currency: z.string(),
    stockQuantity: z.number(),
    sku: z.string().nullable(),
    keyFeatures: z.array(z.string()),
    status: z.enum(PRODUCT_STATUSES),
    publishedAt: z.string().nullable(),
    images: z.array(ProductImageSchema),
    pricingTiers: z.array(ProductPricingTierSchema),
    /**
     * The structured spec sheet. Ordered by `position`, and EMPTY FOR EVERY LISTING CREATED
     * BEFORE THIS FIELD REACHED THE FORM — the backend has accepted `specifications[]` on create
     * and PATCH since the table shipped, and no client had ever sent one, so the buyer's spec
     * sheet and comparison table were rendering an array nothing wrote to.
     */
    specifications: z.array(ProductSpecificationSchema),
    /**
     * A17. THE THREE SAMPLE FACTS, which answer three different questions and must not be
     * collapsed. `samplePolicy` says whether a sample can be had at all and whether its price
     * comes back against a later bulk order; `samplePriceInCents` says what it costs, and NULL
     * IS NOT FREE — it is unstated; `maximumSampleQuantity` says how many one line may hold, and
     * is never null because the column defaults to 1.
     *
     * The cap is what keeps the sample bypass honest: a sample skips the tier ladder and the
     * minimum order quantity, so without a ceiling a large "sample" line is a bulk order at
     * sample pricing, and on a refundable listing it mints a credit the size of the whole line.
     */
    samplePolicy: z.enum(PRODUCT_SAMPLE_POLICIES),
    samplePriceInCents: z.number().int().nullable(),
    maximumSampleQuantity: z.number().int(),
    /**
     * THE FIVE SHIPPING FACTS (§19.9a). Nullable, and there is no migration, because nobody can
     * invent a box size for a listing that already exists — a pre-Phase-20 listing keeps selling
     * and is refused on its next edit instead.
     *
     * NAMED UNITS, NEVER A FORMATTED STRING. Freight rates on chargeable weight, which is
     * `max(actual, volumetric)`, and volumetric needs L x W x H MULTIPLIED BY the package count.
     * That is why all five are required and not just the three dimensions: without
     * `unitsPerPackage` the rater skips the line entirely, and without `packageGrossWeightGrams`
     * it contributes zero weight. A gate on three would look done and would not be.
     */
    packageLengthMm: z.number().int().nullable(),
    packageWidthMm: z.number().int().nullable(),
    packageHeightMm: z.number().int().nullable(),
    packageGrossWeightGrams: z.number().int().nullable(),
    unitsPerPackage: z.number().int().nullable(),
    listingCompleteness: ListingCompletenessSchema,
  })
  .strip();

export const ProductListRowSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    sku: z.string().nullable(),
    priceInCents: z.number(),
    stockQuantity: z.number(),
    status: z.enum(PRODUCT_STATUSES),
  })
  .strip();

export const PaginationMetaSchema = z
  .object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  })
  .strip();

export type ProductImage = z.infer<typeof ProductImageSchema>;
export type ProductSpecification = z.infer<typeof ProductSpecificationSchema>;
export type PublicProduct = z.infer<typeof PublicProductSchema>;
export type ProductListRow = z.infer<typeof ProductListRowSchema>;
export type ListingRequirementKey = (typeof LISTING_REQUIREMENT_KEYS)[number];
export type ListingRequirement = z.infer<typeof ListingRequirementSchema>;
export type ListingCompleteness = z.infer<typeof ListingCompletenessSchema>;

// --- Request DTOs -----------------------------------------------------------

export interface CreateProductInput {
  title: string;
  brand?: string;
  /**
   * The category this listing belongs to. Mutually exclusive with `categoryRequestId` —
   * the backend's create schema refuses both together rather than choosing which one the
   * seller meant, because the two answers differ: one publishes into a category, the other
   * parks the listing in Misc pending a verdict.
   */
  categoryId?: string;
  /**
   * The seller's pending request for a category that does not exist yet. Create only; a
   * PATCH names a real category, and the backend's update schema omits this key entirely.
   */
  categoryRequestId?: string;
  condition: (typeof PRODUCT_CONDITION_SLUGS)[number];
  description?: string;
  keyFeatures: string[];
  priceInCents: number;
  compareAtPriceInCents?: number;
  stockQuantity: number;
  sku?: string;
  pricingTiers: { unitPriceInCents: number; minimumOrderQuantity: number }[];
  /**
   * The spec sheet, as a REPLACE-SET. Sending it on a PATCH replaces every row the listing has;
   * sending `[]` clears them. Omitting it on create is fine — the backend defaults to `[]`.
   *
   * ⚠️ `group` IS OPTIONAL, NOT NULLABLE, AND THIS IS THE ONE THING TO GET RIGHT. The read view
   * returns `string | null` (see `ProductSpecificationSchema`), but the write schema is
   * `.optional()` inside a `.strict()` object — so an ungrouped row must OMIT the key. Round-
   * tripping a hydrated `null` straight back is a **422 that fails the whole save**, not a field
   * the server ignores.
   *
   * Keys are unique per listing, CASE-INSENSITIVELY: the backend's `.refine()` lowercases with
   * `toLocaleLowerCase("en-US")` before comparing, so `Material` and `material` collide. A form
   * collecting these must apply the same rule or it will send a body it could have refused.
   */
  specifications: { key: string; value: string; group?: string }[];
  /**
   * A17. Both-or-neither in practice, and the backend enforces it: `paid` and `refundable` are
   * refused without a `samplePriceInCents`, and `unavailable` is refused WITH one. Sending the
   * price alongside `unavailable` is the mistake that reads as harmless and 422s.
   */
  samplePolicy?: (typeof PRODUCT_SAMPLE_POLICIES)[number];
  samplePriceInCents?: number;
  /** Omitted means 1, which is the ordinary case — never "no ceiling". Capped at 20 server-side. */
  maximumSampleQuantity?: number;
  /**
   * OPTIONAL ON THE WAY IN, REQUIRED TO PUBLISH. Drafting stays free — the backend's create and
   * update schemas mark all five `.optional()` and the gate runs at publish, so a seller can save
   * a half-written listing without measuring a box first.
   *
   * The three dimensions are ALL-OR-NOTHING: the backend refuses a partial set with a 422 on
   * `packageLengthMm` ("Package length, width and height must be provided together"), because a
   * half-measured package produces a volume nobody can defend.
   */
  packageLengthMm?: number;
  packageWidthMm?: number;
  packageHeightMm?: number;
  packageGrossWeightGrams?: number;
  unitsPerPackage?: number;
}

/** The backend's own bounds (`products.controller.ts:84-88`), mirrored so the form can refuse early. */
export const PACKAGE_DIMENSION_MM_MAX = 50_000;
export const PACKAGE_GROSS_WEIGHT_GRAMS_MAX = 50_000_000;
export const UNITS_PER_PACKAGE_MAX = 1_000_000;

/** The spec-sheet bounds, from the same schema, mirrored for the same reason. */
export const PRODUCT_SPECIFICATION_MAX_COUNT = 40;
export const PRODUCT_SPECIFICATION_KEY_MAX_LENGTH = 80;
export const PRODUCT_SPECIFICATION_VALUE_MAX_LENGTH = 500;
export const PRODUCT_SPECIFICATION_GROUP_MAX_LENGTH = 80;

export type UpdateProductInput = Partial<CreateProductInput>;

// --- Money -----------------------------------------------------------------

/**
 * Convert a dollar input string ("129.99") to integer cents. Returns `null` for
 * blank/invalid input so callers can omit optional prices. The backend is the sole
 * money authority — this only shapes the request (no floats cross the wire).
 */
export function dollarsToCents(dollarString: string): number | null {
  const trimmed = dollarString.trim();
  if (trimmed.length === 0) return null;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

/** Derive the display price label from stored cents ("$129.99"). Never stored. */
export function centsToPriceLabel(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** cents → dollar input string ("12999" → "129.99"), for edit-mode prefill. */
export function centsToDollarString(cents: number): string {
  return (cents / 100).toFixed(2);
}
