import { z } from "zod";
import { centsToPriceLabel } from "@/lib/products/schemas";

/**
 * Shared store catalog primitives. Wire casing: camelCase JSON keys, snake_case
 * enums, kebab-case slugs. Money is integer cents + ISO currency — never a
 * formatted price string on the wire (STORE_STRUCTURE §5).
 *
 * Every tuple here mirrors a `pgEnum` in the backend's `src/db/schema.ts`. That file is
 * the authority; a value that is not in it does not exist.
 */

/** `store_presentation_accent`. NOT a Tailwind palette — five tokens, and only these five. */
export const STORE_ACCENT_TOKENS = ["amber", "slate", "emerald", "sky", "rose"] as const;
export const StoreAccentTokenSchema = z.enum(STORE_ACCENT_TOKENS);
export type StoreAccentToken = z.infer<typeof StoreAccentTokenSchema>;

/**
 * A backend presentation token as a filled surface.
 *
 * Never accept a class name from the API — the wire sends a token from a closed enum and this is
 * the only place it becomes CSS. The `never` default is the guard: adding a sixth accent to the
 * backend enum makes this fail to compile until it is handled here.
 *
 * Used by a hero slide with no image, where the type sits on the tint instead of on a photo. The
 * per-card hover wash is a different thing and lives in `tiles.ts` — it cycles a palette by
 * position, because `StoreCategoryProjection` carries no accent at all.
 */
export function accentTokenToSurfaceClass(accent: StoreAccentToken | null | undefined): string {
  switch (accent) {
    case "amber":
      return "bg-amber-50 text-amber-950";
    case "emerald":
      return "bg-emerald-50 text-emerald-950";
    case "sky":
      return "bg-sky-50 text-sky-950";
    case "rose":
      return "bg-rose-50 text-rose-950";
    case "slate":
    case undefined:
    case null:
      return "bg-slate-50 text-slate-950";
    default: {
      const exhaustiveCheck: never = accent;
      return exhaustiveCheck;
    }
  }
}

/**
 * `StoreSellerProjection` — the seller block on every product card and detail.
 *
 * The key is `slug`, not `organizationSlug`, and `countryCode` is NOT nullable. Both were
 * wrong in the first draft of this file and failed every catalog read.
 */
export const StoreSellerSchema = z
  .object({
    organizationId: z.string(),
    slug: z.string(),
    displayName: z.string(),
    countryCode: z.string(),
    logoUrl: z.string().nullable(),
    summary: z.string().nullable(),
  })
  .strip();
export type StoreSeller = z.infer<typeof StoreSellerSchema>;

/**
 * The keyset page that rides beside every paginated list.
 *
 * `hasMore` is exactly `nextCursor !== null` server-side — read either, but do not
 * compute a third answer from the row count.
 */
export const CursorPageSchema = z
  .object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  })
  .strip();
export type CursorPage = z.infer<typeof CursorPageSchema>;

/** Server-derived review aggregate (backend Phase 7). Zero reviews is a fact, not an absence. */
export const StoreReviewMetricsSchema = z
  .object({
    averageRating: z.number().nullable(),
    reviewCount: z.number().int().nonnegative(),
  })
  .strip();
export type StoreReviewMetrics = z.infer<typeof StoreReviewMetricsSchema>;

/** Server-derived fulfillment aggregate (backend Phase 7). */
export const StoreFulfillmentMetricsSchema = z
  .object({
    onTimeShipmentRate: z.number().nullable(),
    completedOrderCount: z.number().int().nonnegative(),
  })
  .strip();
export type StoreFulfillmentMetrics = z.infer<typeof StoreFulfillmentMetricsSchema>;

/** Format integer cents for display. Currency defaults to USD when absent. */
export function formatStorePriceInCents(priceInCents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(priceInCents / 100);
  } catch {
    return centsToPriceLabel(priceInCents);
  }
}

/**
 * A price range label, for the indicative range on a service offering.
 *
 * Returns null when BOTH ends are absent — an offering priced `quote_only` has no range,
 * and rendering "—" there would imply the provider declined to say rather than that the
 * model has no list price.
 */
export function formatStorePriceRange(
  minimumInCents: number | null,
  maximumInCents: number | null,
  currency: string,
): string | null {
  if (minimumInCents !== null && maximumInCents !== null) {
    return `${formatStorePriceInCents(minimumInCents, currency)} – ${formatStorePriceInCents(maximumInCents, currency)}`;
  }
  if (minimumInCents !== null) return `From ${formatStorePriceInCents(minimumInCents, currency)}`;
  if (maximumInCents !== null) return `Up to ${formatStorePriceInCents(maximumInCents, currency)}`;
  return null;
}

/** A lead-time label from an open-ended day range, or null when neither end is known. */
export function formatLeadTimeDays(
  minimumDays: number | null,
  maximumDays: number | null,
): string | null {
  if (minimumDays !== null && maximumDays !== null) return `${minimumDays}–${maximumDays} days`;
  if (minimumDays !== null) return `From ${minimumDays} days`;
  if (maximumDays !== null) return `Up to ${maximumDays} days`;
  return null;
}

/** Last segment of a nested category slug path; empty array → "". */
export function getLastSlugSegment(slugSegments: readonly string[]): string {
  return slugSegments[slugSegments.length - 1] ?? "";
}

/** Display title from a kebab slug when metadata is unavailable. */
export function prettifySlugForDisplay(slug: string): string {
  const spaced = slug.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
