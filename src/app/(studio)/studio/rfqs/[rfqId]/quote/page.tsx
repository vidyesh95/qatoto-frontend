import type { Metadata } from "next";

import QuoteComposer from "@/components/studio/commerce/quotes/quote-composer";
import { withSentinelValues } from "@/lib/static-params";

// Permanently dynamic: session-scoped and behind a provider organization membership.
export const instant = false;

/** Only the sentinel — an RFQ id is session-scoped and must not reach the build output. */
export function generateStaticParams() {
  return withSentinelValues([]).map((rfqId) => ({ rfqId }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Quote this request",
  description: "Price a request for quotation on Qatoto",
};

/**
 * KEYED ON THE RFQ, NOT THE QUOTE, and that is the whole reason this sits under `[rfqId]`.
 *
 * The quote shell may not exist yet — it is minted on the first pricing attempt — so there is no
 * quote id to route by. The composer also needs the RFQ's own lines to produce `rfqProductLineId`
 * and `rfqServiceLineId` at all. And since exactly one quote exists per provider per RFQ, the RFQ id
 * is a complete key for both "first quote" and "next revision".
 */
export default async function ProviderQuoteComposerRoute({
  params,
}: {
  params: Promise<{ rfqId: string }>;
}) {
  const { rfqId } = await params;
  return (
    <div className="p-6">
      <QuoteComposer rfqId={rfqId} />
    </div>
  );
}
