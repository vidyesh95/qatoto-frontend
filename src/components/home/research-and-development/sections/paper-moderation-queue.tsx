// TRANSPORT: client-query — the report queue is fetched on demand and every verdict is a mutation.
"use client";

import { useState } from "react";

import {
  useDismissContentReportMutation,
  useModerateProgramPaperMutation,
  useProgramModerationActionsQuery,
  useProgramModerationQueueQuery,
} from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";
import { formatIsoInstant } from "@/lib/rnd/format";
import {
  RESEARCH_MODERATION_ACTION_LABELS,
  RESEARCH_PAPER_MODERATION_STATUS_LABELS,
} from "@/lib/rnd/labels";
import type { ContentReportReason, ResearchPaper } from "@/lib/rnd/research-programs.schemas";

import { MutationErrorNotice } from "./mutation-feedback";

const REPORT_REASON_LABELS: Record<ContentReportReason, string> = {
  spam: "Spam",
  plagiarism: "Plagiarism",
  misinformation: "Misinformation",
  harassment: "Harassment",
  off_topic: "Off topic",
  other: "Something else",
};

type PaperModerationQueueProps = {
  programSlug: string;
  /**
   * Papers awaiting review, read server-side with the moderator's own session so the queue is
   * populated on first paint rather than after a client round trip.
   */
  queuedPapers: ResearchPaper[];
};

/**
 * The moderator's queue: papers awaiting a verdict, and open content reports.
 *
 * ONLY RENDERED FOR A `moderate_content` HOLDER. The server page decides that; this component
 * assumes it, and its query would 403 for anyone else.
 *
 * EVERY VERDICT IS TERMINAL AND AUDITED. A paper is reviewed once — a second verdict is a 409 —
 * and each decision appends to the platform audit chain in the same transaction as the row it
 * changes. So these buttons are not undo-able, and they do not pretend to be.
 *
 * THE REVIEWER NOTE IS REQUIRED ON EVERY PATH, approval included: "yes" and "no" without a reason
 * are both decisions somebody will later need explained. The mock had no note field at all.
 */
export default function PaperModerationQueue({
  programSlug,
  queuedPapers,
}: PaperModerationQueueProps) {
  const queueQuery = useProgramModerationQueueQuery(programSlug, { isEnabled: true });
  const paperVerdictMutation = useModerateProgramPaperMutation(programSlug);
  const dismissMutation = useDismissContentReportMutation(programSlug);
  const actionsQuery = useProgramModerationActionsQuery(programSlug, { isEnabled: true });

  const [noteByPaperId, setNoteByPaperId] = useState<Record<string, string>>({});
  const [noteByReportId, setNoteByReportId] = useState<Record<string, string>>({});

  const firstError = [paperVerdictMutation.error, dismissMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  const openReports = queueQuery.data?.reports ?? [];

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Moderator view. Every decision here is recorded against your name in the platform audit
        chain, and a paper can only be reviewed once.
      </p>

      {firstError && <MutationErrorNotice error={firstError.apiError} />}

      <section className="space-y-3">
        <h3 className="text-sm font-medium">
          Papers awaiting review
          {queueQuery.data ? ` (${String(queueQuery.data.queuedPaperCount)})` : ""}
        </h3>

        {queuedPapers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting.</p>
        ) : (
          <ul className="space-y-3">
            {queuedPapers.map((paper) => (
              <li
                key={paper.paperId}
                className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{paper.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {paper.uploader.name}
                    {paper.authorAffiliation ? ` · ${paper.authorAffiliation}` : ""} ·{" "}
                    {paper.categoryDisplayLabel} · submitted {formatIsoInstant(paper.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {paper.hasFile ? "PDF attached" : "No file — DOI only"}
                    {paper.doi ? ` · DOI ${paper.doi}` : ""}
                  </p>
                </div>

                <textarea
                  value={noteByPaperId[paper.paperId] ?? ""}
                  onChange={(event) =>
                    setNoteByPaperId((notes) => ({
                      ...notes,
                      [paper.paperId]: event.target.value,
                    }))
                  }
                  maxLength={2000}
                  rows={2}
                  placeholder="Why? The author reads this."
                  className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
                />

                <div className="flex flex-wrap gap-2">
                  {(["approved", "needs_changes", "rejected"] as const).map((decision) => (
                    <button
                      key={decision}
                      type="button"
                      disabled={
                        paperVerdictMutation.isPending ||
                        !(noteByPaperId[paper.paperId] ?? "").trim()
                      }
                      onClick={() =>
                        paperVerdictMutation.mutate({
                          paperId: paper.paperId,
                          decision,
                          reviewerNote: (noteByPaperId[paper.paperId] ?? "").trim(),
                          flagReasons: [],
                        })
                      }
                      className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        decision === "approved"
                          ? "bg-[#00696E] text-white hover:bg-[#00393C]"
                          : decision === "rejected"
                            ? "border border-[#BA1A1A] text-[#BA1A1A] hover:bg-[#BA1A1A]/10"
                            : "border border-[#CAC4D0] hover:bg-muted"
                      }`}
                    >
                      {RESEARCH_PAPER_MODERATION_STATUS_LABELS[decision]}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Open reports ({openReports.length})</h3>

        {queueQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading reports…</p>
        ) : openReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open reports.</p>
        ) : (
          <ul className="space-y-3">
            {openReports.map((report) => (
              <li
                key={report.reportId}
                className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {REPORT_REASON_LABELS[report.reason]} · {report.targetKind}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reported by {report.reporterName ?? "a former contributor"} ·{" "}
                    {formatIsoInstant(report.createdAt)}
                  </p>
                  {report.detailText && (
                    <p className="rounded-lg bg-muted p-2 text-xs">{report.detailText}</p>
                  )}
                </div>

                <input
                  value={noteByReportId[report.reportId] ?? ""}
                  onChange={(event) =>
                    setNoteByReportId((notes) => ({
                      ...notes,
                      [report.reportId]: event.target.value,
                    }))
                  }
                  maxLength={2000}
                  placeholder="Why is this fine?"
                  className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      dismissMutation.isPending || !(noteByReportId[report.reportId] ?? "").trim()
                    }
                    onClick={() =>
                      dismissMutation.mutate({
                        reportId: report.reportId,
                        reasonNote: (noteByReportId[report.reportId] ?? "").trim(),
                      })
                    }
                    className="cursor-pointer rounded-full border border-[#CAC4D0] px-4 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Dismiss — nothing wrong here
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {/*
                      Hiding is the other outcome, and it deliberately lives on the post itself in
                      the discussion feed — so a moderator reads the content in context before
                      acting on it, rather than acting on a reason code alone.
                    */}
                    To act on it, hide the post from the discussion feed.
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Decision log</h3>
        {/*
          This domain's queryable view of the PLATFORM AUDIT CHAIN. Every row here was written in
          the same transaction as the decision it records, and each carries the `auditEntryId` of
          its tamper-evident counterpart — so "was this reviewed, and by whom" has an answer that
          does not depend on anyone's memory.

          The role is the one held AT THE TIME, snapshotted, because roles are revocable and a
          join would quietly rewrite history.
        */}
        {actionsQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Loading the decision log…</p>
        ) : !actionsQuery.data || actionsQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No moderation decisions have been recorded for this programme.
          </p>
        ) : (
          <ol className="space-y-2">
            {actionsQuery.data.map((action) => (
              <li
                key={action.actionId}
                className="rounded-xl border border-[#CAC4D0]/60 p-3 text-xs"
              >
                <p className="font-medium">
                  {RESEARCH_MODERATION_ACTION_LABELS[action.actionKind]}
                </p>
                <p className="text-muted-foreground">
                  {action.moderatorName} ({action.moderatorRoleSnapshot}) ·{" "}
                  {formatIsoInstant(action.createdAt)}
                </p>
                <p className="mt-1">{action.reasonNote}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
