import type { Metadata } from "next";

import StudioTeamPage from "@/components/studio/team/team-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Team",
  description: "Who wants to build with you, across every venture you run",
};

// ⚠️ THIS ROUTE CHANGED WHAT IT MEANS, and the old meaning did not disappear — it moved.
//
// It used to serve YouTube-style video-collaborator credits, which now live at
// `/studio/collaborations` under Channel, unchanged. `/studio/team` sits in the sidebar's
// **Product journey** section between Pitches and Funding, and that section's own comment says
// it maps "pitch → team → fund". So the navigation promised the pipeline stage where a founder
// assembles the people who build the product, and delivered video credits instead.
//
// It is now that stage, and specifically the half that existed nowhere: the team-building domain
// is entirely PER PROJECT, so a founder running three ventures opened three project pages to
// answer "who wants to join". `GET /applications/received` is the cross-venture read that closes
// it — the same gap, and the same answer, as `GET /funding-rounds/mine` for funding rounds.
//
// The WRITES stayed in R&D. Accept and decline call the project-scoped route because that
// transaction locks the role row to serialize two maintainers taking the last seat.
export default function StudioTeam() {
  return <StudioTeamPage />;
}
