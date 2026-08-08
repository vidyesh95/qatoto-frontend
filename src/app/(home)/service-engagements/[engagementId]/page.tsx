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
  description: "A trade service engaged on one of your orders",
};

export default async function BuyerServiceEngagementRoute({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  // The BUYER route. `completed` — accepting the work — is only offered when the payload says the reader
  // is the buyer, which is what stops a provider signing off its own deliverable.
  return (
    <div className="mx-auto w-full max-w-3xl">
      <ServiceEngagementDetail engagementId={engagementId} />
    </div>
  );
}
