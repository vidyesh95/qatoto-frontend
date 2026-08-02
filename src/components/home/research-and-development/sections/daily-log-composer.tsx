// TRANSPORT: client-query — "use client" island. Writes POST …/daily-logs,
// PATCH …/:logId and POST …/:logId/submit (202), then polls GET …/:logId while the
// analysis job runs.
"use client";

import { useState } from "react";

import {
  MutationAcceptedNotice,
  MutationErrorNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import { useDailyLogMutation, useDailyLogQuery } from "@/hooks/rnd/workshop";
import { ApiRequestError } from "@/lib/http";
import type { DailyLogAnalysisStatus } from "@/lib/rnd/daily-logs.schemas";
import { newIdempotencyKey } from "@/lib/idempotency";

const ANALYSIS_STATUS_MESSAGES: Record<DailyLogAnalysisStatus, string> = {
  not_requested: "Not analyzed — it has not been submitted yet.",
  queued: "Queued for analysis. Nothing has been read from it yet.",
  running: "Being analyzed now.",
  succeeded: "Analyzed. Chips and extracted claims are on the log itself.",
  failed: "The analysis failed. Your log is safe and can be re-analyzed.",
  // An OPERATOR fact, not a fault of the log — saying "failed" here sends a member
  // chasing a problem with their own writing that does not exist.
  skipped_unconfigured: "Analysis is switched off in this environment. Your log is recorded.",
};

/**
 * Write today's log.
 *
 * **A DRAFT, THEN A SUBMIT — TWO ACTS, NOT ONE.** A draft is private and editable; the
 * submit freezes it, moves the streak and enqueues the analysis in one transaction. That
 * is also why the submit button appears only after a draft exists: there is nothing to
 * submit before it.
 *
 * **SUBMIT ANSWERS `202` AND A RECEIPT.** The streak on that receipt is real. The analysis
 * is merely `queued`, so nothing about what the log is WORTH exists yet — no chips, no
 * extracted claims, no minutes, and certainly no slices. This component polls the detail
 * read and reports the job's status rather than inventing an outcome.
 *
 * **THE IDEMPOTENCY KEY IS MINTED ONCE PER DRAFT**, in state. A retried submit on a flaky
 * connection must return the FIRST receipt rather than file a second log.
 *
 * `youtubeUrl` accepts a bare id or a schemeless link, matching the backend's parser, so
 * the field is deliberately not typed `url` — validating it as one here would reject
 * inputs the server accepts.
 */
export default function DailyLogComposer({ projectSlug }: { projectSlug: string }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draftLogId, setDraftLogId] = useState<string | null>(null);
  const [logDate, setLogDate] = useState("");
  const [narrative, setNarrative] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [submitIdempotencyKey] = useState(newIdempotencyKey);

  const logMutation = useDailyLogMutation(projectSlug);
  // Polls itself while the analysis job runs, and stops the moment it terminates.
  const draftQuery = useDailyLogQuery(projectSlug, draftLogId ?? undefined);

  const logError = logMutation.error instanceof ApiRequestError ? logMutation.error.apiError : null;

  const hasSubmitted = draftQuery.data?.status === "submitted";

  if (!isFormOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsFormOpen(true)}
        className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
      >
        Write today&apos;s log
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <form
        className="space-y-2"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          if (draftLogId === null) {
            logMutation.mutate(
              {
                action: "create",
                input: {
                  logDate,
                  narrative: narrative.trim() || undefined,
                  youtubeUrl: youtubeUrl.trim() || undefined,
                },
              },
              {
                // The mutation returns a union — a log view on create/update/delete, a
                // receipt on submit. Narrowed by key rather than cast, so adding a fifth
                // action cannot silently land in the wrong branch.
                onSuccess: (created) => {
                  if ("id" in created) setDraftLogId(created.id);
                },
              },
            );
            return;
          }
          logMutation.mutate({
            action: "update",
            logId: draftLogId,
            patch: {
              logDate,
              narrative: narrative.trim() || undefined,
              // Explicit null DETACHES the video; omitting it would leave the old one
              // attached, so a cleared field has to send null rather than undefined.
              youtubeUrl: youtubeUrl.trim() === "" ? null : youtubeUrl.trim(),
            },
          });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>Which day is this for?</span>
          <input
            required
            type="date"
            value={logDate}
            onChange={(changeEvent) => setLogDate(changeEvent.target.value)}
            className={INPUT_CLASS}
            disabled={hasSubmitted}
          />
          <span className="text-xs text-muted-foreground">
            The day you worked, not today. A backfilled log is a real thing and the two dates are
            kept apart.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>What did you do?</span>
          <textarea
            rows={4}
            value={narrative}
            onChange={(changeEvent) => setNarrative(changeEvent.target.value)}
            placeholder="What you worked on, what moved, what is blocked"
            className={INPUT_CLASS}
            disabled={hasSubmitted}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>A video, if you recorded one</span>
          <input
            type="text"
            value={youtubeUrl}
            onChange={(changeEvent) => setYoutubeUrl(changeEvent.target.value)}
            placeholder="A YouTube link or id"
            className={INPUT_CLASS}
            disabled={hasSubmitted}
          />
          <span className="text-xs text-muted-foreground">
            The video stays on YouTube. Qatoto reads its transcript and stores nothing of the file.
          </span>
        </label>

        {!hasSubmitted && (
          <button
            type="submit"
            disabled={logMutation.isPending}
            className="cursor-pointer rounded-full border border-[#00696E]/40 px-3 py-1.5 text-xs font-medium text-[#00696E] disabled:opacity-50"
          >
            {draftLogId === null ? "Save as a draft" : "Save changes"}
          </button>
        )}
      </form>

      {draftLogId !== null && !hasSubmitted && (
        <div className="space-y-2 border-t border-[#CAC4D0]/40 pt-3">
          <p className="text-xs text-muted-foreground">
            Submitting freezes this log, moves your streak and queues it for analysis. You cannot
            edit it afterwards.
          </p>
          <button
            type="button"
            disabled={logMutation.isPending}
            onClick={() =>
              logMutation.mutate({
                action: "submit",
                logId: draftLogId,
                idempotencyKey: submitIdempotencyKey,
              })
            }
            className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {logMutation.isPending ? "Submitting…" : "Submit it"}
          </button>
        </div>
      )}

      {/* The 202 made visible: the log is filed, the reading of it has not happened. */}
      {hasSubmitted && draftQuery.data && (
        <div className="space-y-1 border-t border-[#CAC4D0]/40 pt-3">
          <MutationAcceptedNotice
            message={`Submitted. ${ANALYSIS_STATUS_MESSAGES[draftQuery.data.analysisStatus]}`}
          />
          {draftQuery.data.analysisFailureReason !== null && (
            <p className="text-xs text-muted-foreground">{draftQuery.data.analysisFailureReason}</p>
          )}
        </div>
      )}

      {logError !== null && <MutationErrorNotice error={logError} />}
    </div>
  );
}
