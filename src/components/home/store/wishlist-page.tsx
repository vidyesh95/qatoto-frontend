// TRANSPORT: client-query — reads GET /commerce/bookmarked-products.
"use client";

// THE PAGE THE BOOKMARK TOGGLE HAS BEEN FEEDING SINCE PHASE 13 WITH NOWHERE TO SHOW IT.
//
// `PUT|DELETE /store/products/:slug/bookmark` shipped with A11 and `engagement-bar.tsx` has been
// calling it all along. Nothing listed the result: the per-product counters were readable, the SET
// was not readable at all, so a buyer could mark two hundred products and had no way to find them
// again. `GET /commerce/bookmarked-products` was built for this page.
//
// BOOKMARKS ONLY. THE HEART IS NOT A FILING GESTURE. This page used to carry three chips —
// Everything, Saved, Bookmarked — because the route returned both kinds when asked for neither,
// and the heart was called "save". It was not a filter offering a choice; it was a page admitting
// it had mixed two different things together. A like is a public counter on a listing, a reaction
// other buyers can see, and it belongs in nobody's wishlist. There is no chip to bring back.
//
// A ROW CAN DISAPPEAR AND THAT IS CORRECT. The server resolves ids through
// `resolveEligibleProductCardsByIds`, which drops anything unpublished, hidden by a moderator, or
// belonging to an organization that stopped trading — so a page can come back shorter than its
// limit. A wishlist is not a licence to keep rendering a listing the store has withdrawn.

import Link from "next/link";

import CatalogProductCard from "@/components/home/store/cards/catalog-product-card";
import StatusPanel from "@/components/home/shared/status-panel";
import { useBookmarkedProductsQuery } from "@/hooks/store/bookmarked-products";

export default function WishlistPage() {
  const bookmarkedQuery = useBookmarkedProductsQuery();

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">Wishlist</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Everything you have bookmarked.</p>
      </header>

      <div className="mt-3 px-4 lg:px-6">{renderWishlist(bookmarkedQuery)}</div>
    </div>
  );
}

function renderWishlist(bookmarkedQuery: ReturnType<typeof useBookmarkedProductsQuery>) {
  if (bookmarkedQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading your wishlist…</p>;
  }

  const result = bookmarkedQuery.data;
  if (bookmarkedQuery.isError || result === undefined) {
    return (
      <StatusPanel
        message="Couldn't load your wishlist."
        className="border border-border px-6 py-16"
      />
    );
  }
  if (!result.success) {
    // A 401 renders the backend's own sentence — "Please sign in." — rather than an invented one.
    return (
      <StatusPanel
        message={result.error.message}
        className="border border-border px-6 py-16"
        action={
          result.error.code === "401" ? (
            <Link
              href="/sign-in"
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
            >
              Sign in
            </Link>
          ) : undefined
        }
      />
    );
  }

  if (result.data.items.length === 0) {
    return (
      <StatusPanel
        // Names the ONE control that fills this page. The old copy named the heart too, which
        // is how a buyer learned to expect their likes here.
        message="Nothing bookmarked yet. The bookmark on any listing puts it here."
        className="border border-border px-6 py-16"
        action={
          <Link
            href="/store"
            className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            Browse the store
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {result.data.items.map((product) => (
        <CatalogProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
