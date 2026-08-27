import type { Metadata } from "next";

import StudioCollaborationsPage from "@/components/studio/collaborations/collaborations-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Collaborations",
  description: "Collaborator credits on your videos",
};

// MOVED HERE FROM `/studio/team`, and the move is the point rather than a tidy-up.
//
// This page is the collaborator CREDIT handshake — YouTube's and Douyin's feature, "who worked on
// this video". It is a CHANNEL feature. It was sitting at `/studio/team`, inside the sidebar's
// **Product journey** section, between Pitches and Funding — a section whose own comment says it
// maps "pitch → team → fund". So the navigation promised the pipeline stage where a founder builds
// the team that builds the product, and delivered video credits instead.
//
// `/studio/team` now means that pipeline stage. This route keeps the credits, unchanged, under
// Channel where Comments and Copyright live.
//
// It still GRANTS NOBODY ANYTHING, which is the older note worth carrying forward: `/studio/team`'s
// original roadmap line read "who else can act on this account", which is account-level DELEGATION
// — roles, access, revocation. That does not exist anywhere in the backend, and this page never
// claimed it. What it does is let the person you named confirm or decline the credit, which is the
// difference between a claim and a record.
export default function StudioCollaborations() {
  return <StudioCollaborationsPage />;
}
