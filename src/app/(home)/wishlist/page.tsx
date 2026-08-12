import type { Metadata } from "next";

import WishlistPage from "@/components/home/store/wishlist-page";

// Permanently dynamic: the wishlist is session-scoped and never reaches a server render, so there
// is no Cache Components refactor to do here.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Wishlist",
  description: "Products you have saved on Qatoto",
};

/**
 * WAS AN `<h1>` STUB, AND THE REASON WAS A MISSING BACKEND READ.
 *
 * The save and bookmark toggles have worked since Phase 13, but nothing listed what they produced —
 * there was no `GET /commerce/saved-products`. That route was added for this page.
 */
export default function WishlistRoute() {
  return <WishlistPage />;
}
