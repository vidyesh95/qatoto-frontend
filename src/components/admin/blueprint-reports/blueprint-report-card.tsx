// TRANSPORT: client-query — one report, and the four verbs that answer it.
"use client";

import { useState } from "react";

import {
  useBlueprintModerationMutation,
  useDismissBlueprintReportMutation,
} from "@/hooks/blueprints/content-moderation";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import type {
  BlueprintModerationVerb,
  BlueprintReportArmFilter,
  BlueprintReportQueueItem,
  BlueprintReportStatus,
} from "@/lib/blueprints/admin-reports.schemas";
import { BLUEPRINT_REPORT_REASON_LABELS } from "@/lib/blueprints/reports.schemas";

const NOTE_CLASS =
  "mt-1 w-full resize-y rounded-md border border-outline-variant/60 bg-background px-2.5 py-1.5 text-sm";
const ACTION_CLASS =
  "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium outline -outline-offset-1 outline-border disabled:cursor-default disabled:opacity-40";

const TARGET_KIND_LABELS: Record<BlueprintReportArmFilter, string> = {
  teardown: "Teardown",
  case_study: "Case study",
  showcase: "Showcase",
};

const TARGET_KIND_SEGMENTS: Record<BlueprintReportArmFilter, string> = {
  teardown: "teardowns",
  case_study: "case-studies",
  showcase: "showcase",
};

/**
 * One queued report.
 *
 * ⚠️ EVERY VERB REQUIRES A NOTE, `restore` INCLUDED. The server's column is NOT NULL and the reason
 * is sharper than symmetry: a restore OVERTURNS ANOTHER MODERATOR'S QUARANTINE, and the record of
 * why is the only thing that stops the pair being re-litigated silently.
 *
 * ⚠️ `Quarantine` IS HIDDEN ON THE CASE-STUDY AND SHOWCASE ARMS. `case_study_moderation_state_ck`
 * and showcase_launch have no such label — only a teardown has files to withhold — and the server
 * answers 409 with a sentence saying so. Hiding the control means a moderator does not have to
 * discover that by pressing it.
 *
 * ⚠️ THE OPEN COUNT IS CONTEXT, NEVER A THRESHOLD. It is shown so a pile-up is visible; nothing
 * reads it as a trigger and no threshold exists to publish.
 */
export default function BlueprintReportCard({
  report,
  status,
}: {
  readonly report: BlueprintReportQueueItem;
  readonly status: BlueprintReportStatus;
}) {
  const [note, setNote] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();
  const moderate = useBlueprintModerationMutation(status);
  const dismiss = useDismissBlueprintReportMutation(status);

  const isBusy = moderate.isPending || dismiss.isPending;
  const canQuarantine = report.targetKind === "teardown";
  const trimmedNote = note.trim();

  async function runVerb(verb: BlueprintModerationVerb): Promise<void> {
    if (trimmedNote === "") {
      setRefusal("Say why. This is the record of the decision.");
      return;
    }
    setRefusal(null);
    const result = await moderate.mutateAsync({
      targetKind: report.targetKind,
      targetId: report.targetId,
      verb,
      reasonNote: trimmedNote,
      reportId: report.reportId,
      idempotencyKey: getIdempotencyKey(),
    });
    if (result.success) {
      setNote("");
      resetIdempotencyKey();
      return;
    }
    // ⚠️ THE KEY IS ROTATED ON A REFUSAL. The next attempt is a different request; replaying the
    // old key would hand back the failure that was already stored against it.
    resetIdempotencyKey();
    setRefusal(result.error.message);
  }

  async function runDismiss(): Promise<void> {
    if (trimmedNote === "") {
      setRefusal("Say why this report is being dismissed.");
      return;
    }
    setRefusal(null);
    const result = await dismiss.mutateAsync({
      reportId: report.reportId,
      resolutionNote: trimmedNote,
      idempotencyKey: getIdempotencyKey(),
    });
    if (result.success) {
      setNote("");
      resetIdempotencyKey();
      return;
    }
    resetIdempotencyKey();
    setRefusal(result.error.message);
  }

  return (
    <li className="rounded-2xl border border-outline-variant/60 bg-background p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium text-foreground">{report.targetTitle}</p>
        <p className="text-xs text-muted-foreground">
          {TARGET_KIND_LABELS[report.targetKind]} ·{" "}
          <span className="font-medium">{report.targetModerationState}</span>
        </p>
      </div>

      <p className="mt-2 text-sm text-foreground">
        {BLUEPRINT_REPORT_REASON_LABELS[report.reason]}
      </p>
      {report.detailText === null ? null : (
        <p className="mt-1 max-w-prose text-sm whitespace-pre-wrap text-muted-foreground">
          {report.detailText}
        </p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Reported by{" "}
        {report.reporterHandle === null ? "a deleted account" : `@${report.reporterHandle}`}
        {report.openReportCount > 1
          ? ` · ${String(report.openReportCount)} open reports about this page`
          : ""}
        {report.targetSlug === null ? null : (
          <>
            {" · "}
            <a
              href={`/blueprints/${TARGET_KIND_SEGMENTS[report.targetKind]}/${report.targetSlug}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary-imprint underline-offset-2 hover:underline"
            >
              Open the page
            </a>
          </>
        )}
      </p>

      <label htmlFor={`note-${report.reportId}`} className="mt-3 block text-xs font-medium">
        Why — recorded against the decision, and shown to nobody but staff
      </label>
      <textarea
        id={`note-${report.reportId}`}
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
        }}
        rows={2}
        disabled={isBusy}
        className={NOTE_CLASS}
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void runVerb("flag")}
          className={ACTION_CLASS}
        >
          Flag
        </button>
        {canQuarantine ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void runVerb("quarantine")}
            className={ACTION_CLASS}
          >
            Quarantine
          </button>
        ) : null}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void runVerb("restore")}
          className={ACTION_CLASS}
        >
          Restore
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void runDismiss()}
          className={ACTION_CLASS}
        >
          Dismiss the report
        </button>
      </div>

      {refusal === null ? null : (
        <output className="mt-2 block text-xs text-destructive">{refusal}</output>
      )}

      {/*
        ⚠️ SAID ONCE, ON EVERY CARD. Dismissing answers the READER; it does not change the page.
        A moderator who assumed otherwise would dismiss a report about something they had flagged
        and expect the flag to lift.
      */}
      <p className="mt-2 text-xs text-muted-foreground">
        Dismissing closes the report and changes nothing about the page. Use Restore for that.
      </p>
    </li>
  );
}
