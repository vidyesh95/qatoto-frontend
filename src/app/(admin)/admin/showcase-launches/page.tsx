import type { Metadata } from "next";

import ShowcaseLaunchModerationPage from "@/components/admin/showcase-launches/showcase-launch-moderation-page";

// Permanently dynamic: capability-gated, a client-query island throughout.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Launches · Admin",
  description: "Showcase launches waiting for review",
};

export default function AdminShowcaseLaunchesRoute() {
  return <ShowcaseLaunchModerationPage />;
}
