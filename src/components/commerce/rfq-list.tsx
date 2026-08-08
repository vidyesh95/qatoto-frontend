// TRANSPORT: client-query — reads whichever RFQ endpoint the surface belongs to.
"use client";

// The RFQ queue, for the buyer at `/store/rfqs` and the provider at `/studio/rfqs`.
//
// `which` PICKS THE ENDPOINT, and here the two reads differ by more than authorization:
// `/commerce/rfqs/mine` includes DRAFTS and `/commerce/provider/rfqs` never does. A draft is the buyer's
// private working copy, so a provider queue that surfaced one would publish a requirement before its
// buyer chose to. That is why they are two reads and two cache entries rather than one with a flag.

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { useRfqListQuery } from "@/hooks/store/rfqs";
import { formatIsoInstantLabel } from "@/lib/store/format";
import { RFQ_STATE_LABELS, RFQ_VISIBILITY_LABELS, type RfqSummary } from "@/lib/store/rfqs.schemas";

export default function RfqList({ which }: { which: "buyer" | "provider" }) {
  const rfqListQuery = useRfqListQuery(which);

  if (rfqListQuery.isPending) {
    return <p className="px-4 pt-6 text-sm text-muted-foreground lg:px-6">Loading requests…</p>;
  }

  const result = rfqListQuery.data;
  if (result === undefined || rfqListQuery.isError) {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel
          message="Couldn't load requests for quotation."
          className="border border-border px-6 py-16"
        />
      </div>
    );
  }
  if (!result.success) {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel
          message={result.error.message}
          className="border border-border px-6 py-16"
          action={
            // 401 only. A 404 must never become a sign-in prompt — the backend answers it for "no access
            // or no such thing" with one code so a stranger cannot probe which ids exist.
            result.error.code === "401" ? (
              <Link
                href="/sign-in"
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Sign in
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  if (result.data.items.length === 0) {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel
          message={
            which === "buyer"
              ? "You haven't created a request for quotation yet."
              : "Nobody has invited you to quote, and nothing has matched your services."
          }
          className="border border-border px-6 py-16"
          action={
            which === "buyer" ? (
              <Link
                href="/store/rfqs/new"
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Start a request
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-3 px-4 lg:px-6">
      {result.data.items.map((rfq) => (
        <li key={rfq.id}>
          <RfqRow rfq={rfq} which={which} />
        </li>
      ))}
    </ul>
  );
}

function RfqRow({ rfq, which }: { rfq: RfqSummary; which: "buyer" | "provider" }) {
  return (
    <Link
      href={which === "buyer" ? `/store/rfqs/${rfq.id}` : `/studio/rfqs/${rfq.id}`}
      className="block rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-sm leading-5 font-medium text-foreground">{rfq.title}</p>
        <span className="text-xs leading-4 text-muted-foreground">
          {RFQ_STATE_LABELS[rfq.state]}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-4 text-muted-foreground">
        <span>{rfq.settlementCurrency}</span>
        {/* THE DEADLINE IS THE MOST ACTIONABLE FIELD ON A PROVIDER'S QUEUE, so it is stated rather than
            buried — and its absence is stated too, because a draft has no deadline and "no deadline" on an
            open request would be a different and alarming fact. */}
        <span>
          {rfq.responseDeadlineAt === null
            ? "No quote deadline set"
            : `Quotes due ${formatIsoInstantLabel(rfq.responseDeadlineAt)}`}
        </span>
      </div>

      {/* Visibility matters most to the BUYER, who is deciding how widely to expose a requirement. A
          provider already knows they can see it. */}
      {which === "buyer" && (
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          {RFQ_VISIBILITY_LABELS[rfq.visibility]}
        </p>
      )}
    </Link>
  );
}
