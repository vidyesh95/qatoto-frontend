import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Learn",
  description: "Learn page for Qatoto Creator Studio",
};

export default function StudioLearn() {
  return (
    <StudioPlannedPage
      title="Learn"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="How to do the thing you are stuck on."
      whatItWillDo={[
        "Explain each part of the Studio at the point you need it.",
        "Cover the pipeline end to end: idea, team, funding, build, sell.",
      ]}
      // ADDED AFTER AN AUDIT FOUND THIS PAGE ALONE OFFERING NOTHING. `insteadFor` is for "the
      // surface that does the job today WHERE ONE TRULY EXISTS", and one partly does:
      // `/how-qatoto-works` is authored, real and in the sitemap. It explains the PIPELINE, which
      // is the second bullet above; it does not explain the Studio at the point you are stuck,
      // which is the first — so the note claims the half that is true and no more.
      insteadFor={{
        label: "How Qatoto Works",
        href: "/how-qatoto-works",
        note: "The pipeline itself — idea, team, funding, build, sell — is explained in",
      }}
    />
  );
}
