import { z } from "zod";

import {
  PRODUCT_CUSTOMIZATION_KINDS,
  PRODUCT_DOCUMENT_KINDS,
  type ProductCustomizationKind,
} from "@/lib/store/products.schemas";

import { PRODUCT_SAMPLE_POLICIES, PRODUCT_SELLING_STATES } from "@/lib/store/organizations.schemas";
import { CATEGORY_ATTRIBUTE_VALUE_KINDS } from "@/lib/store/catalog.schemas";

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
/**
 * §20. What a moderator decided about this listing. `pending` is the default every listing starts
 * at, so it is NOT news; `rejected` and `suspended` are.
 */
export const PRODUCT_MODERATION_STATES = ["pending", "approved", "rejected", "suspended"] as const;
export type ProductModerationState = (typeof PRODUCT_MODERATION_STATES)[number];

/** Copy for the two states a seller needs to act on. `pending`/`approved` render nothing. */
export const PRODUCT_MODERATION_NOTICES: Record<ProductModerationState, string | null> = {
  pending: null,
  approved: null,
  rejected: "A moderator rejected this listing. It is not visible to buyers.",
  suspended: "A moderator suspended this listing. It is not visible to buyers.",
};

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

/**
 * One band of the volume ladder, as the SELLER sees it.
 *
 * ⚠️ `leadTimeDays` AND `variantId` WERE MISSING, AND `.strip()` MADE BOTH SILENT — with real
 * consequences, because this form does not just read the ladder, it REPLACES it on every save.
 *
 * `leadTimeDays` (A27) is this band's own maximum lead time; `null` means "the product's
 * `leadTimeMaxDays` applies", which is what every pre-Phase-15 row means. Because the form could
 * not see it, `collectListingInput` rebuilt every tier without it and the backend re-inserted
 * `null` — so **every listing edit silently destroyed whatever bands the seller had declared**.
 * Reproduced against the live database before this was fixed: two bands carrying 14 and 28 days
 * came back as `null, null` after a save that changed nothing.
 *
 * `variantId` is `null` on the product's own ladder and set on a variant's. The seller read is
 * STRICT — it does NOT inherit — so a variant with no ladder of its own reads `[]` here, while the
 * BUYER read substitutes the product's (`store-catalog.service.ts:1401`). Do not compare the two.
 */
export const ProductPricingTierSchema = z
  .object({
    id: z.string(),
    variantId: z.string().nullable(),
    unitPriceInCents: z.number(),
    minimumOrderQuantity: z.number(),
    leadTimeDays: z.number().int().nullable(),
    position: z.number(),
  })
  .strip();

/**
 * A1. One buyable variation of this listing, as the SELLER sees it — "Sea blue", "480 V / 60 Hz".
 *
 * ⚠️ THIS WAS MISSING ENTIRELY UNTIL NOW, AND `.strip()` MADE THAT SILENT. The backend has returned
 * `variants[]` on the owner read since Phase 8 (`products.service.ts:474`), and because this schema
 * did not name the key, every seller read DISCARDED it — which is why the wizard could not hydrate
 * variants and therefore never offered to author them. Same defect as `highlights` below, one field
 * over.
 *
 * ⚠️ `state` IS PART OF THE SELLER'S VIEW AND NOT THE BUYER'S. A retired variant is still returned
 * here, deliberately: order lines bought under it still name it, and it is retired rather than
 * deleted because `commerce_order_product_line.variant_id` is `restrict`. The buyer's projection
 * filters to `active`; a seller form must show what exists and edit only what is live.
 *
 * A FLAT LIST, NOT AXES (A26, deferred). "Sea blue × Large" is one opaque variant name rather than
 * two dimensions — see `src/components/home/store/sections/variant-picker.tsx`.
 */
export const SellerProductVariantSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    publicSlug: z.string(),
    sku: z.string().nullable(),
    priceInCents: z.number().int(),
    stockQuantity: z.number().int(),
    minimumOrderQuantity: z.number().int().nullable(),
    position: z.number().int(),
    state: z.enum(["active", "retired"]),
    pricingTiers: z.array(ProductPricingTierSchema),
  })
  .strip();

/**
 * A18. One customization slot the seller offers on this listing — "Your logo", "Packaging material".
 *
 * ⚠️ THIS WAS MISSING ENTIRELY, AND `.strip()` MADE THAT SILENT — the same defect as
 * `SellerProductVariantSchema` above, one feature over. The backend has returned
 * `customizationOptions[]` on the owner read since A23 (`products.service.ts:478`), and because this
 * schema did not name the key, every seller read DISCARDED it. That is why the wizard could not
 * hydrate slots and therefore never offered to author them.
 *
 * ⚠️ `state` IS THE SELLER'S VIEW AND NOT THE BUYER'S, and the reason is the same as a variant's. A
 * retired slot is still returned here — order lines bought under it still name it, and all three
 * selection tables reference it `onDelete: restrict`, so it is retired rather than deleted. The
 * buyer's projection (`@/lib/store/products.schemas`) filters to `active` and omits the field; a
 * seller form must show what exists and edit only what is live.
 *
 * ⚠️ RETIRED ROWS CARRY A PARKED `position`. The replace-set offsets every existing row out of range
 * before rewriting, and a retired one is never given a final position — so retired slots sort after
 * active ones by accident of that offset rather than by design. Only the active rows are ordered
 * meaningfully, which is all a form should be reading anyway.
 *
 * TWO KINDS, AND THEY ARE MUTUALLY EXCLUSIVE. An upload slot carries `acceptedMediaTypes` and no
 * `choiceValues`; a choice slot the reverse. The backend enforces that with a cross-field refine, so
 * a slot carrying both is a 422 that fails the whole save.
 */
export const SellerProductCustomizationOptionSchema = z
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
    state: z.enum(["active", "retired"]),
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
/**
 * One ordered block of the Alibaba-style long-form listing body: a heading, a paragraph, and an
 * optional image. Up to 12 per listing.
 *
 * ⚠️ `imageUrl` IS READ-ONLY. Migration `0091` removed it from the write schema so the platform
 * holds the bytes rather than hotlinking a seller's server: the image is uploaded separately to
 * `POST /products/:id/highlights/:highlightId/image` and comes back here as a Cloudinary URL.
 * Sending it back on a write is a 422 against a `.strict()` body.
 */
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
 * STORE §21.3. A public PDF the seller attached — the owner's view of it.
 *
 * ⚠️ NO `downloadPath` HERE, unlike the buyer's projection. The wizard lists and removes files; it
 * does not link to them, and the seller's own listing may not be public yet, so a download path
 * would be a link that legitimately 404s.
 */
export const SellerProductDocumentSchema = z
  .object({
    id: z.string(),
    documentKind: z.enum(PRODUCT_DOCUMENT_KINDS),
    fileName: z.string(),
    byteSize: z.number().int(),
    position: z.number().int(),
  })
  .strip();

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
  /**
   * STORE §20. The category's own required attributes.
   *
   * `not_applicable` for most listings — a category that marks nothing required asks nothing — so
   * this shows as an unmet box only where an admin actually demanded a field.
   */
  "categoryAttributes",
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
    /**
     * §21.2. NOT `status`, and the two are easy to confuse. `status` is draft/active — whether
     * this listing has been published. This is whether the seller still sells the thing.
     */
    sellingState: z.enum(PRODUCT_SELLING_STATES),
    /**
     * A THIRD STATE, AND THE ONLY ONE THE SELLER DOES NOT CONTROL. `status` is draft/active and
     * `sellingState` is whether the seller still sells the thing; this is what a MODERATOR decided.
     *
     * ⚠️ IT WAS ON THE WIRE AND NOT IN THIS SCHEMA, so `.strip()` dropped it and a seller whose
     * listing was `rejected` or `suspended` was told nothing at all — the studio showed "Draft" or
     * "Active" as though nothing had happened. That is the same defect `video.moderationVisibility
     * State` had in the Studio before `/studio/copyright` shipped: not silence about a takedown,
     * but a wrong answer on the one screen the person who could appeal would look at.
     */
    moderationState: z.enum(PRODUCT_MODERATION_STATES),
    publishedAt: z.string().nullable(),
    /**
     * The buyer-facing slug, so the studio can link to the live listing at
     * `/store/product/${publicSlug}`. Server-generated and returned since the column shipped;
     * nothing on this client had ever named it, so there was no way out of the studio to the page
     * a seller was editing.
     *
     * NULL UNTIL PUBLISHED. A draft has no buyer page, so the link is gated on the value rather
     * than on `status` — the two can disagree and the slug is the one that decides whether a URL
     * exists.
     */
    publicSlug: z.string().nullable(),
    /**
     * THE THREE IDENTITY FACTS THE BUYER PAGE ALREADY RENDERS.
     *
     * `product-details-sheet.tsx` builds its "Item details" tab from `brand`, `modelNumber`,
     * `condition`, `countryOfOriginCode` and `unitOfMeasure` — so before these reached the seller
     * form, three of those five rows were dropped for every listing on the site. The columns, the
     * CHECK (`product_model_unit_ck`) and the write schema all predate this; only the seller had
     * no way to fill them in.
     *
     * `countryOfOriginCode` is ISO 3166-1 alpha-2 and the backend regex is `/^[A-Z]{2}$/`.
     * `unitOfMeasure` is free text ("piece", "metre", "carton") — there is no unit enum on the
     * wire, and inventing one here would refuse a unit the backend accepts.
     */
    modelNumber: z.string().nullable(),
    countryOfOriginCode: z.string().nullable(),
    unitOfMeasure: z.string().nullable(),
    images: z.array(ProductImageSchema),
    pricingTiers: z.array(ProductPricingTierSchema),
    /**
     * A1. Every variation on this listing, ACTIVE AND RETIRED, ordered by `position`.
     *
     * Empty means the listing is sold as one thing. Non-empty changes how it is bought: a cart line
     * naming no variant is refused `VARIANT_REQUIRED`, and the storefront card shows a "from" price
     * the server computes across the active ones.
     */
    variants: z.array(SellerProductVariantSchema),
    /**
     * The structured spec sheet. Ordered by `position`, and EMPTY FOR EVERY LISTING CREATED
     * BEFORE THIS FIELD REACHED THE FORM — the backend has accepted `specifications[]` on create
     * and PATCH since the table shipped, and no client had ever sent one, so the buyer's spec
     * sheet and comparison table were rendering an array nothing wrote to.
     */
    specifications: z.array(ProductSpecificationSchema),
    /**
     * STORE §20. The listing's STRUCTURED answers, so an edit hydrates what was saved.
     *
     * Shaped like the buyer's, minus the display-only joins: the wizard needs the raw answer to
     * put back in a control, not a rendered string.
     */
    attributeValues: z.array(
      z
        .object({
          attributeKey: z.string(),
          valueKind: z.enum(CATEGORY_ATTRIBUTE_VALUE_KINDS),
          numericScale: z.number().int().nullable(),
          choiceValue: z.string().nullable(),
          numericValueScaled: z.number().nullable(),
          textValue: z.string().nullable(),
        })
        .strip(),
    ),
    /**
     * The long-form body. Rendered by `sections/product-highlights.tsx` on the buyer page, which
     * has been mapping an empty array since it shipped — the table, both routes and the image
     * pipeline all existed and no seller surface ever wrote to them.
     */
    highlights: z.array(ProductHighlightSchema),
    documents: z.array(SellerProductDocumentSchema),
    // A18. ACTIVE AND RETIRED BOTH — see `SellerProductCustomizationOptionSchema`. Naming the key is
    // the whole fix: `.strip()` was discarding this array on every seller read.
    customizationOptions: z.array(SellerProductCustomizationOptionSchema),
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
    /** §20. What a moderator decided. `status` says draft/active and cannot carry this. */
    moderationState: z.enum(PRODUCT_MODERATION_STATES),
    /** NULL until published. */
    publicSlug: z.string().nullable(),
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
export type ProductHighlight = z.infer<typeof ProductHighlightSchema>;
export type SellerProductDocument = z.infer<typeof SellerProductDocumentSchema>;
export type SellerProductCustomizationOption = z.infer<
  typeof SellerProductCustomizationOptionSchema
>;
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
  /**
   * §21.2. Omitted on create — the column defaults to `selling`, which is what creating a listing
   * means. Set it on a PATCH to pause or retire one.
   *
   * ⚠️ `paused` AND `discontinued` ARE BOTH UNBUYABLE. The backend refuses a cart add for either
   * with a 409; the difference is what the buyer is told, and whether the page points them at
   * replacements.
   */
  sellingState?: (typeof PRODUCT_SELLING_STATES)[number];
  /**
   * The manufacturer's own code for this item — a part number, a model number, a style code.
   *
   * ⚠️ NOT UNIQUE, and it must never become so. Two sellers listing the same manufacturer part is
   * the premise of a parametric marketplace rather than a data error; `sku` is the unique one, and
   * it is unique per seller organization. The backend indexes this into the store search document,
   * so an exact code typed into search finds the listings that carry it.
   */
  modelNumber?: string;
  /** ISO 3166-1 alpha-2, upper case. Normalise with `toOptionalCountryCode` before sending. */
  countryOfOriginCode?: string;
  /** Free text — "piece", "set", "metre", "carton". There is no unit enum on the wire. */
  unitOfMeasure?: string;
  pricingTiers: ProductPricingTierInput[];
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

/**
 * One structured answer to a category attribute — STORE §20.
 *
 * ⚠️ NOT PART OF `CreateProductInput`. These go to `PUT /products/:id/attributes`, their own
 * route, because the backend validates each one against the resolved attribute set of the
 * product's category — which it can only look up once the listing exists and has a category.
 *
 * ⚠️ A TAGGED UNION, so an answer cannot arrive as two types at once. `kind` must match the
 * DEFINITION's `valueKind` or the backend answers 422 naming the expected one; the whole point of
 * a definition is that the answer has a type.
 *
 * ⚠️ `numericValueScaled` IS ALREADY MULTIPLIED by the definition's `numericScale`. No decimal
 * crosses the wire, the same rule integer cents follow.
 */
export type ProductAttributeValueInput =
  | { attributeKey: string; kind: "enum"; choiceValue: string }
  | { attributeKey: string; kind: "number"; numericValueScaled: number }
  | { attributeKey: string; kind: "text"; textValue: string };

/** The backend's own bounds (`products.controller.ts:84-88`), mirrored so the form can refuse early. */
export const PACKAGE_DIMENSION_MM_MAX = 50_000;
export const PACKAGE_GROSS_WEIGHT_GRAMS_MAX = 50_000_000;
export const UNITS_PER_PACKAGE_MAX = 1_000_000;

/**
 * The highlight plan sent to `PUT /products/:id/highlights`.
 *
 * ⚠️ ECHO BACK THE `id` OF A BLOCK YOU ARE KEEPING. The backend calls it "a HINT, NOT A GRANT" —
 * it is honoured only when the row already belongs to this product, and otherwise a new row is
 * inserted with a server id. Omitting it on an edit discards that block's uploaded image, because
 * the replace-set has no way to tell the row survived.
 */
export interface ProductHighlightInput {
  id?: string;
  title: string;
  bodyText: string;
}

/**
 * A1. One variation on the way IN — `PUT /products/:id/variants`, a whole-set replace.
 *
 * ⚠️ `publicSlug` IS THE IDENTITY ACROSS SAVES, NOT `id`. The backend upserts by slug and RETIRES
 * whatever the payload leaves out (`products.service.ts:825-826`), so changing a slug does not
 * rename a variant — it retires the old row and creates a new one, orphaning the order lines that
 * bought under it. A form may derive a slug from the name for a NEW row; an existing row's slug is
 * frozen.
 *
 * ⚠️ `sku` AND `minimumOrderQuantity` ARE OPTIONAL, NOT NULLABLE, and this is the `group` trap one
 * table over: the read view types both `| null`, the write schema types them `.optional()` inside a
 * `.strict()` object, so a hydrated `null` sent straight back is a **422 that fails the whole
 * save**. Omit the key instead.
 *
 * ⚠️ `pricingTiers` IS REQUIRED, AND OMITTING IT DELETES THE VARIANT'S LADDER. An earlier version of
 * this comment claimed the opposite — that leaving the key out "preserves volume pricing" because a
 * variant with no ladder inherits the listing's. **That was wrong, and it shipped.** Inheritance is
 * a READ-time fallback at price resolution (`commerce-pricing.ts:365-377`), which fires when a
 * variant has no tier ROWS; the write is what creates that state. The backend field is
 * `.default([])`, so an absent key parses to `[]` — *defined*, not absent — and
 * `replaceProductVariants` then runs an unconditional `delete … where variantId = X`
 * (`products.service.ts:901`) with the insert guarded by `length > 0`.
 *
 * Reproduced live before the fix: a variant carrying two bands came back with zero after a save
 * that changed nothing. The field is required here so the compiler makes every caller decide, and
 * `[]` now means what it says — this variant has no ladder of its own and falls back to the
 * listing's.
 */
export interface ProductVariantInput {
  name: string;
  publicSlug: string;
  sku?: string;
  priceInCents: number;
  stockQuantity: number;
  minimumOrderQuantity?: number;
  pricingTiers: ProductPricingTierInput[];
}

/**
 * One band on the way IN.
 *
 * ⚠️ `leadTimeDays` IS OPTIONAL, NOT NULLABLE. The backend types it `.optional()` inside a
 * `.strict()` object and inserts `?? null`, so OMITTING the key means "the product's lead time
 * applies" — which is the honest answer for a band the seller left blank. Sending `null` is a 422.
 */
export interface ProductPricingTierInput {
  unitPriceInCents: number;
  minimumOrderQuantity: number;
  leadTimeDays?: number;
}

/** A1. The backend caps a listing at 50 variants (`products.schemas.ts:155`). */
export const PRODUCT_VARIANT_MAX_COUNT = 50;

/**
 * A18. One customization slot on the way IN.
 *
 * ⚠️ `slotKey` IS THE IDENTITY THE BACKEND UPSERTS ON, exactly as `publicSlug` is for a variant, and
 * the write is a REPLACE-SET THAT RETIRES OMISSIONS. A slot dropped from this array is set
 * `state: "retired"` rather than deleted; a slot whose key CHANGES is a retirement plus a fresh
 * insert. So a caller must send back every slot it is keeping, and must never silently drop a row it
 * failed to serialise.
 *
 * ⚠️ IT IS SNAKE_CASE, NOT KEBAB. The backend regex is `/^[a-z0-9]+(_[a-z0-9]+)*$/` — a machine key
 * of the same family as an enum label, not a URL slug. `toVariantSlug` produces kebab and cannot be
 * reused for it.
 *
 * ⚠️ `isRequired` IS DELIBERATELY ABSENT FROM THIS TYPE, and it is a safety decision rather than an
 * oversight. `checkout/prepare` revalidates every cart line unconditionally, and NO CLIENT ANYWHERE
 * SUBMITS A CUSTOMIZATION SELECTION yet — `customization-sheet.tsx` collects the buyer's choices and
 * sends none of them, because an uploaded asset lands `pending_scan` and cannot be attached until a
 * scanner promotes it. So a required slot would make its listing permanently uncheckoutable BY
 * ANYBODY, including a buyer who wants to answer. The backend defaults the flag to `false` when the
 * key is absent, which is the only safe value until the buyer-side selection path exists.
 *
 * The three optional keys are OMITTED when empty, never nulled — the backend object is `.strict()`
 * with `.optional()` keys, so a null is a 422 that fails the whole save.
 */
export interface ProductCustomizationOptionInput {
  slotKey: string;
  label: string;
  customizationKind: ProductCustomizationKind;
  acceptedMediaTypes?: string[];
  choiceValues?: string[];
  minimumOrderQuantity?: number;
}

/** A18. The backend caps a listing at 12 slots (`products.schemas.ts:395`). */
export const PRODUCT_CUSTOMIZATION_SLOT_MAX_COUNT = 12;
/** Per slot: at most 12 accepted media types, at most 50 choice values. */
export const PRODUCT_CUSTOMIZATION_MEDIA_TYPE_MAX_COUNT = 12;
export const PRODUCT_CUSTOMIZATION_CHOICE_MAX_COUNT = 50;
/** The backend's own key shape. Snake_case, so `toVariantSlug`'s kebab output would be refused. */
export const PRODUCT_CUSTOMIZATION_SLOT_KEY_PATTERN = /^[a-z0-9]+(_[a-z0-9]+)*$/;
export const PRODUCT_VARIANT_NAME_MAX_LENGTH = 120;
export const PRODUCT_VARIANT_SLUG_MAX_LENGTH = 80;
export const PRODUCT_VARIANT_SKU_MAX_LENGTH = 80;

export const PRODUCT_HIGHLIGHT_MAX_COUNT = 12;
export const PRODUCT_HIGHLIGHT_TITLE_MAX_LENGTH = 120;
export const PRODUCT_HIGHLIGHT_BODY_MAX_LENGTH = 2000;

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
