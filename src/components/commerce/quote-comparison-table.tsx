// TRANSPORT: props-only — renders the comparison rows it is handed, no network.
//
// Quotes against ONE RFQ, side by side. Mounted three ways: as a tab on the RFQ detail, as the body of
// `/store/rfqs/[rfqId]/compare`, and — via a resolved `rfqId` — as `/store/quotes/[quoteId]/compare`.
//
// FOUR THINGS IT REFUSES TO DO, and they are the reason it exists as its own component:
//
//  1. IT NEVER PICKS A WINNER. No "best value", no cheapest highlight, no score. The totals are not
//     comparable in general — see 2 and 3 — and a platform that ranked them would be making a commercial
//     recommendation it has no basis for and no liability appetite for.
//  2. IT NEVER SUMS OR CONVERTS ACROSS CURRENCIES. Two quotes in USD and EUR have no common total, and
//     converting without an FX quote invents a rate. Quotes are GROUPED by currency so the eye compares
//     only what is comparable, and a mixed set says so in words.
//  3. IT NEVER TREATS A NULL REVISION AS ZERO. `latestSubmittedRevision: null` means that provider has a
//     draft and has submitted nothing — rendering `$0` would put the cheapest-looking row against someone
//     who has not quoted.
//  4. IT NEVER HIDES A NON-ACCEPTABLE QUOTE. An expired quote often carries the lowest number on the page,
//     and dropping it would leave the buyer wondering where a figure they remember went. It renders with
//     its status, and the status is why the number is not an option.

import Link from "next/link";

import ProviderKindBadge from "@/components/commerce/shared/provider-kind-badge";
import { formatCentsLabel, formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";
import {
  isQuoteActionable,
  QUOTE_STATUS_LABELS,
  type QuoteComparisonItem,
} from "@/lib/store/quotes.schemas";

export default function QuoteComparisonTable({
  quotes,
  emptyMessage,
}: {
  quotes: readonly QuoteComparisonItem[];
  emptyMessage: string;
}) {
  if (quotes.length === 0) {
    return <p className="text-xs leading-4 text-muted-foreground">{emptyMessage}</p>;
  }

  // Grouped by currency, with the unpriced ones held out — see rules 2 and 3. `Map` preserves insertion
  // order, so the first currency the server sent stays first rather than being alphabetised into a
  // different reading order.
  const quotesByCurrency = new Map<string, QuoteComparisonItem[]>();
  const unpricedQuotes: QuoteComparisonItem[] = [];

  for (const quote of quotes) {
    const revision = quote.latestSubmittedRevision;
    if (revision === null) {
      unpricedQuotes.push(quote);
      continue;
    }
    const existing = quotesByCurrency.get(revision.currency);
    if (existing === undefined) quotesByCurrency.set(revision.currency, [quote]);
    else existing.push(quote);
  }

  const currencyCount = quotesByCurrency.size;

  return (
    <div className="space-y-4">
      {currencyCount > 1 && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-4 text-muted-foreground">
          These quotes are priced in {formatCountLabel(currencyCount)} different currencies. They
          are grouped below because the totals are not comparable to each other, and Qatoto does not
          convert between them.
        </p>
      )}

      {[...quotesByCurrency.entries()].map(([currency, currencyQuotes]) => (
        <section key={currency} aria-label={`Quotes in ${currency}`}>
          {currencyCount > 1 && (
            <h3 className="pb-2 text-xs font-medium tracking-[0.5px] text-muted-foreground uppercase">
              Priced in {currency}
            </h3>
          )}
          <ul className="space-y-2">
            {currencyQuotes.map((quote) => (
              <li key={quote.quoteId}>
                <QuoteComparisonRow quote={quote} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {unpricedQuotes.length > 0 && (
        <section aria-label="Quotes with nothing submitted">
          <h3 className="pb-2 text-xs font-medium tracking-[0.5px] text-muted-foreground uppercase">
            Nothing submitted yet
          </h3>
          <ul className="space-y-2">
            {unpricedQuotes.map((quote) => (
              <li key={quote.quoteId}>
                <QuoteComparisonRow quote={quote} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Said once, at the foot, rather than beside every number. */}
      <p className="text-[11px] leading-4 text-muted-foreground">
        Qatoto does not rank these or recommend one. Read the exclusions and lead times on each
        quote — the lowest total is often the one that excludes the most.
      </p>
    </div>
  );
}

function QuoteComparisonRow({ quote }: { quote: QuoteComparisonItem }) {
  const revision = quote.latestSubmittedRevision;
  const isActionable = isQuoteActionable(quote.status);

  return (
    <Link
      href={`/store/quotes/${quote.quoteId}`}
      className="block rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-sm leading-5 font-medium text-foreground">
          {quote.provider.displayName}
        </p>
        {revision === null ? (
          // NOT `$0`. A provider with only a draft has submitted no price at all.
          <span className="text-xs leading-4 text-muted-foreground">No price submitted</span>
        ) : (
          <span className="text-sm leading-5 font-medium text-foreground">
            {formatCentsLabel(revision.totalInCents, revision.currency)}
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-4 text-muted-foreground">
        <span>{QUOTE_STATUS_LABELS[quote.status]}</span>
        {revision !== null && <span>Revision {formatCountLabel(revision.revisionNumber)}</span>}
        {revision !== null && (
          <span>Valid to {formatIsoInstantLabel(revision.validityDeadlineAt)}</span>
        )}
      </div>

      {/* A non-actionable quote keeps its number and gains the reason it is not an option. An expired
          quote is frequently the cheapest thing on the page, and silently dropping it would read as the
          figure having disappeared.

          `accepted` GETS ITS OWN SENTENCE. It is non-actionable like the others, but "cannot be accepted —
          accepted" is nonsense, and on an awarded RFQ this row is the outcome rather than a rejected
          option. */}
      {!isActionable && revision !== null && (
        <p className="mt-1 text-[11px] leading-4 text-amber-900">
          {quote.status === "accepted"
            ? "This is the quote that was accepted. An order was created from it."
            : `This total cannot be accepted — ${QUOTE_STATUS_LABELS[quote.status].toLowerCase()}.`}
        </p>
      )}

      {revision !== null && <MoneyBreakdown revision={revision} />}

      {quote.serviceLineSummaries.length > 0 && (
        <ul className="mt-2 space-y-1">
          {quote.serviceLineSummaries.map((line) => (
            <li
              key={`${quote.quoteId}-${line.titleSnapshot}`}
              className="flex flex-wrap items-baseline gap-x-2 text-[11px] leading-4"
            >
              <ProviderKindBadge providerKind={line.providerKind} isCompact />
              <span className="min-w-0 flex-1 text-muted-foreground">{line.titleSnapshot}</span>
              <span className="text-foreground">
                {revision === null
                  ? // A fee with no submitted revision has no currency to format it in — the fee lives on
                    // the line, the currency on the revision, so without one the other is unrenderable.
                    "—"
                  : formatCentsLabel(line.feeInCents, revision.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {quote.productLineSummaries.length > 0 && (
        <ul className="mt-2 space-y-1">
          {quote.productLineSummaries.map((line) => (
            <li
              key={`${quote.quoteId}-${line.titleSnapshot}`}
              className="flex flex-wrap items-baseline gap-x-2 text-[11px] leading-4"
            >
              <span className="min-w-0 flex-1 text-muted-foreground">
                {line.titleSnapshot} × {formatCountLabel(line.quantity)}
              </span>
              <span className="text-foreground">
                {revision === null
                  ? "—"
                  : formatCentsLabel(line.lineTotalInCents, revision.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

function MoneyBreakdown({
  revision,
}: {
  revision: NonNullable<QuoteComparisonItem["latestSubmittedRevision"]>;
}) {
  // Only the components that are non-zero. A row of five `$0` lines buries the two figures that differ
  // between quotes, and on a comparison the differences are the whole content.
  const components: { readonly label: string; readonly amountInCents: number }[] = [
    { label: "Subtotal", amountInCents: revision.subtotalInCents },
    { label: "Tax", amountInCents: revision.taxInCents },
    { label: "Fee", amountInCents: revision.serviceFeeInCents },
    { label: "Freight", amountInCents: revision.shippingInCents },
    { label: "Discount", amountInCents: revision.discountInCents },
  ].filter((component) => component.amountInCents !== 0);

  if (components.length <= 1) return null;

  return (
    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
      {components
        .map(
          (component) =>
            `${component.label} ${formatCentsLabel(component.amountInCents, revision.currency)}`,
        )
        .join(" · ")}
    </p>
  );
}
