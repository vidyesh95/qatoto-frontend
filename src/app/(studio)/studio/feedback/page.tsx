import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Feedback",
  description: "Feedback page for Qatoto Creator Studio",
};

export default function StudioFeedback() {
  return (
    <StudioPlannedPage
      title="Feedback"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="Tell us what is broken."
      whatItWillDo={[
        "Send a bug report or a suggestion from inside the Studio.",
        "Tell you when something you reported changed.",
      ]}
      insteadFor={{
        label: "Customer Service",
        href: "/customer-service",
        note: "For something broken that is blocking you, start at",
      }}
    />
  );
}
