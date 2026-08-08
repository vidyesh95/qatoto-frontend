import type { Metadata } from "next";

import ServiceEngagementDetail from "@/components/commerce/service-engagement-detail";
import { withSentinelValues } from "@/lib/static-params";

// Permanently dynamic: session-scoped and behind an organization membership.
export const instant = false;

/** Only the sentinel — an engagement id is session-scoped and not enumerable. */
export function generateStaticParams() {
  return withSentinelValues([]).map((engagementId) => ({ engagementId }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Service engagement",
  description: "A service you are delivering on Qatoto",
};

export default async function ProviderServiceEngagementRoute({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  // The PROVIDER route. It gets `scheduled`, `in_progress` and `awaiting_buyer` — and never `completed`,
  // because acceptance is the buyer's.
  return (
    <div className="p-6">
      <ServiceEngagementDetail engagementId={engagementId} />
    </div>
  );
}
