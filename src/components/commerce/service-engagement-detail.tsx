// TRANSPORT: client-query — reads the engagement and the viewer's organizations.
"use client";

// ONE ENGAGEMENT, SEEN FROM EITHER SIDE. Mounted by `/service-engagements/[engagementId]` and by
// `/studio/service-engagements/[engagementId]`.
//
// THE RELATION IS DERIVED FROM THE PAYLOAD, not the route — `ServiceEngagementProjection` carries
// `buyerOrganizationId` and `providerOrganizationId`, and the caller's own ids come from the server.
// Same rule as the order detail, same reason: a provider following a buyer link must not be offered the
// buyer's controls, and the frontend must not assert an authorization fact.
//
// WHICH TRANSITIONS ARE OFFERED IS THE WHOLE POINT OF KNOWING THE SIDE. `scheduled`, `in_progress` and
// `awaiting_buyer` belong to the PROVIDER; `completed` is the BUYER accepting the work. Offering the
// wrong one is a 403 the reader did not need to see — and offering `completed` to a provider would let
// them appear to sign off their own deliverable, which is exactly the shape the split exists to prevent.
//
// AN ENGAGEMENT MAY BE CANCELLED BY EITHER SIDE, but only before delivery starts.

import { useMemo } from "react";

import DefinitionList, {
  type DefinitionListItem,
} from "@/components/commerce/shared/definition-list";
import ProviderKindBadge from "@/components/commerce/shared/provider-kind-badge";
import RecordTimeline, {
  type RecordTimelineEntry,
} from "@/components/commerce/shared/record-timeline";
import StatusPanel from "@/components/home/shared/status-panel";
import {
  useServiceEngagementQuery,
  useTransitionServiceEngagement,
  useViewerOrganizationsQuery,
} from "@/hooks/store/orders";
import {
  SERVICE_ENGAGEMENT_STATE_LABELS,
  type ServiceEngagement,
  type ServiceEngagementTransitionTarget,
} from "@/lib/store/fulfillment.schemas";
import Link from "next/link";

type EngagementRelation = "buyer" | "provider" | "both" | "neither";

/** States from which either side may still cancel — before the service has started delivering. */
const CANCELLABLE_ENGAGEMENT_STATES: readonly ServiceEngagement["state"][] = [
  "awaiting_provider",
  "scheduled",
];

/**
 * Which transitions to OFFER, given the state and who is reading.
 *
 * Derived rather than hardcoded per page, so the two routes cannot drift. It decides what to show; the
 * server decides what is allowed, and re-checks under a lock.
 */
function offeredTransitions(
  state: ServiceEngagement["state"],
  relation: EngagementRelation,
): readonly ServiceEngagementTransitionTarget[] {
  const isProviderSide = relation === "provider" || relation === "both";
  const isBuyerSide = relation === "buyer" || relation === "both";

  const targets: ServiceEngagementTransitionTarget[] = [];

  if (isProviderSide) {
    if (state === "awaiting_provider") targets.push("scheduled");
    if (state === "scheduled") targets.push("in_progress");
    // The provider hands the work back for acceptance. They cannot mark it `completed` themselves.
    if (state === "in_progress") targets.push("awaiting_buyer");
  }

  // Only the buyer accepts. This is the line that keeps a provider from signing off its own deliverable.
  if (isBuyerSide && state === "awaiting_buyer") targets.push("completed");

  if ((isProviderSide || isBuyerSide) && CANCELLABLE_ENGAGEMENT_STATES.includes(state)) {
    targets.push("cancelled");
  }

  return targets;
}

const TRANSITION_LABELS: Record<ServiceEngagementTransitionTarget, string> = {
  scheduled: "Mark as scheduled",
  in_progress: "Start work",
  awaiting_buyer: "Hand over for acceptance",
  completed: "Accept this work",
  cancelled: "Cancel this engagement",
};

export default function ServiceEngagementDetail({ engagementId }: { engagementId: string }) {
  const engagementQuery = useServiceEngagementQuery(engagementId);
  const organizationsQuery = useViewerOrganizationsQuery();
  const transitionEngagement = useTransitionServiceEngagement();

  const viewState = useMemo(() => {
    if (engagementQuery.isPending || organizationsQuery.isPending)
      return { status: "loading" } as const;
    if (engagementQuery.isError || organizationsQuery.isError) {
      return { status: "error", message: "Couldn't load this engagement." } as const;
    }
    const engagementResult = engagementQuery.data;
    const organizationsResult = organizationsQuery.data;
    if (engagementResult === undefined || organizationsResult === undefined) {
      return { status: "error", message: "Couldn't load this engagement." } as const;
    }
    if (!engagementResult.success) {
      return { status: "error", message: engagementResult.error.message } as const;
    }
    if (!organizationsResult.success) {
      return { status: "error", message: organizationsResult.error.message } as const;
    }

    const engagement = engagementResult.data;
    const viewerIds = organizationsResult.data;
    const isBuyer = viewerIds.includes(engagement.buyerOrganizationId);
    const isProvider = viewerIds.includes(engagement.providerOrganizationId);
    const relation: EngagementRelation =
      isBuyer && isProvider ? "both" : isBuyer ? "buyer" : isProvider ? "provider" : "neither";

    return { status: "ready", engagement, relation } as const;
  }, [engagementQuery, organizationsQuery]);

  if (viewState.status === "loading") {
    return <p className="px-4 pt-6 text-sm text-muted-foreground lg:px-6">Loading engagement…</p>;
  }
  if (viewState.status === "error") {
    return (
      <div className="px-4 pt-6 lg:px-6">
        <StatusPanel message={viewState.message} className="border border-border px-6 py-16" />
      </div>
    );
  }

  const { engagement, relation } = viewState;
  const targets = offeredTransitions(engagement.state, relation);
  const transitionResult = transitionEngagement.data;

  // FOUR INSTANTS, NOT A PROGRESS BAR. A cancelled engagement can carry a `startedAt`, so each rung is
  // rendered only if its own timestamp exists — reading "started" as "in progress" would misreport it.
  const timelineEntries: RecordTimelineEntry[] = [
    { at: engagement.createdAt, title: "Engagement created", isTerminal: false },
    { at: engagement.scheduledAt, title: "Scheduled", isTerminal: false },
    { at: engagement.startedAt, title: "Work started", isTerminal: false },
    { at: engagement.completedAt, title: "Accepted by the buyer", isTerminal: true },
    { at: engagement.cancelledAt, title: "Cancelled", isTerminal: true },
  ]
    .filter((rung): rung is { at: string; title: string; isTerminal: boolean } => rung.at !== null)
    .map((rung) => ({
      id: rung.title,
      occurredAtIso: rung.at,
      title: rung.title,
      detail: null,
      isTerminal: rung.isTerminal,
    }));

  const terms: DefinitionListItem[] = [
    { term: "State", value: SERVICE_ENGAGEMENT_STATE_LABELS[engagement.state] },
    { term: "Scope", value: engagement.scopeSnapshot },
    {
      term: "On order",
      value: (
        <Link
          href={
            relation === "provider"
              ? `/studio/orders/${engagement.orderId}`
              : `/orders-and-returns/${engagement.orderId}`
          }
          className="text-primary underline"
        >
          {engagement.orderId}
        </Link>
      ),
    },
  ];

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <ProviderKindBadge providerKind={engagement.providerKind} />
        <h1 className="mt-2 font-serif text-xl font-semibold text-foreground md:text-2xl">
          {engagement.titleSnapshot}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {SERVICE_ENGAGEMENT_STATE_LABELS[engagement.state]}
        </p>

        {relation === "neither" && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-4 text-amber-900">
            You are not a member of either organization on this engagement, so no actions are
            available.
          </p>
        )}
      </header>

      <div className="space-y-4 px-4 pt-4 lg:px-6">
        <DefinitionList items={terms} />

        <section aria-label="History" className="rounded-xl border border-border px-4 py-3">
          <p className="pb-2 text-sm font-medium text-foreground">History</p>
          <RecordTimeline
            entries={timelineEntries}
            emptyMessage="Nothing has been recorded on this engagement yet."
          />
        </section>

        {/* This service finishing does NOT finish any other service on the order. Said plainly, because
            a buyer accepting an inspection report will reasonably wonder what it means for the freight. */}
        <p className="text-[11px] leading-4 text-muted-foreground">
          Each service on an order finishes on its own. Accepting this one does not complete
          anything else.
        </p>

        {targets.length > 0 && (
          <section aria-label="Actions" className="rounded-xl border border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {relation === "buyer" ? "Your decision" : "Move this forward"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {targets.map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() =>
                    transitionEngagement.mutate({
                      engagementId: engagement.id,
                      orderId: engagement.orderId,
                      input: { target },
                    })
                  }
                  disabled={transitionEngagement.isPending}
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium disabled:opacity-40 ${
                    target === "cancelled"
                      ? "bg-background text-destructive outline -outline-offset-1 outline-border"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {TRANSITION_LABELS[target]}
                </button>
              ))}
            </div>

            {transitionResult !== undefined && !transitionResult.success && (
              <p className="mt-2 text-xs leading-4 text-destructive">
                {transitionResult.error.message}
              </p>
            )}
            {transitionEngagement.isError && (
              <p className="mt-2 text-xs leading-4 text-destructive">
                Couldn&apos;t reach the server. Nothing changed.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
