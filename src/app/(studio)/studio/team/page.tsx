import type { Metadata } from "next";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Team",
  description: "Team page for Qatoto Creator Studio",
};

export default function StudioTeam() {
  return <h1>Team</h1>;
}
