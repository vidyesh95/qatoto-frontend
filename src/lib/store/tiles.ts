// TRANSPORT: props-only — pure mapping, no network.

import type { StoreProductCard } from "@/lib/store/catalog.schemas";
import { formatStorePriceInCents } from "@/lib/store/shared.schemas";

/**
 * The shape a product tile actually needs to render.
 *
 * WHY THIS EXISTS RATHER THAN PASSING `StoreProductCard` EVERYWHERE: some rails on this surface
 * are still mock (the PDP's "Frequently bought together" and "Other recommendations", the three
 * named rails on a category page), and `StoreProductCard` demands `seller`, `category`,
 * `reviewMetrics` and `fulfillmentMetrics`. Building those by hand to feed a mock rail would put
 * invented seller identities and fabricated review counts into the component tree, where nothing
 * downstream could tell them from server truth.
 *
 * A tile carries only what the card draws. Real rails map through `toProductTile`; mock rails
 * build tiles literally and can express exactly what they know and nothing more.
 */
export interface StoreProductTile {
  readonly id: string;
  readonly title: string;
  /** Brand, seller, or a mock rail's own descriptor. Null renders no second line. */
  readonly secondaryLabel: string | null;
  readonly imageUrl: string | null;
  /** Already formatted — the tile never sees cents without its currency. */
  readonly priceLabel: string;
  readonly minimumOrderQuantity: number | null;
  /**
   * Null renders the tile unlinked.
   *
   * Mock tiles set this. At HEAD they pointed at `/store/product/{id}`, which rendered the same
   * placeholder product for ANY id; that route is gone, so the same link would now be a 404 the
   * visitor cannot distinguish from a withdrawn listing.
   */
  readonly href: string | null;
  /** Position in its rail, for the hover tint. Presentation only. */
  readonly accentIndex: number;
}

/**
 * The hover wash cycled across cards in a rail.
 *
 * Presentational and client-owned on purpose: `StoreCategoryProjection` carries no accent token,
 * so this cannot come from the wire. It is a palette index, not data about the product.
 */
const HOVER_TINT_PALETTE = [
  "group-hover:bg-yellow-100",
  "group-hover:bg-amber-100",
  "group-hover:bg-green-100",
  "group-hover:bg-blue-100",
  "group-hover:bg-red-100",
] as const;

export function hoverTintForIndex(index: number): string {
  return HOVER_TINT_PALETTE[index % HOVER_TINT_PALETTE.length];
}

/** A parsed backend product card as a renderable tile. */
export function toProductTile(product: StoreProductCard, accentIndex: number): StoreProductTile {
  return {
    id: product.id,
    title: product.title,
    secondaryLabel: product.brand ?? product.seller.displayName,
    imageUrl: product.mainImageUrl,
    priceLabel: formatStorePriceInCents(product.priceInCents, product.currency),
    minimumOrderQuantity: product.minimumOrderQuantity,
    href: `/store/product/${product.publicSlug}`,
    accentIndex,
  };
}

/** A whole page of parsed product cards as tiles, numbered for the tint cycle. */
export function toProductTiles(products: readonly StoreProductCard[]): StoreProductTile[] {
  return products.map((product, productIndex) => toProductTile(product, productIndex));
}
