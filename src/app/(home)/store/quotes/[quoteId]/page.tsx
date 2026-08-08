import type { Metadata } from "next";

import QuoteDetail from "@/components/commerce/quote-detail";
import { withSentinelValues } from "@/lib/static-params";

// Permanently dynamic: session-scoped and behind an organization membership.
export const instant = false;

/** Only the sentinel — a quote id is session-scoped and must not reach the build output. */
export function generateStaticParams() {
  return withSentinelValues([]).map((quoteId) => ({ quoteId }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Quote",
  description: "A quote you received on Qatoto",
};

export default async function BuyerQuoteRoute({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  // The BUYER route, chrome only. `QuoteDetail` reads the RFQ's `callerRelation` to decide whether the
  // accept and decline controls exist at all — a provider following a shared link here gets its own view,
  // because the route never asserts a role.
  return (
    <div className="mx-auto w-full max-w-3xl">
      <QuoteDetail quoteId={quoteId} />
    </div>
  );
}
