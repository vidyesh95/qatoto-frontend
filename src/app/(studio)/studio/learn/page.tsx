import type { Metadata } from "next";

import StudioLearnPage from "@/components/studio/learn/studio-learn-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * GRADUATED FROM `StudioPlannedPage`. The stub promised two things — explain each part of the
 * Studio at the point you need it, and cover the pipeline end to end — and the page now does the
 * first and links `/how-qatoto-works` for the second, which was already the honest split.
 * `site-roadmap.ts` was corrected in the same edit, so `/roadmap` no longer advertises a built page
 * as unbuilt.
 *
 * NO `robots` HERE: `(studio)/layout.tsx` sets `noindex` for the whole group.
 */
export const metadata: Metadata = {
  title: "Learn",
  description: "How each part of Qatoto Creator Studio works, by what you are trying to do",
};

export default function StudioLearn() {
  return <StudioLearnPage />;
}
