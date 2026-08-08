import type { Metadata } from "next";

import RfqDetail from "@/components/commerce/rfq-detail";
import { withSentinelValues } from "@/lib/static-params";

// Permanently dynamic: session-scoped and behind an organization membership.
export const instant = false;

/** Only the sentinel — an RFQ id is session-scoped and must not reach the build output. */
export function generateStaticParams() {
  return withSentinelValues([]).map((rfqId) => ({ rfqId }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Request for quotation",
  description: "A request for quotation you can answer on Qatoto",
};

export default async function ProviderRfqRoute({ params }: { params: Promise<{ rfqId: string }> }) {
  const { rfqId } = await params;
  // The PROVIDER route. Same component — it reads `callerRelation`, so the buyer's open/close controls and
  // the invitation list are absent here without this route saying anything about them.
  return (
    <div className="p-6">
      <RfqDetail rfqId={rfqId} />
    </div>
  );
}
