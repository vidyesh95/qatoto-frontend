import type { Metadata } from "next";

import { RfqQuoteComparisonPage } from "@/components/commerce/quote-comparison-page";
import { withSentinelValues } from "@/lib/static-params";

// Permanently dynamic: session-scoped and behind an organization membership.
export const instant = false;

/** Only the sentinel — an RFQ id is session-scoped and must not reach the build output. */
export function generateStaticParams() {
  return withSentinelValues([]).map((rfqId) => ({ rfqId }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Compare quotes",
  description: "Quotes on one request, side by side",
};

/**
 * THE CANONICAL COMPARISON ROUTE, because comparison is RFQ-scoped: `GET /commerce/rfqs/:rfqId/quotes` is
 * the only read behind it, and the quotes being compared are the answers to one requirement.
 *
 * `/store/quotes/[quoteId]/compare` also exists and resolves its way here in two round trips. Prefer this
 * one from every new link.
 */
export default async function RfqCompareRoute({ params }: { params: Promise<{ rfqId: string }> }) {
  const { rfqId } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:px-6">
      <RfqQuoteComparisonPage rfqId={rfqId} />
    </div>
  );
}
