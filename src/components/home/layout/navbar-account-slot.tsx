// TRANSPORT: server-fetch — reads the auth cookie so the navbar's first paint is the viewer's own.
//
// THE COOKIE READ IS CONTAINED HERE, AND THAT CONTAINMENT IS THE WHOLE DESIGN.
//
// `(home)`, `(studio)` and `(admin)` routes genuinely prerender — the build emits `○ /cart`,
// `○ /wishlist`, `○ /your-account`. Awaiting `hasCallerSession()` in the LAYOUT would read cookies
// above every one of them and make the entire group dynamic. `(admin)/layout.tsx` already states
// this rule about `AdminStaffGate` ("THE GATE IS A CHILD, NOT THIS COMPONENT"), and this follows it:
// the layout stays synchronous and merely constructs the element, while only this subtree suspends.
//
// The consequence is visible and expected: routes shift from `○ (Static)` to `◐ (Partial Prerender)`
// because the navbar now has a genuinely per-viewer region. That is `cacheComponents` working, not a
// regression. What would BE a regression is a route turning `ƒ (Dynamic)` — that would mean the read
// escaped its `<Suspense>` boundary.

import NavbarAccountCluster from "@/components/home/layout/navbar-account-cluster";
import { hasCallerSession } from "@/lib/server-http";

export default async function NavbarAccountSlot() {
  return <NavbarAccountCluster isViewerSignedIn={await hasCallerSession()} />;
}
