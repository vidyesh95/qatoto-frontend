// TRANSPORT: client-query — reads GET /commerce/service-engagements.
"use client";

// THE ENGAGEMENT QUEUE, both sides at once.
//
// ONE ENDPOINT SERVES BUYER AND PROVIDER, unlike orders and RFQs where each side has its own route. The server
// returns the engagements the caller is party to and states `buyerOrganizationId` and
// `providerOrganizationId` on every row, so which side the reader is on is derivable per row rather than per
// page — an organization that buys freight and also sells inspection sees both kinds in one list, correctly.
//
// WHICH SIDE IS DERIVED FROM THE PAYLOAD, NOT FROM THE ROUTE, using the same viewer-organization read the order
// detail uses. A route-derived side would label a provider's own engagement as something they bought.
//
// `awaiting_buyer` IS THE ONLY STATE THAT NAMES WHO IS BLOCKED, and it means opposite things to the two
// parties: the buyer owes an answer, the provider is waiting for one. A queue that printed the enum label for
// both would tell the provider they are blocked when they are not.

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { useServiceEngagementListQuery, useViewerOrganizationsQuery } from "@/hooks/store/orders";
import { formatIsoInstantLabel } from "@/lib/store/format";
import {
  SERVICE_ENGAGEMENT_STATE_LABELS,
  type ServiceEngagement,
} from "@/lib/store/fulfillment.schemas";
import { PROVIDER_KIND_LABELS } from "@/lib/store/labels";

export default function ServiceEngagementList() {
  const engagementsQuery = useServiceEngagementListQuery();
  const viewerOrganizationsQuery = useViewerOrganizationsQuery();
  const result = engagementsQuery.data;
  const viewerResult = viewerOrganizationsQuery.data;

  if (engagementsQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading engagements…</p>;
  }
  if (result === undefined || engagementsQuery.isError) {
    return (
      <StatusPanel
        message="Couldn't load your engagements."
        className="border border-border px-6 py-16"
      />
    );
  }
  if (!result.success) {
    return (
      <StatusPanel message={result.error.message} className="border border-border px-6 py-16" />
    );
  }
  if (result.data.items.length === 0) {
    return (
      <StatusPanel
        message="No service engagements yet. One is created when a provider's quote is accepted."
        className="border border-border px-6 py-16"
      />
    );
  }

  // The organizations the caller belongs to, as the SERVER states them. Absent while that read is in flight,
  // in which case each row renders without a side rather than guessing one.
  const viewerOrganizationIds =
    viewerResult !== undefined && viewerResult.success ? viewerResult.data : null;

  return (
    <ul className="space-y-2">
      {result.data.items.map((engagement) => (
        <li key={engagement.id}>
          <EngagementRow engagement={engagement} viewerOrganizationIds={viewerOrganizationIds} />
        </li>
      ))}
    </ul>
  );
}

function EngagementRow({
  engagement,
  viewerOrganizationIds,
}: {
  engagement: ServiceEngagement;
  viewerOrganizationIds: readonly string[] | null;
}) {
  const isViewerTheProvider =
    viewerOrganizationIds !== null &&
    viewerOrganizationIds.includes(engagement.providerOrganizationId);
  const isViewerTheBuyer =
    viewerOrganizationIds !== null &&
    viewerOrganizationIds.includes(engagement.buyerOrganizationId);

  return (
    <Link
      href={`/service-engagements/${engagement.id}`}
      className="block rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-sm leading-5 font-medium text-foreground">
          {engagement.titleSnapshot}
        </p>
        <span className="text-xs leading-4 text-muted-foreground">
          {SERVICE_ENGAGEMENT_STATE_LABELS[engagement.state]}
        </span>
      </div>

      <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
        {PROVIDER_KIND_LABELS[engagement.providerKind]}
        {/* An organization can be BOTH parties when it sells to itself, so this is not an either/or. Saying
            "both sides" is truthful where picking one would be arbitrary. */}
        {isViewerTheBuyer && isViewerTheProvider
          ? " · your organization is on both sides"
          : isViewerTheProvider
            ? " · you are delivering this"
            : isViewerTheBuyer
              ? " · you engaged this"
              : ""}
      </p>

      {/* `awaiting_buyer` SPELLED OUT PER SIDE. The generic label above is accurate; this line says who is
          actually holding it up, which the enum name cannot. */}
      {engagement.state === "awaiting_buyer" && viewerOrganizationIds !== null && (
        <p className="mt-1 text-[11px] leading-4 text-amber-900">
          {isViewerTheBuyer
            ? "Waiting on you to accept the work."
            : "Waiting on the buyer to accept the work."}
        </p>
      )}

      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
        Created {formatIsoInstantLabel(engagement.createdAt)}
      </p>
    </Link>
  );
}
