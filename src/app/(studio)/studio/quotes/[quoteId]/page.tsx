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
  description: "A quote you submitted on Qatoto",
};

export default async function ProviderQuoteRoute({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  // The PROVIDER route. Same component: it offers withdraw instead of accept because the RFQ read says the
  // caller is a provider, not because this file is under `/studio`.
  return (
    <div className="p-6">
      <QuoteDetail quoteId={quoteId} />
    </div>
  );
}
