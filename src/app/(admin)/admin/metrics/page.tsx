import type { Metadata } from "next";
import PlatformMetricsPage from "@/components/admin/metrics/platform-metrics-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// No `robots` here: the (admin) layout already carries `index: false, follow: false` for the whole
// group, and Next merges metadata per-field down the segment chain.
export const metadata: Metadata = {
  title: "Metrics",
  description: "Qatoto platform activity and watch-time metrics",
};

export default function AdminMetricsPage() {
  return <PlatformMetricsPage />;
}
