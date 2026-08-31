// TRANSPORT: client-query — mounts `useProductViewBeacon`, which posts once on leaving.
"use client";

// A ZERO-RENDER ISLAND, and it is its own component for a reason rather than out of tidiness.
//
// `product-detail.tsx` is a server component, so the beacon needs SOME client boundary. The two
// islands already on that page are both wrong homes: `ProductSelectionProvider` carries a
// `TRANSPORT: props-only` banner and the words "no network", which a POST would falsify, and
// `EngagementBar` is a conditionally-positioned widget whose lifetime is not the page's — a beacon
// that unmounts when a bar re-flows would report a dwell nobody experienced.
//
// It renders `null`. Mounting it is the whole effect.

import { useProductViewBeacon } from "@/hooks/store/use-product-view-beacon";
import type { ProductViewSource } from "@/lib/store/products.schemas";

export default function ProductViewBeacon({
  productSlug,
  viewSource = "product_detail",
}: {
  readonly productSlug: string;
  /**
   * Defaulted, because the detail page has no idea where the reader came from. Nothing in the app
   * sets a source parameter on a product link today, so anything else would be a claim nothing
   * produces — see `PRODUCT_VIEW_SOURCES`.
   */
  readonly viewSource?: ProductViewSource;
}) {
  useProductViewBeacon(productSlug, viewSource);
  return null;
}
