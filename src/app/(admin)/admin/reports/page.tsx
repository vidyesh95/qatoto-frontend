import type { Metadata } from "next";

import VideoReportQueuePage from "@/components/admin/reports/video-report-queue-page";

// Permanently dynamic: one capability-gated queue, a session-scoped client-query island.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Video reports · Admin",
  description: "Videos that viewers have flagged, waiting for a moderator",
};

export default function AdminVideoReportsRoute() {
  return <VideoReportQueuePage />;
}
