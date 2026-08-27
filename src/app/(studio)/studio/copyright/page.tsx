import type { Metadata } from "next";

import StudioCopyrightPage from "@/components/studio/copyright/copyright-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Copyright and claims",
  description: "Decisions about your videos, and the reports you have filed",
};

// GRADUATED FROM `StudioPlannedPage`, and it closed a defect rather than only filling a gap.
//
// `video.moderationVisibilityState` reached NO read a creator could see, and
// `deriveStudioVideoStatus` had no branch for it — so a video a moderator had hidden reported
// itself to its own owner as `published`. The Studio was not silent about a takedown, it was
// WRONG about it, on the one screen the person who could appeal would look at.
//
// Half of this page already existed: `GET /users/me/video-reports` has shipped since video
// reporting did. What was missing was the other direction — what has been decided about YOU.
export default function StudioCopyright() {
  return <StudioCopyrightPage />;
}
