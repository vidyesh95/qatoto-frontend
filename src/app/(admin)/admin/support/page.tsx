import type { Metadata } from "next";

import SupportCaseQueuePage from "@/components/admin/support/support-case-queue-page";

// Permanently dynamic: one capability-gated queue, a session-scoped client-query island.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Support cases · Admin",
  description:
    "People who wrote in about a payment, an order or their account, waiting for an answer",
};

export default function AdminSupportRoute() {
  return <SupportCaseQueuePage />;
}
