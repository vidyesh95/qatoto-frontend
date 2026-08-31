import type { Metadata } from "next";

import EarnPage from "@/components/studio/commerce/earnings/earn-page";

// Permanently dynamic: session-scoped and behind a seller organization.
export const instant = false;

/**
 * NO LONGER A PLANNED PAGE. This rendered `StudioPlannedPage` with an "instead" link to
 * `/studio/sales`, because the earnings panel lived there. The panel is here now, so the stub
 * would have been pointing readers away from the very thing they came for.
 *
 * `site-roadmap.ts` was changed in the same edit — a `kind: "planned"` entry there is what
 * `studio-planned-page.tsx` copies its summary from, and leaving it would advertise a built page
 * as unbuilt on `/roadmap`.
 *
 * NO `robots` HERE: `(studio)/layout.tsx` sets `noindex` for the whole group.
 */
export const metadata: Metadata = {
  title: "Earn",
  description: "What you have been paid on Qatoto",
};

export default function StudioEarn() {
  return <EarnPage />;
}
