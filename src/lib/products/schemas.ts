import { z } from "zod";

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
export type PublicProduct = z.infer<typeof PublicProductSchema>;
export type ProductListRow = z.infer<typeof ProductListRowSchema>;

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
}

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
