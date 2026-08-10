import type { Metadata } from "next";

import CommunityModerationPage from "@/components/admin/community/community-moderation-page";

// Permanently dynamic: three capability-gated queues, all session-scoped client-query islands.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Community · Admin",
  description: "Forum threads, community reports and cofounder profiles waiting for review",
};

export default function AdminCommunityRoute() {
  return <CommunityModerationPage />;
}
