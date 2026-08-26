import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Earn",
  description: "Earn page for Qatoto Creator Studio",
};

export default function StudioEarn() {
  return (
    <StudioPlannedPage
      title="Earn"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="Monetisation and payouts."
      whatItWillDo={[
        "Bring seller revenue, video monetisation and payouts into one place.",
        "Show what has been earned, what is owed and when it moves.",
      ]}
      insteadFor={{
        label: "Sales",
        href: "/sales",
        note: "Revenue from things you SELL is already real and is shown in",
      }}
    />
  );
}
