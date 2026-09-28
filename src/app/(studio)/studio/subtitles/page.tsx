import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Subtitles",
  description: "Subtitles page for Qatoto Creator Studio",
};

export default function StudioSubtitles() {
  return (
    <StudioPlannedPage
      title="Subtitles"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="Captions and translations."
      whatItWillDo={[
        "Upload or edit a caption track for a video.",
        "Add translations for other languages.",
        "Show which videos have no captions at all.",
      ]}
      // A creator TRANSCRIPT ships (2026-09-28) and is not a caption track: it is shown in the watch
      // page's Transcript tab, while the captions inside the embedded YouTube player stay YouTube's.
      // So the stub stays, and points at what does exist.
      insteadFor={{
        label: "Your videos",
        href: "/studio/videos",
        note: "A transcript (.srt, .vtt or pasted text) can already be added to each video under Video elements, from",
      }}
    />
  );
}
