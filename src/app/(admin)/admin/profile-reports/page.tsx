import type { Metadata } from "next";

import ProfileReportQueuePage from "@/components/admin/user-reports/profile-report-queue-page";

// Permanently dynamic: one capability-gated queue, a session-scoped client-query island.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Profile reports · Admin",
  description: "Channel descriptions and links that viewers have flagged, waiting for a moderator",
};

export default function AdminProfileReportsRoute() {
  return <ProfileReportQueuePage />;
}
