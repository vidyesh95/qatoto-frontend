import type { Metadata } from "next";

import FeedbackQueuePage from "@/components/admin/feedback/feedback-queue-page";

// Permanently dynamic: one capability-gated queue, a session-scoped client-query island.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Site feedback · Admin",
  description: "What people say about Qatoto itself, and whether anybody has looked",
};

export default function AdminFeedbackRoute() {
  return <FeedbackQueuePage />;
}
