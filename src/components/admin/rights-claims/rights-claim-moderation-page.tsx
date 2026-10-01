// TRANSPORT: client-query — the queue reads `@/hooks/blueprints/rights-claim-moderation`. The
// capability check reads `@/hooks/rnd/platform-roles`.
"use client";

// `/admin/rights-claims`. Sworn IP claims against published teardowns, oldest first.
//
// ⚠️ A SEPARATE CONSOLE FROM `/admin/blueprint-reports`, and not a filter on it. A reader report is
// one reason and a sentence; a claim carries a claimant's name, email and sworn account, and this
// console is the one place in the app that shows them. Folding claims into the report queue would
// put those details in front of every report card too.
//
// ⚠️ NOT A STATUTORY PROCESS. Qatoto has designated no DMCA agent and has no counter-notice path;
// a claim here is a person asking a moderator to act, and the header says so once.

import { useState } from "react";

import { AdminPageHeader } from "@/components/admin/shared/admin-page-header";
import { ModerationStatusTabFilter } from "@/components/admin/shared/moderation-status-tab-filter";
import RightsClaimCard from "@/components/admin/rights-claims/rights-claim-card";
import { useRightsClaimQueue } from "@/hooks/blueprints/rights-claim-moderation";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  RIGHTS_CLAIM_STATUSES,
  type RightsClaimQueueItem,
  type RightsClaimStatus,
} from "@/lib/blueprints/rights-claim-moderation.schemas";

const PANEL_CLASS =
  "block rounded-2xl border border-outline-variant/60 bg-muted/40 p-3 text-sm text-muted-foreground";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

type ConsoleState =
  | { readonly status: "checking" }
  | { readonly status: "capabilityUnknown" }
  | { readonly status: "restricted"; readonly platformRole: string | null }
  | { readonly status: "permitted" };

const STATUS_LABELS: Readonly<Record<RightsClaimStatus, string>> = {
  open: "Open",
  actioned: "Actioned",
  dismissed: "Dismissed",
};

export default function RightsClaimModerationPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const [status, setStatus] = useState<RightsClaimStatus>("open");

  const consoleState: ConsoleState = staffContextQuery.isError
    ? { status: "capabilityUnknown" }
    : !staffContextQuery.isSuccess
      ? { status: "checking" }
      : staffContextQuery.data.capabilities.includes("moderate_content")
        ? { status: "permitted" }
        : { status: "restricted", platformRole: staffContextQuery.data.platformRole };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminPageHeader
        title="Rights claims"
        description="Intellectual property claims against published teardowns, oldest first. Each claimant swore three statements and gave a name and an email; only staff see those, never the publisher."
        secondaryDescription="Filing a claim changed nothing about its teardown. Qatoto has no designated agent for statutory notices, so these are requests to a moderator, not formal filings. Claimant details are deleted six years after a claim is answered."
      />

      {consoleState.status === "permitted" ? (
        <ModerationStatusTabFilter
          statuses={RIGHTS_CLAIM_STATUSES}
          statusLabels={STATUS_LABELS}
          currentStatus={status}
          onStatusChange={setStatus}
          quietButtonClass={QUIET_BUTTON_CLASS}
        />
      ) : null}

      {renderConsole(consoleState, status)}
    </div>
  );
}

function renderConsole(state: ConsoleState, status: RightsClaimStatus) {
  switch (state.status) {
    case "checking":
      return <div className="h-28 max-w-3xl animate-pulse rounded-2xl bg-muted/40" aria-hidden />;
    case "capabilityUnknown":
      return (
        <output className={`${PANEL_CLASS} max-w-3xl`}>
          Couldn&apos;t check your permissions, so nothing here is loaded.
        </output>
      );
    case "restricted":
      return (
        <output className={`${PANEL_CLASS} max-w-3xl`}>
          Reviewing rights claims needs the `moderate_content` capability. Your role is{" "}
          {state.platformRole ?? "none"}, so this page is not loaded.
        </output>
      );
    case "permitted":
      // Mounted only once the capability answers, because `useKeysetList` has no `enabled`.
      return <RightsClaimQueue status={status} />;
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

type QueueViewState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly claims: readonly RightsClaimQueueItem[] };

function RightsClaimQueue({ status }: { readonly status: RightsClaimStatus }) {
  const queue = useRightsClaimQueue(status);

  const viewState: QueueViewState = (() => {
    if (queue.isLoadingFirstPage) return { status: "loading" };
    if (queue.firstPageErrorMessage !== null) {
      return { status: "error", message: queue.firstPageErrorMessage };
    }
    if (queue.rows.length === 0) return { status: "empty" };
    return { status: "ready", claims: queue.rows };
  })();

  switch (viewState.status) {
    case "loading":
      return <div className="h-28 max-w-3xl animate-pulse rounded-2xl bg-muted/40" aria-hidden />;
    case "error":
      return <output className={`${PANEL_CLASS} max-w-3xl`}>{viewState.message}</output>;
    case "empty":
      return (
        <p className={`${PANEL_CLASS} max-w-3xl`}>
          {status === "open" ? "Nothing is waiting." : "Nothing here."}
        </p>
      );
    case "ready":
      return (
        <>
          <ul className="max-w-3xl space-y-3">
            {viewState.claims.map((claim) => (
              <RightsClaimCard key={claim.claimId} claim={claim} />
            ))}
          </ul>

          {queue.hasNextPage ? (
            <button
              type="button"
              onClick={queue.loadNextPage}
              disabled={queue.isFetchingNextPage}
              className={QUIET_BUTTON_CLASS}
            >
              {queue.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          ) : null}

          {queue.loadMoreErrorMessage === null ? null : (
            <output className={`${PANEL_CLASS} max-w-3xl`}>{queue.loadMoreErrorMessage}</output>
          )}
        </>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
