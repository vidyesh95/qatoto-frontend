import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Support",
  description: "Support page for Qatoto Creator Studio",
};

export default function StudioSupport() {
  return (
    <StudioPlannedPage
      title="Support"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="Reach a human about your account."
      whatItWillDo={[
        "Open a support conversation attached to your account.",
        "Track what you have asked and what was answered.",
      ]}
      // STILL `planned`, because nothing was built AT THIS ROUTE — a seller has no
      // studio-scoped support surface, and counting somebody else's page as this one's
      // delivery is exactly what `studio-planned-page.tsx` refuses to do. What changed is
      // that the alternative is no longer a signpost: support cases are live on the main
      // site, and both bullets above describe what that page already does.
      insteadFor={{
        label: "Customer Service",
        href: "/customer-service",
        note: "Support cases are live and a person answers them — open one from",
      }}
    />
  );
}
