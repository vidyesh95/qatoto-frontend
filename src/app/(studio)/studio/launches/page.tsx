import type { Metadata } from "next";

import StudioLaunchesPage from "@/components/studio/launches/studio-launches-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "My Launches",
  description: "My Launches page for Qatoto Creator Studio",
};

export default function StudioMyLaunches() {
  return <StudioLaunchesPage />;
}
