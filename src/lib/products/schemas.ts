import { z } from "zod";

/**
 * Client-side contract for the store product-listing API. Data truth lives in the
 * Express backend (`/products/*`); these Zod schemas parse untrusted response
 * payloads (CLAUDE.md Pattern 2 — never `as`/`any` on the network). `.strip()`
 * keeps the client forward-compatible with backend minor additions.
 */

export const PRODUCT_CATEGORY_SLUGS = [
  "electronics",
  "fashion",
  "home_kitchen",
  "anime_collectibles",
  "digital_goods",
  "books_media",
  "sports_outdoors",
  "beauty_personal_care",
] as const;

export const PRODUCT_CONDITION_SLUGS = ["new", "refurbished", "used"] as const;
export const PRODUCT_STATUSES = ["draft", "active"] as const;

/**
 * Wizard display labels ↔ stored slugs (STORE_BACKEND_STRUCTURE.md §4). Order is
 * load-bearing: it matches the `PRODUCT_CATEGORIES` label array in the wizard.
 */
export const CATEGORY_LABELS = [
  "Electronics",
  "Fashion",
  "Home & Kitchen",
  "Anime & Collectibles",
  "Digital Goods",
  "Books & Media",
  "Sports & Outdoors",
  "Beauty & Personal Care",
] as const;

export const CATEGORY_LABEL_TO_SLUG: Record<string, (typeof PRODUCT_CATEGORY_SLUGS)[number]> =
  Object.fromEntries(CATEGORY_LABELS.map((label, index) => [label, PRODUCT_CATEGORY_SLUGS[index]]));

export const SLUG_TO_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  PRODUCT_CATEGORY_SLUGS.map((slug, index) => [slug, CATEGORY_LABELS[index]]),
);

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
    category: z.string(),
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
  category: (typeof PRODUCT_CATEGORY_SLUGS)[number];
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
