import type { Metadata } from "next";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Pitches",
  description: "Pitches page for Qatoto Creator Studio",
};

export default function StudioPitches() {
  return <h1>Pitches</h1>;
}
