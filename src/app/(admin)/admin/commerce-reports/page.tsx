import type { Metadata } from "next";

import CommerceModerationPage from "@/components/admin/commerce-reports/commerce-moderation-page";

// Permanently dynamic: capability-gated, a client-query island throughout.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Store reports · Admin",
  description: "Buyer reports on listings, reviews, questions, answers and companies",
};

export default function AdminCommerceReportsRoute() {
  return <CommerceModerationPage />;
}
