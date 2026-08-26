import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Customize",
  description: "Customize page for Qatoto Creator Studio",
};

export default function StudioCustomize() {
  return (
    <StudioPlannedPage
      title="Customize"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="Channel branding and layout."
      whatItWillDo={[
        "Set a channel banner and the layout of your channel page.",
        "Choose what a first-time visitor sees before a returning one.",
      ]}
    />
  );
}
