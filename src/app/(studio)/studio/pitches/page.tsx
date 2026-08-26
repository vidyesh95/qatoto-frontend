import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Pitches",
  description: "Pitches page for Qatoto Creator Studio",
};

export default function StudioPitches() {
  return (
    <StudioPlannedPage
      title="Pitches"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="Pitches you sent and received."
      whatItWillDo={[
        "Keep the pitches you have sent and the ones sent to you.",
        "Track which were opened, answered or declined.",
      ]}
    />
  );
}
