import type { Metadata } from "next";

import CheckoutPage from "@/components/home/store/checkout-page";

// Permanently dynamic: everything on this page is a session-scoped client-query island, so there is
// no Cache Components refactor to do and the usual removable-TODO header would be false here.
export const instant = false;

export const metadata: Metadata = {
  // `noindex` because a checkout is per-session and per-organization. There is nothing here a crawler
  // should hold, and a cached checkout URL is a cached price.
  robots: { index: false, follow: false },
  title: "Checkout",
  description: "Reserve stock and place your Qatoto orders",
};

/**
 * `?buyNow=<productId>` (plus `variantId` when the listing has variants) scopes this checkout to
 * ONE cart line — the PDP's "Buy now" control.
 *
 * ⚠️ THE PARAM CARRIES THE NATURAL KEY, NOT A LINE ID, because the cart projection exposes no line
 * id. It is still exact: the cart is unique on `(cartId, productId, variantId, isSample)`.
 *
 * ⚠️ AN UNREADABLE OR STALE PARAM FALLS BACK TO THE WHOLE CART rather than erroring. This URL is
 * shareable, bookmarkable and hand-typeable, and a checkout that refuses to load because a
 * yesterday's link names a line that has since been bought is worse than one that shows the cart.
 * The server is the authority either way: a selection naming a line that is not there is refused
 * with `CHECKOUT_ITEMS_NOT_IN_CART` at prepare, not silently narrowed.
 */
export default async function Checkout({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | readonly string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const buyNowProductId = typeof resolved.buyNow === "string" ? resolved.buyNow : null;
  const buyNowVariantId = typeof resolved.variantId === "string" ? resolved.variantId : null;

  return <CheckoutPage buyNowProductId={buyNowProductId} buyNowVariantId={buyNowVariantId} />;
}
