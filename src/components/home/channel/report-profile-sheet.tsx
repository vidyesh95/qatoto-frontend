// TRANSPORT: client-query — files one report about somebody's profile.
"use client";

// ⚠️ **A 201 IS NOT A VERDICT, AND NO COPY IN THIS FILE MAY SAY OTHERWISE.**
//
// The rule is fixed across every report surface in this app: a successful write means a row exists,
// not that anybody has read it and not that anything has been removed. "Reported", "we've taken it
// down" and "thanks, that's been actioned" are all forbidden. The backend's own message —
// "Report received. Our team will review it." — is the ceiling, not a starting point.
//
// WHAT UPHOLDING ONE CAN ACTUALLY DO is hide this person's description and links. Not their name,
// not their videos, not their account. The reasons offered below are scoped to exactly that, which
// is why there is no "child safety" option here: offering it would promise an action this system
// cannot take, and answering it by hiding a description would be worse than not offering it. Serious
// harm belongs somewhere with a lever behind it.

import { useState } from "react";

import ModalSheet from "@/components/home/shared/modal-sheet";
import { useReportUserMutation } from "@/hooks/users/user-reports";
import {
  USER_REPORT_REASONS,
  USER_REPORT_REASON_LABELS,
  type UserReportReason,
} from "@/lib/users/user-reports.schemas";

type ReportState =
  | { status: "choosing" }
  | { status: "sending" }
  | { status: "received" }
  | { status: "refused"; message: string };

export default function ReportProfileSheet({
  reportedUserId,
  displayName,
  onClose,
}: {
  readonly reportedUserId: string;
  readonly displayName: string;
  readonly onClose: () => void;
}) {
  const [selectedReason, setSelectedReason] = useState<UserReportReason | null>(null);
  const [detailText, setDetailText] = useState("");
  const [reportState, setReportState] = useState<ReportState>({ status: "choosing" });

  const reportUserMutation = useReportUserMutation();

  async function handleSendClick() {
    if (selectedReason === null) return;
    setReportState({ status: "sending" });
    const trimmedDetail = detailText.trim();
    const result = await reportUserMutation.mutateAsync({
      reportedUserId,
      input: {
        reason: selectedReason,
        ...(trimmedDetail === "" ? {} : { detailText: trimmedDetail }),
      },
    });
    if (result.success) {
      setReportState({ status: "received" });
      return;
    }
    // The server's own sentence, verbatim. A second report is a 409 that says so, and that refusal
    // is more useful than a generic failure — it tells somebody their first one already landed.
    setReportState({ status: "refused", message: result.error.message });
  }

  return (
    <ModalSheet title={`Report ${displayName}`} onClose={onClose}>
      <div className="px-4 pb-5">
        {reportState.status === "received" ? (
          <div>
            {/* NOT "Reported". Not "Removed". The row exists; the decision does not. */}
            <p className="text-sm text-foreground">Report received. Our team will review it.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              We will not tell you what was decided, and nothing on this page changes unless a
              moderator acts.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              This reports the description and links on this channel. It does not report their
              videos — use the report control on a video for that.
            </p>

            <fieldset className="mt-3">
              <legend className="text-xs font-medium text-muted-foreground">
                What is wrong with it?
              </legend>
              <ul className="mt-1 flex flex-col gap-1">
                {USER_REPORT_REASONS.map((reason) => (
                  <li key={reason}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="user-report-reason"
                        checked={selectedReason === reason}
                        onChange={() => {
                          setSelectedReason(reason);
                          setReportState({ status: "choosing" });
                        }}
                        className="size-4 cursor-pointer accent-primary"
                      />
                      <span className="text-sm text-foreground">
                        {USER_REPORT_REASON_LABELS[reason]}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            <label className="mt-3 block">
              <span className="text-xs font-medium text-muted-foreground">
                Anything else? (optional)
              </span>
              <textarea
                value={detailText}
                onChange={(changeEvent) => setDetailText(changeEvent.target.value)}
                rows={3}
                maxLength={2000}
                className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={selectedReason === null || reportState.status === "sending"}
                onClick={() => void handleSendClick()}
                className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reportState.status === "sending" ? "Sending…" : "Send report"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer text-sm font-medium text-foreground underline"
              >
                Cancel
              </button>
            </div>

            {reportState.status === "refused" && (
              <p className="mt-2 text-xs text-destructive">{reportState.message}</p>
            )}
          </>
        )}
      </div>
    </ModalSheet>
  );
}
