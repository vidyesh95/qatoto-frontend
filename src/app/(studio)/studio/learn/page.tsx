import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Learn",
  description: "Learn page for Qatoto Creator Studio",
};

export default function StudioLearn() {
  return (
    <StudioPlannedPage
      title="Learn"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="How to do the thing you are stuck on."
      whatItWillDo={[
        "Explain each part of the Studio at the point you need it.",
        "Cover the pipeline end to end: idea, team, funding, build, sell.",
      ]}
    />
  );
}
