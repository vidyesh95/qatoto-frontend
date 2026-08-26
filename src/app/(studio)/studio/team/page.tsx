import type { Metadata } from "next";

import StudioPlannedPage from "@/components/studio/studio-planned-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Team",
  description: "Team page for Qatoto Creator Studio",
};

export default function StudioTeam() {
  return (
    <StudioPlannedPage
      title="Team"
      // Verbatim from this route's `site-roadmap.ts` entry — one description, two surfaces.
      summary="Who else can act on this account."
      whatItWillDo={[
        "Invite someone to act on your Studio account.",
        "Give each person a role that bounds what they can do.",
        "Show what each of them did.",
      ]}
      insteadFor={{
        label: "Research and Development",
        href: "/research-and-development",
        note: "Project teams \u2014 members, roles, applications and invites \u2014 are real today and live on the project itself, in",
      }}
    />
  );
}
