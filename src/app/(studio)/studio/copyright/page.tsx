import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Copyright",
  description: "Copyright page for Qatoto Creator Studio",
};

export default function StudioCopyright() {
  return (
    <StudioPlannedPage
      title="Copyright"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="Claims against your work, and yours against others."
      whatItWillDo={[
        "List claims made against your videos and their state.",
        "Let you file a claim about your own work used elsewhere.",
        "Track a dispute through to its outcome.",
      ]}
      insteadFor={{
        label: "the Copyright Policy",
        href: "/copyright-policy",
        note: "The process for a takedown notice, and what one must contain, is set out in",
      }}
    />
  );
}
