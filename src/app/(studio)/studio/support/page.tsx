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
      insteadFor={{
        label: "Customer Service",
        href: "/customer-service",
        note: "Every problem that has a real home today is signposted from",
      }}
    />
  );
}
