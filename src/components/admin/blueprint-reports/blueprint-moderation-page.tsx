// TRANSPORT: client-query — the queue reads `@/hooks/blueprints/content-moderation`. The capability
// check reads `@/hooks/rnd/platform-roles`.
"use client";

// `/admin/blueprint-reports`. Reader reports about PUBLISHED blueprints, oldest first.
//
// ⚠️ A SEPARATE CONSOLE FROM THE THREE REVIEW QUEUES, AND NOT A FOURTH TAB ON THEM. `/admin/teardowns`,
// `/admin/case-studies` and `/admin/showcase-launches` hold submissions waiting for a first
// decision — `teardown-moderation-page.tsx` says "THIS CONSOLE IS THE ONLY PLACE A PENDING TEARDOWN
// EXISTS". These rows have already passed that decision and are public. Same word, different
// population, different verbs, and on the server a different index entirely.
//
// ⚠️ AND WIDENING THE CASE-STUDY QUEUE WOULD HAVE COST SOMETHING SPECIFIC:
// `GET /blueprints/admin/case-studies/review-queue` is the ONE route in the whole blueprints router
// that serves a company name its writer withheld from readers. Putting reports through it would
// widen that exposure for no reason.

import BlueprintReportCard from "@/components/admin/blueprint-reports/blueprint-report-card";
import { useBlueprintReportQueue } from "@/hooks/blueprints/content-moderation";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  BLUEPRINT_REPORT_STATUSES,
  type BlueprintReportQueueItem,
  type BlueprintReportStatus,
} from "@/lib/blueprints/admin-reports.schemas";
import { useState } from "react";

const PANEL_CLASS =
  "block rounded-2xl border border-outline-variant/60 bg-muted/40 p-3 text-sm text-muted-foreground";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

type ConsoleState =
  | { readonly status: "checking" }
  | { readonly status: "capabilityUnknown" }
  | { readonly status: "restricted"; readonly platformRole: string | null }
  | { readonly status: "permitted" };

const STATUS_LABELS: Readonly<Record<BlueprintReportStatus, string>> = {
  open: "Open",
  actioned: "Actioned",
  dismissed: "Dismissed",
};

export default function BlueprintModerationPage() {
  const staffContextQuery = useOwnStaffContextQuery();
  const [status, setStatus] = useState<BlueprintReportStatus>("open");

  const consoleState: ConsoleState = staffContextQuery.isError
    ? { status: "capabilityUnknown" }
    : !staffContextQuery.isSuccess
      ? { status: "checking" }
      : staffContextQuery.data.capabilities.includes("moderate_content")
        ? { status: "permitted" }
        : { status: "restricted", platformRole: staffContextQuery.data.platformRole };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="max-w-3xl space-y-1">
        <h1 className="text-2xl font-semibold">Blueprint reports</h1>
        <p className="text-sm text-muted-foreground">
          What readers have reported about published blueprints (teardowns, case studies and
          showcases), oldest first.
        </p>
        <p className="text-sm text-muted-foreground">
          Nothing here was hidden automatically — a report changes no state on its own, so every
          page below is exactly as its readers see it until you decide otherwise.
        </p>
      </header>

      {consoleState.status === "permitted" ? (
        <div className="flex flex-wrap gap-2">
          {BLUEPRINT_REPORT_STATUSES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => {
                setStatus(candidate);
              }}
              aria-pressed={status === candidate}
              className={`${QUIET_BUTTON_CLASS} ${status === candidate ? "bg-primary" : ""}`}
            >
              {STATUS_LABELS[candidate]}
            </button>
          ))}
        </div>
      ) : null}

      {renderConsole(consoleState, status)}
    </div>
  );
}

function renderConsole(state: ConsoleState, status: BlueprintReportStatus) {
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
          Reviewing reports needs the `moderate_content` capability. Your role is{" "}
          {state.platformRole ?? "none"}, so this page is not loaded.
        </output>
      );
    case "permitted":
      // Mounted only once the capability answers, because `useKeysetList` has no `enabled`.
      return <BlueprintReportQueue status={status} />;
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
  | { readonly status: "ready"; readonly reports: readonly BlueprintReportQueueItem[] };

function BlueprintReportQueue({ status }: { readonly status: BlueprintReportStatus }) {
  const queue = useBlueprintReportQueue(status);

  const viewState: QueueViewState = (() => {
    if (queue.isLoadingFirstPage) return { status: "loading" };
    if (queue.firstPageErrorMessage !== null) {
      return { status: "error", message: queue.firstPageErrorMessage };
    }
    if (queue.rows.length === 0) return { status: "empty" };
    return { status: "ready", reports: queue.rows };
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
            {viewState.reports.map((report) => (
              <BlueprintReportCard key={report.reportId} report={report} status={status} />
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

          {/*
            A failed load-more is shown and does not blank the page already loaded — the split
            `useKeysetList` keeps deliberately, because a 422 on a cursor the server issued is a
            real finding.
          */}
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
