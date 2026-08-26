import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Funding",
  description: "Funding page for Qatoto Creator Studio",
};

export default function StudioFunding() {
  return (
    <StudioPlannedPage
      title="Funding"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="Raise against a project from Studio."
      whatItWillDo={[
        "Open and manage a funding round without leaving Studio.",
        "Show pledges and backers across all of your projects at once.",
      ]}
      insteadFor={{
        label: "Research and Development",
        href: "/research-and-development",
        note: "Funding rounds, pledges and milestones are real today, but they belong to a project rather than to your account \u2014 open the project from",
      }}
    />
  );
}
