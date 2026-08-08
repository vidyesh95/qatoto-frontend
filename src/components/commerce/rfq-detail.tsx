// TRANSPORT: client-query — reads one RFQ.
"use client";

// ONE RFQ, SEEN FROM EITHER SIDE. Mounted by `/store/rfqs/[rfqId]` and `/studio/rfqs/[rfqId]`.
//
// `callerRelation` COMES FROM THE SERVER, so unlike the order detail this needs no organization lookup and
// no derivation — the read states whether the caller is the `buyer`, an `invited_provider` or a
// `matched_provider`. One query instead of two, and no window in which the wrong actions could render.
//
// WHAT A PROVIDER MUST NOT SEE IS THE POINT OF SPLITTING THE PANELS. The invitation list is other
// providers' competitive information: who else was asked, who has already quoted. A provider reading this
// page gets its own standing and nothing about the others — and that holds even if the backend sends the
// full list, because the rendering decision is here.
//
// The buyer's controls are gated on STATE as well as relation: only a draft opens, only an open RFQ
// closes, and both are re-checked server-side under a lock. `open` in particular is a real validation
// gate rather than a flip — it can come back with findings, and the page renders them.

import { useMemo } from "react";

import Link from "next/link";

import QuoteComparisonTable from "@/components/commerce/quote-comparison-table";
import DefinitionList, {
  type DefinitionListItem,
} from "@/components/commerce/shared/definition-list";
import ProviderKindBadge from "@/components/commerce/shared/provider-kind-badge";
import RfqRequirementPanel from "@/components/commerce/sections/rfq-requirement-panel";
import StatusPanel from "@/components/home/shared/status-panel";
import TabStrip from "@/components/home/shared/tab-strip";
import { useQuoteComparisonQuery } from "@/hooks/store/quotes";
import { useCloseRfq, useOpenRfq, useRfqQuery } from "@/hooks/store/rfqs";
import {
  countryLabelFromCode,
  formatCountLabel,
  formatIsoInstantLabel,
  formatOptionalIsoInstantLabel,
} from "@/lib/store/format";
import {
  isRfqCloseable,
  isRfqEditable,
  RFQ_INVITATION_STATE_LABELS,
  RFQ_STATE_LABELS,
  RFQ_VISIBILITY_LABELS,
  type RfqDetail as RfqDetailValue,
  type RfqProductLine,
  type RfqServiceLine,
} from "@/lib/store/rfqs.schemas";

export default function RfqDetail({ rfqId }: { rfqId: string }) {
  const rfqQuery = useRfqQuery(rfqId);
  const openRfq = useOpenRfq();
  const closeRfq = useCloseRfq();

  const viewState = useMemo(() => {
    if (rfqQuery.isPending) return { status: "loading" } as const;
    if (rfqQuery.isError)
      return { status: "error", message: "Couldn't load this request." } as const;
    const result = rfqQuery.data;
    if (result === undefined) {
      return { status: "error", message: "Couldn't load this request." } as const;
    }
    if (!result.success) return { status: "error", message: result.error.message } as const;
    return { status: "ready", rfq: result.data } as const;
  }, [rfqQuery]);

  if (viewState.status === "loading") {
    return <p className="px-4 pt-6 text-sm text-muted-foreground lg:px-6">Loading request…</p>;
  }
  if (viewState.status === "error") {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel message={viewState.message} className="border border-border px-6 py-16" />
      </div>
    );
  }

  const { rfq } = viewState;
  const isBuyer = rfq.callerRelation === "buyer";

  const terms: DefinitionListItem[] = [
    { term: "State", value: RFQ_STATE_LABELS[rfq.state] },
    { term: "Who can see it", value: RFQ_VISIBILITY_LABELS[rfq.visibility] },
    { term: "Quotes due", value: formatOptionalIsoInstantLabel(rfq.responseDeadlineAt) },
    {
      term: "Delivery window",
      value:
        rfq.desiredDeliveryStartsAt === null && rfq.desiredDeliveryEndsAt === null
          ? null
          : `${formatOptionalIsoInstantLabel(rfq.desiredDeliveryStartsAt) ?? "any time"} → ${
              formatOptionalIsoInstantLabel(rfq.desiredDeliveryEndsAt) ?? "open"
            }`,
    },
    {
      term: "Destination",
      // COUNTRY AND CITY ONLY. The street lines are encrypted and are not on this read at all — a
      // provider quoting a lane needs a city, not a door, and this is the read every invited provider
      // sees.
      value:
        rfq.destinationCountryCode === null
          ? null
          : `${rfq.destinationLocality ?? ""} ${countryLabelFromCode(rfq.destinationCountryCode)}`.trim(),
    },
    { term: "Settlement currency", value: rfq.settlementCurrency },
    { term: "Opened", value: formatOptionalIsoInstantLabel(rfq.openedAt) },
    { term: "Closed", value: formatOptionalIsoInstantLabel(rfq.closedAt) },
    { term: "Awarded", value: formatOptionalIsoInstantLabel(rfq.awardedAt) },
  ];

  const openResult = openRfq.data;
  const closeResult = closeRfq.data;

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
          {isBuyer ? "Your request" : "Request you can quote"}
        </p>
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
          {rfq.title}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{RFQ_STATE_LABELS[rfq.state]}</p>

        {rfq.description !== null && (
          <p className="mt-2 text-sm leading-5 text-foreground">{rfq.description}</p>
        )}

        {/* BUYER ONLY, and this is the one place the distinction is safe to make: `callerRelation` is on
            this read. The tab below is available to both sides because the comparison ENDPOINT filters by
            caller — but a provider whose only row is its own has nothing to compare, so a full-page
            comparison link would promise something the read cannot deliver. */}
        {isBuyer && (
          <Link
            href={`/store/rfqs/${rfq.id}/compare`}
            className="mt-1 inline-block text-xs font-medium text-primary underline"
          >
            Compare the quotes on this request
          </Link>
        )}

        {/* A PROVIDER IS TOLD ITS OWN STANDING and nothing about anyone else's. `matched_provider` means
            they were not invited by name — they can see it because the buyer opened it to the market,
            which is worth knowing before spending time on a quote. */}
        {!isBuyer && (
          <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs leading-4 text-muted-foreground">
            {rfq.callerRelation === "invited_provider"
              ? "The buyer invited your organization to quote on this."
              : "Your organization matched this request. The buyer did not invite you by name."}
          </p>
        )}
      </header>

      <TabStrip
        ariaLabel="Request sections"
        initialTabId="requirement"
        tabs={[
          {
            id: "requirement",
            label: "Requirement",
            badge: formatCountLabel(rfq.productLines.length + rfq.serviceLines.length),
            panel: <RfqRequirementSections rfq={rfq} />,
          },
          {
            id: "terms",
            label: "Terms",
            panel: (
              <div className="space-y-4 px-4 pb-4 lg:px-6">
                <DefinitionList items={terms} />

                {rfq.documents.length > 0 && (
                  <section
                    aria-label="Attachments"
                    className="rounded-xl border border-border px-4 py-3"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {formatCountLabel(rfq.documents.length)}{" "}
                      {rfq.documents.length === 1 ? "attachment" : "attachments"}
                    </p>
                    {/* NO LINKS. `encryptedDocumentId` is a pointer to a private object and this read
                        mints no authorized URL, so the honest render is that a document exists. A
                        fabricated href would 404 or, worse, look like a permissions bug. */}
                    <p className="mt-1 text-xs leading-4 text-muted-foreground">
                      Attached files are private. Downloading them needs an authorized link, which
                      this view does not issue.
                    </p>
                  </section>
                )}

                {isBuyer && (
                  <BuyerControls
                    rfq={rfq}
                    onOpen={() => openRfq.mutate({ rfqId: rfq.id })}
                    onClose={() => closeRfq.mutate({ rfqId: rfq.id })}
                    isBusy={openRfq.isPending || closeRfq.isPending}
                    errorMessage={
                      openResult !== undefined && !openResult.success
                        ? openResult.error.message
                        : closeResult !== undefined && !closeResult.success
                          ? closeResult.error.message
                          : null
                    }
                  />
                )}
              </div>
            ),
          },
          // THE QUOTES TAB EXISTS FOR BOTH SIDES, unlike the invitation tab, because the ENDPOINT filters
          // by caller: a buyer's rows are every non-draft quote on the RFQ, a provider's rows are only its
          // own. Nothing competitive leaks, and hiding the tab from providers would hide a provider's own
          // quote from it. A draft RFQ has no quotes at all and the panel says why.
          {
            id: "quotes",
            label: "Quotes",
            // LAZY, because this panel reads. `TabStrip` renders every panel and hides the inactive ones,
            // so without this the comparison read fires on every RFQ page view — a second request, and on
            // the backend a per-quote revision lookup, for a tab most visitors never open.
            isLazy: true,
            panel: <RfqQuotesPanel rfq={rfq} />,
          },
          // THE INVITATION TAB EXISTS ONLY FOR THE BUYER. Who else was asked and who has already quoted
          // is other providers' competitive information — the tab is absent rather than empty, because an
          // empty "Invitations" tab still tells a provider the concept applies to them.
          ...(isBuyer
            ? [
                {
                  id: "invitations",
                  label: "Invitations",
                  // NO BADGE AT ZERO. `TabStrip`'s own note says to omit rather than pass `0`, and a
                  // draft with nothing sent yet was rendering "Invitations 0" — a count whose only
                  // content is that there is nothing to count. The empty panel already says it better.
                  ...(rfq.invitations.length > 0
                    ? { badge: formatCountLabel(rfq.invitations.length) }
                    : {}),
                  panel: <InvitationList rfq={rfq} />,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}

function RfqRequirementSections({ rfq }: { rfq: RfqDetailValue }) {
  if (rfq.productLines.length === 0 && rfq.serviceLines.length === 0) {
    return (
      <p className="px-4 pb-4 text-xs leading-4 text-muted-foreground lg:px-6">
        Nothing has been added to this request yet. An RFQ needs at least one line before it can
        open.
      </p>
    );
  }

  return (
    <div className="space-y-4 px-4 pb-4 lg:px-6">
      {rfq.productLines.length > 0 && (
        <section aria-label="Goods wanted">
          <h2 className="pb-2 text-sm font-medium text-foreground">Goods wanted</h2>
          <ul className="space-y-2">
            {rfq.productLines.map((line) => (
              <li key={line.id}>
                <ProductLineRow line={line} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {rfq.serviceLines.length > 0 && (
        <section aria-label="Services wanted">
          <h2 className="pb-2 text-sm font-medium text-foreground">Services wanted</h2>
          <ul className="space-y-3">
            {rfq.serviceLines.map((line) => (
              <li key={line.id}>
                <ServiceLineRow line={line} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProductLineRow({ line }: { line: RfqProductLine }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-sm leading-5 font-medium text-foreground">{line.requestedTitle}</p>
      <p className="text-xs leading-4 text-muted-foreground">
        {line.requestedSpecificationSnapshot}
      </p>
      <p className="mt-1 text-xs leading-4 text-foreground">
        {formatCountLabel(line.quantity)} {line.unitLabel}
      </p>
      {/* A null `productId` is the ordinary case here and worth stating: it means the buyer is sourcing
          something that is not a listing, which is what an RFQ is for. */}
      {line.productId === null && (
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          Not an existing listing — quote against the specification.
        </p>
      )}
    </div>
  );
}

function ServiceLineRow({ line }: { line: RfqServiceLine }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <ProviderKindBadge providerKind={line.providerKind} isCompact />
      <p className="mt-1 text-sm leading-5 text-foreground">{line.requirementSummary}</p>

      {line.serviceOfferingId !== null && (
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          The buyer named a specific service for this line.
        </p>
      )}

      {/* A service line may point at a product line WITHOUT being its child: cancelling the goods does
          not cancel the freight, and each engagement runs its own state machine. */}
      {line.linkedProductLineId !== null && (
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          Relates to one of the goods lines above.
        </p>
      )}

      <div className="mt-2">
        {line.requirementDetail === null ? (
          // NULL IS A REAL STATE: the buyer described this in prose and filled no typed form. The summary
          // above IS the requirement, so saying "no requirement" here would contradict the line itself.
          <p className="text-[11px] leading-4 text-muted-foreground">
            Described in words only — no structured requirement was filled in.
          </p>
        ) : (
          <RfqRequirementPanel requirement={line.requirementDetail} />
        )}
      </div>
    </div>
  );
}

/**
 * The quotes on this RFQ, inline. Same table as the standalone compare route.
 *
 * NO ROLE BRANCH HERE, because the ENDPOINT is the authorization: a buyer's rows are every non-draft quote,
 * a provider's rows are only its own, and this read carries no `callerRelation` to tell which happened. The
 * copy is therefore true of both — and the deep link to the full comparison is buyer-only above, where
 * `callerRelation` IS available, rather than guessed at here.
 */
function RfqQuotesPanel({ rfq }: { rfq: RfqDetailValue }) {
  const comparisonQuery = useQuoteComparisonQuery(rfq.id);
  const result = comparisonQuery.data;

  if (comparisonQuery.isPending) {
    return (
      <p className="px-4 pb-4 text-xs leading-4 text-muted-foreground lg:px-6">Loading quotes…</p>
    );
  }

  // The backend's own message, not a substituted one: `listQuotesForRfq` answers 404 to a provider with no
  // quote and no visibility deliberately, so that the route cannot be used to probe for RFQs. Only the
  // server knows which of "gone" and "not yours" applies.
  if (result === undefined || comparisonQuery.isError || !result.success) {
    return (
      <p className="px-4 pb-4 text-xs leading-4 text-muted-foreground lg:px-6">
        {result !== undefined && !result.success
          ? result.error.message
          : "Couldn't load the quotes on this request."}
      </p>
    );
  }

  return (
    <div className="px-4 pb-4 lg:px-6">
      <QuoteComparisonTable
        quotes={result.data}
        emptyMessage={
          // A DRAFT HAS NONE FOR A REASON, and it is not the same reason as an open request with no
          // answers yet. Conflating them would tell a buyer nobody is interested when nobody has been asked.
          rfq.state === "draft"
            ? "This request has not been opened, so nobody could have quoted on it yet."
            : "No quotes on this request yet."
        }
      />
    </div>
  );
}

function InvitationList({ rfq }: { rfq: RfqDetailValue }) {
  if (rfq.invitations.length === 0) {
    return (
      <p className="px-4 pb-4 text-xs leading-4 text-muted-foreground lg:px-6">
        Nobody has been invited yet.
        {rfq.visibility === "matched_providers" &&
          " This request is open to matched providers, so it can still receive quotes without invitations."}
      </p>
    );
  }

  return (
    <ul className="space-y-2 px-4 pb-4 lg:px-6">
      {rfq.invitations.map((invitation) => (
        <li key={invitation.id} className="rounded-xl border border-border px-4 py-3">
          {/* THE ORGANIZATION ID, because that is all this read carries. There is no
              `providerDisplayName` on `RfqInvitationProjection`, and resolving each id would be one
              request per row — so the id is shown rather than a name invented for it. A display name here
              is a one-field backend ask. */}
          <p className="font-mono text-xs leading-4 text-foreground">
            {invitation.providerOrganizationId}
          </p>
          <p className="text-xs leading-4 text-muted-foreground">
            {RFQ_INVITATION_STATE_LABELS[invitation.state]}
            {invitation.sentAt !== null && ` · sent ${formatIsoInstantLabel(invitation.sentAt)}`}
          </p>
        </li>
      ))}
    </ul>
  );
}

function BuyerControls({
  rfq,
  onOpen,
  onClose,
  isBusy,
  errorMessage,
}: {
  rfq: RfqDetailValue;
  onOpen: () => void;
  onClose: () => void;
  isBusy: boolean;
  errorMessage: string | null;
}) {
  const canOpen = isRfqEditable(rfq.state);
  const canClose = isRfqCloseable(rfq.state);

  if (!canOpen && !canClose) {
    return (
      <p className="text-xs leading-4 text-muted-foreground">
        {rfq.state === "awarded"
          ? "This request has been awarded. Its terms are fixed."
          : "No actions are available from this state."}
      </p>
    );
  }

  return (
    <section aria-label="Request actions" className="rounded-xl border border-border px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {canOpen && (
          <button
            type="button"
            onClick={onOpen}
            disabled={isBusy}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {isBusy ? "Opening…" : "Open for quotes"}
          </button>
        )}
        {canClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40"
          >
            {isBusy ? "Closing…" : "Close to new quotes"}
          </button>
        )}
      </div>

      {canOpen && (
        // Opening is a VALIDATION GATE, not a flip: the server checks the deadline, the lines, document
        // ownership and every required service field. Saying so before the press means a refusal reads as
        // "something is missing" rather than "it broke".
        <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
          Opening checks the deadline, the lines and the attachments. It can come back with things
          to fix.
          {rfq.visibility === "matched_providers" &&
            " This request will become visible to every eligible provider of the kinds you named."}
        </p>
      )}

      {canClose && (
        <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
          Closing stops new quotes. Quotes you already have stay valid until they expire.
        </p>
      )}

      {errorMessage !== null && (
        <p className="mt-2 text-xs leading-4 text-destructive">{errorMessage}</p>
      )}
    </section>
  );
}
