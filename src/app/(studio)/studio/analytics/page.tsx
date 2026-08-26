import type { Metadata } from "next";

import AnalyticsPage from "@/components/studio/analytics/analytics-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Analytics",
  description: "Analytics page for Qatoto Creator Studio",
};

export default function StudioAnalytics() {
  return <AnalyticsPage />;
}
