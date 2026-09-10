import type { Metadata } from "next";

import StudioBlueprintsPage from "@/components/studio/blueprints/studio-blueprints-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "My Teardowns",
  description: "My Teardowns page for Qatoto Creator Studio",
};

export default function StudioMyTeardowns() {
  return <StudioBlueprintsPage />;
}
