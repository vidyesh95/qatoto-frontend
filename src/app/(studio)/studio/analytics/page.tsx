import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Analytics",
  description: "Analytics page for Qatoto Creator Studio",
};

export default function StudioAnalytics() {
  return (
    <StudioPlannedPage
      title="Analytics"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="Reach, retention and revenue in one view."
      whatItWillDo={[
        "Show views, watch time and retention per video, and across your channel.",
        "Break reach down by where viewers came from.",
        "Sit beside the store and R&D numbers rather than in a separate tool.",
      ]}
    />
  );
}
