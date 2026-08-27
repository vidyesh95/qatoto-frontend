// TRANSPORT: client-query — reads the quote and its RFQ.
"use client";

// ONE QUOTE, SEEN FROM EITHER SIDE. Mounted by `/store/quotes/[quoteId]` and `/studio/quotes/[quoteId]`.
//
// IT READS THE RFQ TOO, AND THAT IS NOT CONVENIENCE. `QuoteDetailProjection` carries
// `providerOrganizationId` and `rfqId` and NOTHING saying which side the caller is. The provider side could
// be derived by comparing ids; the BUYER side cannot, because the buyer organization lives on the RFQ. The
// RFQ read states `callerRelation` outright, so the page uses that — and it wants the RFQ's title and
// deadline anyway.
//
// THE ACCEPT FLOW IS THE MOST CONSEQUENTIAL CONTROL IN THE STORE, and three things make it safe:
//
//  1. `expectedRevision` IS THE REVISION ON SCREEN. Not `latestRevisionNumber` read fresh at click time —
//     the number the buyer was LOOKING AT. If the provider appended since, the server answers
//     `REVISION_CHANGED` and accepts nothing, which is correct: accepting terms nobody read is exactly what
//     an immutable record must not be built from.
//  2. THE IDEMPOTENCY KEY IS MINTED ONCE PER ATTEMPT, in this component's state, and reused across retries.
//     A fresh key per retry is a second acceptance.
//  3. A `REVISION_CHANGED` 409 IS RENDERED AS A FINDING, with the new number and an instruction to reload —
//     never as a retryable error, and never auto-retried with a bumped number.
//
// `acceptedRevisionNumber` IS NOT `latestRevisionNumber`. A buyer accepts a specific snapshot and the
// provider may append afterwards, so an accepted quote can show revision 3 as latest while the ORDER is
// bound to revision 2. The page says which is which rather than showing the newest as "the agreed terms".

import { useState } from "react";

import Link from "next/link";

import DefinitionList, {
  type DefinitionListItem,
} from "@/components/commerce/shared/definition-list";
import ProviderKindBadge from "@/components/commerce/shared/provider-kind-badge";
import QuoteServiceDetailPanel from "@/components/commerce/sections/quote-service-detail-panel";
import StatusPanel from "@/components/home/shared/status-panel";
import TabStrip from "@/components/home/shared/tab-strip";
import {
  useAcceptQuote,
  useDeclineQuote,
  useQuoteQuery,
  useWithdrawQuote,
} from "@/hooks/store/quotes";
import { useRfqQuery } from "@/hooks/store/rfqs";
import { newIdempotencyKey } from "@/lib/idempotency";
import {
  formatCentsLabel,
  formatCountLabel,
  formatIsoInstantLabel,
  formatOptionalIsoInstantLabel,
} from "@/lib/store/format";
import {
  isQuoteActionable,
  isQuoteWithdrawable,
  QUOTE_STATUS_LABELS,
  type QuoteDetail as QuoteDetailValue,
  type QuoteProductLine,
  type QuoteRevision,
  type QuoteServiceLine,
} from "@/lib/store/quotes.schemas";
import type { RfqCallerRelation } from "@/lib/store/rfqs.schemas";

export default function QuoteDetail({ quoteId }: { quoteId: string }) {
  const quoteQuery = useQuoteQuery(quoteId);
  const quoteResult = quoteQuery.data;
  const rfqId = quoteResult !== undefined && quoteResult.success ? quoteResult.data.rfqId : "";

  // Dependent read: the RFQ id comes off the quote, so this cannot start until the quote resolves. The
  // hook is gated on a non-empty id, so the first render fires nothing rather than requesting
  // `/commerce/rfqs/` — see `useRfqQuery`.
  const rfqQuery = useRfqQuery(rfqId);

  if (quoteQuery.isPending) {
    return <p className="px-4 pt-6 text-sm text-muted-foreground lg:px-6">Loading quote…</p>;
  }
  if (quoteResult === undefined || quoteQuery.isError) {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel
          message="Couldn't load this quote."
          className="border border-border px-6 py-16"
        />
      </div>
    );
  }
  if (!quoteResult.success) {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel
          message={quoteResult.error.message}
          className="border border-border px-6 py-16"
        />
      </div>
    );
  }

  const quote = quoteResult.data;
  const rfqResult = rfqQuery.data;

  // The RFQ read is what tells us the caller's side. If it has not answered yet, the page renders the quote
  // WITHOUT actions rather than guessing — a wrong action here accepts a commercial commitment.
  const callerRelation: RfqCallerRelation | null =
    rfqResult !== undefined && rfqResult.success ? rfqResult.data.callerRelation : null;

  const rfqTitle = rfqResult !== undefined && rfqResult.success ? rfqResult.data.title : null;

  return (
    <QuoteBody
      quote={quote}
      callerRelation={callerRelation}
      rfqTitle={rfqTitle}
      isRelationPending={rfqQuery.isPending}
    />
  );
}

function QuoteBody({
  quote,
  callerRelation,
  rfqTitle,
  isRelationPending,
}: {
  quote: QuoteDetailValue;
  callerRelation: RfqCallerRelation | null;
  rfqTitle: string | null;
  isRelationPending: boolean;
}) {
  const acceptQuote = useAcceptQuote();
  const declineQuote = useDeclineQuote();
  const withdrawQuote = useWithdrawQuote();

  // MINTED ONCE, when the component mounts and the attempt begins — held in state so every retry of this
  // acceptance carries the same key. Minting it inside the click handler would give each press a new one,
  // which is the duplicate-acceptance bug idempotency exists to stop.
  const [idempotencyKey] = useState(() => newIdempotencyKey());

  const isBuyer = callerRelation === "buyer";
  const isProvider = callerRelation === "invited_provider" || callerRelation === "matched_provider";

  const revision = quote.latestRevision;

  const terms: DefinitionListItem[] = [
    { term: "Status", value: QUOTE_STATUS_LABELS[quote.status] },
    { term: "Latest revision", value: formatCountLabel(quote.latestRevisionNumber) },
    // ONLY ONCE SOMETHING WAS ACCEPTED, for the same reason as the lifecycle rows below: "Accepted
    // revision — Not provided" on a quote nobody accepted reads as a missing field rather than as an
    // acceptance that never happened. When it IS set it is NOT necessarily the latest, which is the whole
    // reason it gets its own row and its own sentence.
    ...(quote.acceptedRevisionNumber === null
      ? []
      : [
          {
            term: "Accepted revision",
            value: `${formatCountLabel(quote.acceptedRevisionNumber)} — this is what the order is bound to`,
          },
        ]),
    // ONLY THE LIFECYCLE EVENTS THAT HAPPENED. These five timestamps are mutually exclusive outcomes, so
    // four of them are null on every quote — and `DefinitionList` renders a null as "Not provided", which
    // beside a stated `Accepted` status reads as five half-answers instead of one. Nothing is hidden: the
    // status line above says what became of the quote, and a timestamp that is absent is an event that did
    // not occur rather than a value the server failed to send.
    ...lifecycleTimestampItems(quote),
    ...(revision === null
      ? []
      : [
          { term: "Valid until", value: formatIsoInstantLabel(revision.validityDeadlineAt) },
          { term: "Payment terms", value: revision.paymentTerms },
          { term: "Incoterm", value: revision.incoterm },
          { term: "Provider notes", value: revision.notes },
        ]),
  ];

  const acceptResult = acceptQuote.data;
  const declineResult = declineQuote.data;
  const withdrawResult = withdrawQuote.data;

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
          {isProvider ? "Quote you submitted" : "Quote you received"}
        </p>
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
          {revision === null
            ? "No revision submitted yet"
            : formatCentsLabel(revision.totalInCents, revision.currency)}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{QUOTE_STATUS_LABELS[quote.status]}</p>

        {rfqTitle !== null && (
          <Link
            href={isProvider ? `/studio/rfqs/${quote.rfqId}` : `/store/rfqs/${quote.rfqId}`}
            className="mt-1 inline-block text-xs font-medium text-primary underline"
          >
            Against: {rfqTitle}
          </Link>
        )}

        {/* Comparison is RFQ-SCOPED, so the link goes to the canonical route rather than a quote-scoped
            one that would need two reads to answer the same question. */}
        {isBuyer && (
          <Link
            href={`/store/rfqs/${quote.rfqId}/compare`}
            className="mt-1 ml-3 inline-block text-xs font-medium text-primary underline"
          >
            Compare all quotes on this request
          </Link>
        )}
      </header>

      <TabStrip
        ariaLabel="Quote sections"
        initialTabId="lines"
        tabs={[
          {
            id: "lines",
            label: "What is quoted",
            ...(revision === null
              ? {}
              : {
                  badge: formatCountLabel(
                    revision.productLines.length + revision.serviceLines.length,
                  ),
                }),
            panel: <QuoteLines revision={revision} />,
          },
          {
            id: "terms",
            label: "Terms",
            panel: (
              <div className="space-y-4 px-4 pb-4 lg:px-6">
                <DefinitionList items={terms} />
                {revision !== null && <MoneyBreakdown revision={revision} />}

                {isRelationPending && (
                  <p className="text-xs leading-4 text-muted-foreground">
                    Checking your role on this request before showing any actions…
                  </p>
                )}

                {isBuyer && revision !== null && (
                  <BuyerQuoteActions
                    quote={quote}
                    revision={revision}
                    isBusy={acceptQuote.isPending || declineQuote.isPending}
                    onAccept={() =>
                      acceptQuote.mutate({
                        quoteId: quote.id,
                        // THE REVISION ON SCREEN, which is the one the buyer read.
                        expectedRevision: revision.revisionNumber,
                        idempotencyKey,
                      })
                    }
                    onDecline={() => declineQuote.mutate({ quoteId: quote.id })}
                    errorMessage={
                      acceptResult !== undefined && !acceptResult.success
                        ? acceptResult.error.message
                        : declineResult !== undefined && !declineResult.success
                          ? declineResult.error.message
                          : null
                    }
                    errorCode={
                      acceptResult !== undefined && !acceptResult.success
                        ? acceptResult.error.code
                        : null
                    }
                    hasThrown={acceptQuote.isError}
                  />
                )}

                {isProvider && (
                  <ProviderQuoteActions
                    quote={quote}
                    isBusy={withdrawQuote.isPending}
                    onWithdraw={() => withdrawQuote.mutate({ quoteId: quote.id })}
                    errorMessage={
                      withdrawResult !== undefined && !withdrawResult.success
                        ? withdrawResult.error.message
                        : null
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

/** The lifecycle timestamps that carry a value, in the order they can occur. */
function lifecycleTimestampItems(quote: QuoteDetailValue): DefinitionListItem[] {
  const events: { readonly term: string; readonly at: string | null }[] = [
    { term: "Submitted", at: quote.submittedAt },
    { term: "Accepted", at: quote.acceptedAt },
    { term: "Declined", at: quote.declinedAt },
    { term: "Withdrawn", at: quote.withdrawnAt },
    { term: "Expired", at: quote.expiredAt },
  ];

  return events
    .filter((event) => event.at !== null)
    .map((event) => ({ term: event.term, value: formatOptionalIsoInstantLabel(event.at) }));
}

function QuoteLines({ revision }: { revision: QuoteRevision | null }) {
  if (revision === null) {
    return (
      <p className="px-4 pb-4 text-xs leading-4 text-muted-foreground lg:px-6">
        This provider opened a quote and has not submitted a revision. There is nothing priced yet.
      </p>
    );
  }

  return (
    <div className="space-y-4 px-4 pb-4 lg:px-6">
      {revision.productLines.length > 0 && (
        <section aria-label="Goods quoted">
          <h2 className="pb-2 text-sm font-medium text-foreground">Goods</h2>
          <ul className="space-y-2">
            {revision.productLines.map((line) => (
              <li key={line.id}>
                <ProductLineRow line={line} currency={revision.currency} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {revision.serviceLines.length > 0 && (
        <section aria-label="Services quoted">
          <h2 className="pb-2 text-sm font-medium text-foreground">Services</h2>
          <ul className="space-y-3">
            {revision.serviceLines.map((line) => (
              <li key={line.id}>
                <ServiceLineRow line={line} currency={revision.currency} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProductLineRow({ line, currency }: { line: QuoteProductLine; currency: string }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-sm leading-5 font-medium text-foreground">{line.titleSnapshot}</p>
      <p className="text-xs leading-4 text-muted-foreground">{line.specificationSnapshot}</p>
      <p className="mt-1 text-sm leading-5 text-foreground">
        {formatCentsLabel(line.lineTotalInCents, currency)}
        <span className="ml-1.5 text-xs text-muted-foreground">
          {formatCountLabel(line.quantity)} × {formatCentsLabel(line.unitPriceInCents, currency)}
        </span>
      </p>
      <LineTerms leadTimeDays={line.leadTimeDays} exclusions={line.exclusionsSnapshot} />
    </div>
  );
}

function ServiceLineRow({ line, currency }: { line: QuoteServiceLine; currency: string }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <ProviderKindBadge providerKind={line.providerKind} isCompact />
      <p className="mt-1 text-sm leading-5 font-medium text-foreground">{line.titleSnapshot}</p>
      <p className="text-xs leading-4 text-muted-foreground">{line.scopeSnapshot}</p>
      <p className="mt-1 text-sm leading-5 text-foreground">
        {formatCentsLabel(line.feeInCents, currency)}
      </p>

      <LineTerms leadTimeDays={line.leadTimeDays} exclusions={line.exclusionsSnapshot} />

      {line.serviceDetail !== null && (
        <div className="mt-2">
          <QuoteServiceDetailPanel detail={line.serviceDetail} />
        </div>
      )}

      {line.deliverables.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] leading-4 font-medium tracking-[0.4px] text-muted-foreground uppercase">
            Deliverables
          </p>
          <ul className="mt-1 space-y-0.5">
            {line.deliverables.map((deliverable) => (
              <li key={deliverable.id} className="text-xs leading-4 text-foreground">
                {deliverable.title}
                {/* Required vs optional changes what the buyer is owed. A REQUIRED deliverable with no due
                    date is still owed — stated as "no date agreed" rather than dropped, because dropping it
                    would lose the obligation along with the date. */}
                <span className="text-muted-foreground">
                  {deliverable.isRequired ? " · required" : " · optional"}
                  {deliverable.dueAt === null
                    ? " · no date agreed"
                    : ` · due ${formatIsoInstantLabel(deliverable.dueAt)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LineTerms({
  leadTimeDays,
  exclusions,
}: {
  leadTimeDays: number | null;
  exclusions: string | null;
}) {
  return (
    <>
      {leadTimeDays !== null && (
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Lead time {formatCountLabel(leadTimeDays)} {leadTimeDays === 1 ? "day" : "days"}
        </p>
      )}
      {/* EXCLUSIONS ARE THE MOST IMPORTANT LINE ON A QUOTE and the easiest to bury, because they are the
          reason one total is lower than another. Null means the provider stated none — which is not the
          same as nothing being excluded, and is said as such rather than left blank. */}
      <p className="mt-1 text-xs leading-4 text-amber-900">
        {exclusions === null ? "No exclusions stated by the provider." : `Excludes: ${exclusions}`}
      </p>
    </>
  );
}

function MoneyBreakdown({ revision }: { revision: QuoteRevision }) {
  return (
    <dl className="space-y-1 rounded-xl border border-border px-4 py-3">
      <MoneyRow
        label="Subtotal"
        amountInCents={revision.subtotalInCents}
        currency={revision.currency}
      />
      <MoneyRow label="Tax" amountInCents={revision.taxInCents} currency={revision.currency} />
      <MoneyRow
        label="Service fee"
        amountInCents={revision.serviceFeeInCents}
        currency={revision.currency}
      />
      {/* Freight CAN be non-zero here, unlike on a checkout total — a provider typing a figure onto a quote
          is the only way a real freight amount enters this system. */}
      <MoneyRow
        label="Freight"
        amountInCents={revision.shippingInCents}
        currency={revision.currency}
      />
      <MoneyRow
        label="Discount"
        amountInCents={revision.discountInCents}
        currency={revision.currency}
      />
      <div className="flex items-baseline justify-between gap-4 border-t border-border pt-1">
        <dt className="text-sm leading-5 font-medium text-foreground">Total</dt>
        <dd className="text-sm leading-5 font-medium text-foreground">
          {formatCentsLabel(revision.totalInCents, revision.currency)}
        </dd>
      </div>
    </dl>
  );
}

function MoneyRow({
  label,
  amountInCents,
  currency,
}: {
  label: string;
  amountInCents: number;
  currency: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs leading-4 text-muted-foreground">{label}</dt>
      <dd className="text-xs leading-4 text-foreground">
        {formatCentsLabel(amountInCents, currency)}
      </dd>
    </div>
  );
}

function BuyerQuoteActions({
  quote,
  revision,
  isBusy,
  onAccept,
  onDecline,
  errorMessage,
  errorCode,
  hasThrown,
}: {
  quote: QuoteDetailValue;
  revision: QuoteRevision;
  isBusy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  errorMessage: string | null;
  errorCode: string | null;
  hasThrown: boolean;
}) {
  if (!isQuoteActionable(quote.status)) {
    return (
      <p className="text-xs leading-4 text-muted-foreground">
        {quote.status === "accepted"
          ? `You accepted revision ${formatCountLabel(quote.acceptedRevisionNumber ?? 0)}. The order created from it is fixed.`
          : `This quote is ${QUOTE_STATUS_LABELS[quote.status].toLowerCase()}, so it cannot be accepted.`}
      </p>
    );
  }

  return (
    <section aria-label="Quote decision" className="rounded-xl border border-border px-4 py-3">
      <p className="text-sm font-medium text-foreground">Your decision</p>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAccept}
          disabled={isBusy}
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {isBusy ? "Accepting…" : `Accept revision ${formatCountLabel(revision.revisionNumber)}`}
        </button>
        <button
          type="button"
          onClick={onDecline}
          disabled={isBusy}
          className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40"
        >
          Decline
        </button>
      </div>

      {/* The button names the revision, and this says what accepting DOES. Acceptance is the moment terms
          become an immutable order, and the default settlement rail means nobody holds the money. */}
      <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
        Accepting revision {formatCountLabel(revision.revisionNumber)} creates an order from exactly
        these terms and fixes them. You will pay the provider directly — Qatoto does not hold the
        funds.
      </p>

      {/* A `REVISION_CHANGED` 409 IS A FINDING, not a retry. The provider appended while the buyer was
          reading, so the terms on screen are stale — and pressing again with a bumped number would accept
          terms they never saw. */}
      {errorCode === "409" && errorMessage !== null && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-4 text-amber-900">
          {errorMessage} Nothing was accepted. Reload to read the current revision before deciding
          again.
        </p>
      )}
      {errorCode !== "409" && errorMessage !== null && (
        <p className="mt-2 text-xs leading-4 text-destructive">{errorMessage}</p>
      )}
      {hasThrown && (
        <p className="mt-2 text-xs leading-4 text-destructive">
          Couldn&apos;t reach the server. Your acceptance may already have been recorded — pressing
          again is safe and will not create a second order.
        </p>
      )}
    </section>
  );
}

function ProviderQuoteActions({
  quote,
  isBusy,
  onWithdraw,
  errorMessage,
}: {
  quote: QuoteDetailValue;
  isBusy: boolean;
  onWithdraw: () => void;
  errorMessage: string | null;
}) {
  if (!isQuoteWithdrawable(quote.status)) {
    return (
      <p className="text-xs leading-4 text-muted-foreground">
        {quote.status === "accepted"
          ? "The buyer accepted this quote. It cannot be withdrawn — an order exists."
          : `This quote is ${QUOTE_STATUS_LABELS[quote.status].toLowerCase()}, so there is nothing to withdraw.`}
      </p>
    );
  }

  return (
    <section aria-label="Quote actions" className="rounded-xl border border-border px-4 py-3">
      {/* REVISING IS APPENDING, never editing. A submitted revision is frozen by a database trigger,
          so the way to change terms is a new revision on the same quote — which is also why this
          links to the RFQ-keyed composer rather than to anything quote-shaped. */}
      <Link
        href={`/studio/rfqs/${quote.rfqId}/quote`}
        className="mr-3 inline-block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Revise this quote
      </Link>
      <button
        type="button"
        onClick={onWithdraw}
        disabled={isBusy}
        className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-destructive outline -outline-offset-1 outline-border disabled:opacity-40"
      >
        {isBusy ? "Withdrawing…" : "Withdraw this quote"}
      </button>
      <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
        Only possible until the buyer accepts. After that an order exists and the terms are fixed.
      </p>
      {errorMessage !== null && (
        <p className="mt-2 text-xs leading-4 text-destructive">{errorMessage}</p>
      )}
    </section>
  );
}
