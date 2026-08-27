import type { Metadata } from "next";

import StudioTeamPage from "@/components/studio/team/team-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Team",
  description: "Collaborator credits on your videos",
};

// GRADUATED FROM `StudioPlannedPage` — but NOT into what that placeholder promised, and the
// difference is stated rather than glossed. The old summary was "Who else can act on this account",
// which is ACCOUNT-LEVEL DELEGATION: roles, access, revocation. **None of that exists** — there is
// no delegation primitive anywhere in the backend.
//
// What shipped is the collaborator CREDIT handshake. `video_collaborator.status` had
// `invited | accepted | declined` from the day the table existed and no route could write anything
// but `invited`; the person named could not even find out. Now they can confirm or decline, which
// makes a credit a record rather than a typed email address. It grants nothing, and the page says so.
//
// Account-level delegation stays open and is recorded in todo.md as the one genuine Studio feature
// still unbuilt.
export default function StudioTeam() {
  return <StudioTeamPage />;
}
