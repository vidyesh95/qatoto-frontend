// TRANSPORT: client-query — reads the quotes on one RFQ.
"use client";

// THE TWO WAYS INTO ONE COMPARISON. `/store/rfqs/[rfqId]/compare` is CANONICAL;
// `/store/quotes/[quoteId]/compare` resolves the quote's `rfqId` and renders the same body.
//
// TWO COMPONENTS, ONE BODY, and the duplication is required rather than sloppy: each entry point calls a
// different hook, hooks cannot be called conditionally, so a single component taking
// `{rfqId} | {quoteId}` would have to call both and fire a read it does not need. The shared body is
// `ComparisonBody` below and neither entry point renders anything else.
//
// THE QUOTE-SCOPED ROUTE IS TWO ROUND TRIPS BY CONSTRUCTION — resolve the quote, then list its RFQ's
// quotes. It exists so a link someone already holds does not 404, and it says where the canonical page is
// rather than pretending it is the same thing.
//
// WHAT THIS PAGE IS DEPENDS ON WHO IS READING IT, and the server already decided: a buyer's rows are every
// non-draft quote on the RFQ, a provider's rows are only its own. The frontend cannot tell which happened —
// there is no `callerRelation` on this read — so the copy must be true of both. It says "the quotes you can
// see", never "all quotes", and the table never calls a single row a comparison.

import Link from "next/link";

import QuoteComparisonTable from "@/components/commerce/quote-comparison-table";
import StatusPanel from "@/components/home/shared/status-panel";
import { useQuoteComparisonByQuoteQuery, useQuoteComparisonQuery } from "@/hooks/store/quotes";
import type { QuoteComparisonItem } from "@/lib/store/quotes.schemas";

const EMPTY_MESSAGE =
  "There are no quotes to show on this request. A request that has not been opened cannot have any.";

/** The canonical entry point: `/store/rfqs/[rfqId]/compare`. */
export function RfqQuoteComparisonPage({ rfqId }: { rfqId: string }) {
  const comparisonQuery = useQuoteComparisonQuery(rfqId);
  const result = comparisonQuery.data;

  return (
    <ComparisonBody
      isPending={comparisonQuery.isPending}
      hasThrown={comparisonQuery.isError}
      quotes={result !== undefined && result.success ? result.data : null}
      errorMessage={result !== undefined && !result.success ? result.error.message : null}
      backHref={`/store/rfqs/${rfqId}`}
    />
  );
}

/** The quote-scoped entry point: `/store/quotes/[quoteId]/compare`. Resolves the RFQ first. */
export function QuoteScopedComparisonPage({ quoteId }: { quoteId: string }) {
  const comparisonQuery = useQuoteComparisonByQuoteQuery(quoteId);
  const result = comparisonQuery.data;
  const resolved = result !== undefined && result.success ? result.data : null;

  return (
    <ComparisonBody
      isPending={comparisonQuery.isPending}
      hasThrown={comparisonQuery.isError}
      quotes={resolved === null ? null : resolved.quotes}
      errorMessage={result !== undefined && !result.success ? result.error.message : null}
      backHref={`/store/quotes/${quoteId}`}
      // Only available once the read resolved — the whole point of this route is that the RFQ id was not
      // known when it was requested.
      canonicalHref={resolved === null ? null : `/store/rfqs/${resolved.rfqId}/compare`}
    />
  );
}

function ComparisonBody({
  isPending,
  hasThrown,
  quotes,
  errorMessage,
  backHref,
  canonicalHref = null,
}: {
  isPending: boolean;
  hasThrown: boolean;
  quotes: readonly QuoteComparisonItem[] | null;
  errorMessage: string | null;
  backHref: string;
  canonicalHref?: string | null;
}) {
  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading quotes…</p>;
  }

  // A 404 HERE IS NOT ALWAYS "MISSING". `listQuotesForRfq` answers 404 to a provider with no quote and no
  // visibility on the RFQ, deliberately, so the endpoint cannot be used to probe which RFQs exist. The
  // backend's own message is rendered rather than replaced with "not found" — it is the only party that
  // knows which of the two happened, and this page must not guess.
  if (errorMessage !== null) {
    return <StatusPanel message={errorMessage} className="border border-border px-6 py-16" />;
  }
  if (hasThrown || quotes === null) {
    return (
      <StatusPanel
        message="Couldn't load the quotes on this request."
        className="border border-border px-6 py-16"
      />
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
          Quotes side by side
        </h1>
        {/* "YOU CAN SEE", not "all". A provider reading this route gets only its own quote, and this page
            cannot tell that it did. */}
        <p className="mt-0.5 text-sm text-muted-foreground">
          The quotes on this request that you can see.
        </p>
        <Link
          href={backHref}
          className="mt-1 inline-block text-xs font-medium text-primary underline"
        >
          Back
        </Link>
        {canonicalHref !== null && (
          <Link
            href={canonicalHref}
            className="mt-1 ml-3 inline-block text-xs font-medium text-primary underline"
          >
            Open the request&apos;s own comparison
          </Link>
        )}
      </header>

      <QuoteComparisonTable quotes={quotes} emptyMessage={EMPTY_MESSAGE} />
    </div>
  );
}
