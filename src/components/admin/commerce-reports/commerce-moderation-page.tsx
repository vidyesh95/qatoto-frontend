// TRANSPORT: client-query — the report queue, the action log, the decision and the restore all call
// hooks in `@/hooks/store/admin-content-reports`. The capability check reads
// `@/hooks/rnd/platform-roles`.
"use client";

// `/admin/commerce-reports`. What a buyer flagged in the store, and what was done about it.
//
// ONE PAGE WITH TWO TABS, NOT TWO NAV ENTRIES, on `/admin/community`'s argument: that console puts
// four queues on one page because they are ONE SHIFT, and splitting them "would make the report
// queue the one nobody opens". The log here is not even a second job — it is the record of what
// THIS page did, plus the only surface anywhere that shows a hide nobody decided. A read-only log
// sitting in the sidebar beside the queue that writes it would be a destination for a thing that is
// context.
//
// ⚠️ **SEPARATE FROM `/admin/community`, WHICH IS THE NEAR-IDENTICAL NAME.** That queue is
// `moderate_content` over forum threads, replies and cofounder profiles. This is
// `moderate_commerce` over listings, reviews, questions, answers and companies. §17.4 refuses to
// merge them: a counterfeit-listing shift and an off-topic-thread shift are not the same job, and
// merging creates the coupling capabilities exist to prevent.
//
// ⚠️ **AND SEPARATE FROM `/admin/reports`, WHICH IS VIDEO.** Same word, different medium, different
// capability — and unlike video, THIS surface has an automatic hide.

import { useState } from "react";

import CommerceModerationActionLog from "@/components/admin/commerce-reports/commerce-moderation-action-log";
import CommerceReportQueue from "@/components/admin/commerce-reports/commerce-report-queue";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  COMMERCE_CONTENT_TARGET_KINDS,
  COMMERCE_CONTENT_TARGET_KIND_NOUNS,
  COMMERCE_REPORT_STATUSES,
  COMMERCE_REPORT_STATUS_LABELS,
  type CommerceContentTargetKind,
  type CommerceReportStatus,
} from "@/lib/store/content-reports.schemas";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

/**
 * Which half of the console is on screen.
 *
 * A union rather than a boolean, because a third tab is a plausible future (disputes have their own
 * `/commerce/admin` pair) and `isShowingLog` would then have to become one anyway.
 */
type ModerationTab = "reports" | "log";

/**
 * ⚠️ **`restricted` IS A VIEW STATE AND IT WINS OVER `loading`.** "Nothing to show because you may
 * not look" is a different answer from "nothing to show", and a disabled React Query sits in
 * `pending` forever — so a page that checks `isPending` first renders a spinner that never resolves
 * for anyone without the capability. `community-moderation-page.tsx` established both the union and
 * that ordering; `capabilityUnknown` is the third case those consoles also say apart, because
 * failing to CHECK a permission is not the same as failing it.
 */
type ModerationConsoleState =
  | { readonly status: "checking" }
  | { readonly status: "capabilityUnknown" }
  | { readonly status: "restricted"; readonly platformRole: string | null }
  | { readonly status: "permitted" };

export default function CommerceModerationPage() {
  const [activeTab, setActiveTab] = useState<ModerationTab>("reports");
  const [statusFilter, setStatusFilter] = useState<CommerceReportStatus>("open");
  const [targetKindFilter, setTargetKindFilter] = useState<CommerceContentTargetKind | "all">(
    "all",
  );

  const staffContextQuery = useOwnStaffContextQuery();

  const consoleState: ModerationConsoleState = staffContextQuery.isError
    ? { status: "capabilityUnknown" }
    : !staffContextQuery.isSuccess
      ? { status: "checking" }
      : staffContextQuery.data.capabilities.includes("moderate_commerce")
        ? { status: "permitted" }
        : { status: "restricted", platformRole: staffContextQuery.data.platformRole };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Store reports</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Listings, reviews, questions, answers and companies that buyers have flagged. A listing or
          a company is never taken down automatically — that needs someone here. A review, question
          or answer can be hidden by several reports at once, and the log below is where that shows.
        </p>
      </header>

      {renderConsole(consoleState, {
        activeTab,
        setActiveTab,
        statusFilter,
        setStatusFilter,
        targetKindFilter,
        setTargetKindFilter,
      })}
    </div>
  );
}

type ConsoleControls = {
  readonly activeTab: ModerationTab;
  readonly setActiveTab: (tab: ModerationTab) => void;
  readonly statusFilter: CommerceReportStatus;
  readonly setStatusFilter: (status: CommerceReportStatus) => void;
  readonly targetKindFilter: CommerceContentTargetKind | "all";
  readonly setTargetKindFilter: (targetKind: CommerceContentTargetKind | "all") => void;
};

function renderConsole(state: ModerationConsoleState, controls: ConsoleControls) {
  switch (state.status) {
    case "checking":
      return <div className="h-28 animate-pulse rounded-2xl bg-muted/40" aria-hidden />;
    case "capabilityUnknown":
      return (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Couldn&apos;t check your permissions, so nothing here is loaded.
        </output>
      );
    case "restricted":
      return (
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Working store reports needs the `moderate_commerce` capability. Your role is{" "}
          {state.platformRole ?? "none"}, so this page is not loaded.
        </output>
      );
    case "permitted":
      return <PermittedConsole controls={controls} />;
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

function PermittedConsole({ controls }: { readonly controls: ConsoleControls }) {
  const {
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    targetKindFilter,
    setTargetKindFilter,
  } = controls;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={
            activeTab === "reports"
              ? `${QUIET_BUTTON_CLASS} text-primary outline-primary`
              : QUIET_BUTTON_CLASS
          }
        >
          Reports
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("log")}
          className={
            activeTab === "log"
              ? `${QUIET_BUTTON_CLASS} text-primary outline-primary`
              : QUIET_BUTTON_CLASS
          }
        >
          Moderation log
        </button>
      </div>

      {activeTab === "reports" && (
        <div className="flex flex-wrap gap-2">
          {COMMERCE_REPORT_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={
                status === statusFilter
                  ? `${QUIET_BUTTON_CLASS} text-primary outline-primary`
                  : QUIET_BUTTON_CLASS
              }
            >
              {COMMERCE_REPORT_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      )}

      {/*
        THE KIND FILTER SERVES BOTH TABS — it is the one query parameter the moderation-action
        route actually reads.

        ⚠️ **THERE IS NO STATUS FILTER ON THE LOG TAB AND THAT IS DELIBERATE.** The backend shares
        one query schema between the two reads, so `?status=` PARSES there and is then never read
        by `listModerationActions`. A status control on the log would change the query key,
        refetch, and return byte-identical rows — a filter that looks like it works and does not.
      */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTargetKindFilter("all")}
          className={
            targetKindFilter === "all"
              ? `${QUIET_BUTTON_CLASS} text-primary outline-primary`
              : QUIET_BUTTON_CLASS
          }
        >
          Everything
        </button>
        {COMMERCE_CONTENT_TARGET_KINDS.map((targetKind) => (
          <button
            key={targetKind}
            type="button"
            onClick={() => setTargetKindFilter(targetKind)}
            className={
              targetKind === targetKindFilter
                ? `${QUIET_BUTTON_CLASS} text-primary outline-primary`
                : QUIET_BUTTON_CLASS
            }
          >
            {COMMERCE_CONTENT_TARGET_KIND_NOUNS[targetKind]}
          </button>
        ))}
      </div>

      {/*
        KEYED BY THE FILTERS so changing one REMOUNTS the list rather than reusing one accumulator
        across two different questions — which is also what clears the cursor. A keyset cursor is
        scoped to the query that issued it; carrying one across a filter change is a 422, not a
        reset.
      */}
      {activeTab === "reports" ? (
        <CommerceReportQueue
          key={`${statusFilter}:${targetKindFilter}`}
          status={statusFilter}
          targetKind={targetKindFilter}
        />
      ) : (
        <CommerceModerationActionLog key={targetKindFilter} targetKind={targetKindFilter} />
      )}
    </>
  );
}
