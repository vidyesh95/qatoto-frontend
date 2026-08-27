import type { Metadata } from "next";

import PitchComposer from "@/components/studio/pitches/pitch-composer";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "New pitch",
  description: "Write a pitch for a venture you founded",
};

export default function NewPitch() {
  return <PitchComposer />;
}
