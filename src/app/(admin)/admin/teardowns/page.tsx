import type { Metadata } from "next";

import TeardownModerationPage from "@/components/admin/teardowns/teardown-moderation-page";

// Permanently dynamic: capability-gated, a client-query island throughout.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Teardowns · Admin",
  description: "Teardown submissions waiting for review",
};

export default function AdminTeardownsRoute() {
  return <TeardownModerationPage />;
}
