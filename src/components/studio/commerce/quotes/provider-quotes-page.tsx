// TRANSPORT: client-query — the provider's own bids, keyset-paginated from the browser.
"use client";

// WHY THIS LIST EXISTS AT ALL, because "a quotes index" undersells it.
//
// Every other route into a quote needs an RFQ id first: `GET /commerce/rfqs/:rfqId/quotes` is
// RFQ-scoped, and the provider's RFQ queue lists the WORK rather than the BIDS — an RFQ leaves that
// queue when the buyer closes it, taking any quote on it out of reach. So a provider who priced a
// revision and closed the tab had no way back to it.
//
// **THIS IS THE ONLY READ ANYWHERE THAT YIELDS A DRAFT QUOTE'S ID.** That is what makes an abandoned
// quote recoverable, and it matters more than usual here: only one unsubmitted revision may exist per
// quote, so an unfinished one BLOCKS the next until it is submitted or discarded. A provider has to
// be able to find it before they can do either.
//
// `latestSubmittedRevision` IS NULL FOR A DRAFT-ONLY QUOTE, and it is rendered as an absence rather
// than as a zero. A quote nobody has submitted has no price, which is not the same as being free.

import Link from "next/link";

import { useProviderQuotesList } from "@/hooks/store/quotes";
import { formatCentsLabel } from "@/lib/store/format";
import { QUOTE_STATUS_LABELS } from "@/lib/store/quotes.schemas";

export default function ProviderQuotesPage() {
  const quotesList = useProviderQuotesList();

  if (quotesList.isLoadingFirstPage) {
    return <p className="text-sm text-muted-foreground">Loading your quotes…</p>;
  }

  if (quotesList.firstPageErrorMessage !== null) {
    return (
      <div className="rounded-xl border border-border p-5">
        <h1 className="text-base font-semibold text-foreground">Your quotes</h1>
        <p className="mt-2 text-sm text-muted-foreground">{quotesList.firstPageErrorMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <header className="pb-4">
        <h1 className="text-lg font-semibold text-foreground">Your quotes</h1>
        <p className="text-xs text-muted-foreground">
          Every bid your organization has authored, including ones you started and have not
          submitted.
        </p>
      </header>

      {quotesList.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You have not quoted anything yet.{" "}
          <Link href="/studio/rfqs" className="font-medium text-primary underline">
            Requests waiting for a quote
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {quotesList.rows.map((providerQuote) => (
            <li key={providerQuote.quoteId} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/studio/quotes/${providerQuote.quoteId}`}
                  className="text-sm font-medium text-foreground underline"
                >
                  {providerQuote.rfq.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {QUOTE_STATUS_LABELS[providerQuote.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {providerQuote.latestSubmittedRevision === null
                  ? // NOT "0.00". Nothing has been submitted, so there is no offered price to show.
                    `Revision ${providerQuote.latestRevisionNumber} is not submitted, so nothing has been offered yet.`
                  : `Revision ${providerQuote.latestSubmittedRevision.revisionNumber} — ${formatCentsLabel(
                      providerQuote.latestSubmittedRevision.totalInCents,
                      providerQuote.latestSubmittedRevision.currency,
                    )}`}
              </p>
              <Link
                href={`/studio/rfqs/${providerQuote.rfq.id}/quote`}
                className="mt-2 inline-block text-xs font-medium text-primary underline"
              >
                {providerQuote.latestSubmittedRevision === null
                  ? "Finish this quote"
                  : "Revise this quote"}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {quotesList.loadMoreErrorMessage !== null && (
        <p className="mt-3 text-xs text-destructive">{quotesList.loadMoreErrorMessage}</p>
      )}

      {quotesList.hasNextPage && (
        <button
          type="button"
          onClick={quotesList.loadNextPage}
          disabled={quotesList.isFetchingNextPage}
          className="mt-4 cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-60"
        >
          {quotesList.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
