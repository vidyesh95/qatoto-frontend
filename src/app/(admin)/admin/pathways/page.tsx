import type { Metadata } from "next";

import PathwayModerationPage from "@/components/admin/pathways/pathway-moderation-page";

// Permanently dynamic: capability-gated, a client-query island throughout.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Curated sets · Admin",
  description: "Curated product sets waiting for review",
};

export default function AdminPathwaysRoute() {
  return <PathwayModerationPage />;
}
