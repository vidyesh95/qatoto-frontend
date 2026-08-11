// TRANSPORT: server-fetch — reads the auth cookie so the studio bar's first paint is the viewer's own.
//
// The cookie read is contained here, not awaited in `(studio)/layout.tsx`: studio routes prerender
// (`○ /studio/videos`, `○ /studio/team`), and a layout that read cookies would make every one of them
// dynamic. `navbar-account-slot.tsx` carries the full reasoning.

import StudioNavbarAccountCluster from "@/components/studio/studio-navbar-account-cluster";
import { hasCallerSession } from "@/lib/server-http";

export default async function StudioNavbarAccountSlot() {
  return <StudioNavbarAccountCluster isViewerSignedIn={await hasCallerSession()} />;
}
