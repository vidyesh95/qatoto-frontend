// TRANSPORT: server-fetch — reads the auth cookie so the sidebar's first paint is the viewer's own.
//
// THE COOKIE READ IS CONTAINED HERE, for exactly the reason `navbar-account-slot.tsx` gives: awaiting
// `hasCallerSession()` in `(home)/layout.tsx` would read cookies above every route in the group and
// turn all of them `ƒ (Dynamic)`. The layout stays synchronous and only this subtree suspends.
//
// WHAT THIS FIXES. `sidebar.tsx` had no session read of any kind in its whole 545 lines, so an
// anonymous visitor was shown Library, History, Wishlist, Cart, Orders and returns, Listings, Sales,
// Your requests and Service engagements as though they were theirs — under a heading reading
// "Personalisation". That is also why "Sign out" rendering to signed-out visitors went unnoticed for
// as long as that row existed: nothing in the file could have hidden it.
//
// IT HIDES ROWS, IT DOES NOT GUARD ROUTES. `hasCallerSession()` tests for the PRESENCE of an auth
// cookie and a stale or forged one passes it. Every route behind these rows authorizes itself and the
// backend re-authorizes every request.

import Sidebar from "@/components/home/layout/sidebar";
import { hasCallerSession } from "@/lib/server-http";

export default async function SidebarSlot() {
  return <Sidebar isViewerSignedIn={await hasCallerSession()} />;
}
