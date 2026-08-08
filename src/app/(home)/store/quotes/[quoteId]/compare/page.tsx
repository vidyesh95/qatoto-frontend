import type { Metadata } from "next";

import { QuoteScopedComparisonPage } from "@/components/commerce/quote-comparison-page";
import { withSentinelValues } from "@/lib/static-params";

// Permanently dynamic: session-scoped and behind an organization membership.
export const instant = false;

/** Only the sentinel — a quote id is session-scoped and must not reach the build output. */
export function generateStaticParams() {
  return withSentinelValues([]).map((quoteId) => ({ quoteId }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Compare quotes",
  description: "Quotes on one request, side by side",
};

/**
 * THE QUOTE-SCOPED COMPARISON, WHICH IS TWO ROUND TRIPS. There is no `GET /commerce/quotes/:id/quotes` —
 * comparison is RFQ-scoped — so reaching it from a quote id means resolving the quote to learn its `rfqId`
 * and then listing that RFQ's quotes.
 *
 * It is NOT a redirect, deliberately. Redirecting would need the `rfqId` before the page renders, which is
 * exactly the thing this route does not have; the resolution happens client-side inside the read. The page
 * links to the canonical `/store/rfqs/[rfqId]/compare` once it knows the id.
 */
export default async function QuoteCompareRoute({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:px-6">
      <QuoteScopedComparisonPage quoteId={quoteId} />
    </div>
  );
}
