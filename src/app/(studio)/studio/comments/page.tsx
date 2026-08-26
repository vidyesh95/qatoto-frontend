import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Comments",
  description: "Comments page for Qatoto Creator Studio",
};

export default function StudioComments() {
  return (
    <StudioPlannedPage
      title="Comments"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="Moderate across every video at once."
      whatItWillDo={[
        "Put every comment on every one of your videos in one queue.",
        "Filter to the ones waiting on you.",
        "Act on several at once instead of opening each video.",
      ]}
      insteadFor={{
        label: "the watch page",
        href: "/",
        note: "Each video's own comment section is where you can moderate today \u2014 open the video from",
      }}
    />
  );
}
