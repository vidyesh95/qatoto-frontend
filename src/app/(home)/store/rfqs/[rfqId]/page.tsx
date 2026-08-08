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
  description: "A request for quotation on Qatoto",
};

export default async function BuyerRfqRoute({ params }: { params: Promise<{ rfqId: string }> }) {
  const { rfqId } = await params;
  // The BUYER route. It supplies chrome only — `RfqDetail` reads `callerRelation` off the payload, so a
  // provider who follows a shared link here still gets the provider's view and no invitation list.
  return (
    <div className="mx-auto w-full max-w-3xl">
      <RfqDetail rfqId={rfqId} />
    </div>
  );
}
