"use client";

// TRANSPORT: client-query — `POST /videos/:videoId/reports`.
//
// A 201 IS NOT A VERDICT, and every word of copy in here is written around that. This
// platform has NO automatic hide: commerce takes a review down at three reporters but never
// a product, because "delisting a seller's listing is a commercial action against their
// livelihood and requires a human to take it", and a video is a creator's livelihood by
// exactly that argument. So a report goes to a person, and the confirmation says so.
//
// "Reported" and "Thanks, we've removed it" are the two things this must never say.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { describeEngagementError } from "@/hooks/feed/mutations";
import { useReportVideoMutation } from "@/hooks/videos/content-reports";
import {
  VIDEO_REPORT_REASONS,
  VIDEO_REPORT_REASON_LABELS,
  type VideoReportReason,
} from "@/lib/videos/content-reports.api";

/** Matches `video_content_report_detail_ck`, so the server never has to reject on length. */
const DETAIL_MAX_LENGTH = 2000;

type ReportVideoSheetProps = {
  readonly videoId: string;
  readonly title: string;
  readonly onClose: () => void;
};

/**
 * Three states, as a union rather than two booleans.
 *
 * `submitted` is a terminal state with its own copy, not "idle plus a flag" — the sheet
 * stops being a form once the report is filed, and a union makes rendering the old form
 * alongside the confirmation unrepresentable.
 */
type ReportSheetState =
  | { readonly status: "composing" }
  | { readonly status: "submitting" }
  | { readonly status: "submitted" };

export default function ReportVideoSheet({ videoId, title, onClose }: ReportVideoSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [sheetState, setSheetState] = useState<ReportSheetState>({ status: "composing" });
  const [selectedReason, setSelectedReason] = useState<VideoReportReason | null>(null);
  const [detailText, setDetailText] = useState("");

  const reportVideoMutation = useReportVideoMutation(videoId);

  useEffect(() => {
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    const handlePressOutside = (mouseEvent: MouseEvent) => {
      const pressedNode = mouseEvent.target;
      if (
        pressedNode instanceof Node &&
        panelRef.current &&
        !panelRef.current.contains(pressedNode)
      ) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePressOutside);

    const isSheetViewport = !window.matchMedia("(min-width: 640px)").matches;
    const previousBodyOverflow = document.body.style.overflow;
    if (isSheetViewport) document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePressOutside);
      if (isSheetViewport) document.body.style.overflow = previousBodyOverflow;
    };
  }, [onClose]);

  const handleSubmitClick = () => {
    if (selectedReason === null) return;
    setSheetState({ status: "submitting" });
    const trimmedDetail = detailText.trim();
    reportVideoMutation.mutate(
      {
        reason: selectedReason,
        // OMITTED rather than sent empty: the column is nullable and the backend's check
        // refuses a zero-length string, so "" would be a 422 for a field nobody filled in.
        ...(trimmedDetail === "" ? {} : { detailText: trimmedDetail }),
      },
      {
        onSuccess: () => setSheetState({ status: "submitted" }),
        // Back to the form with the reason still selected — the refusal renders below, and
        // 409 ("already reported") in particular is worth reading rather than retrying.
        onError: () => setSheetState({ status: "composing" }),
      },
    );
  };

  const refusal =
    reportVideoMutation.error === null ? null : describeEngagementError(reportVideoMutation.error);

  return (
    <>
      <button
        type="button"
        aria-label="Close report"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 sm:hidden"
      />

      <div
        ref={panelRef}
        aria-label="Report video"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background pb-8 shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:bottom-auto sm:mt-1 sm:w-80 sm:max-w-[calc(100vw-1rem)] sm:rounded-xl sm:border sm:border-border sm:pb-0"
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 flex-row items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">
            {sheetState.status === "submitted" ? "Report sent" : "Report this video"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
            />
          </button>
        </header>

        {sheetState.status === "submitted" ? (
          <div className="px-4 py-5">
            <p className="text-sm text-foreground">Thanks — a moderator will review this.</p>
            {/*
              THE HONEST SENTENCE, and the one this whole component exists to get right. No
              threshold hides a video on this platform, so nothing has happened to it yet and
              saying otherwise would promise an outcome nobody has decided.
            */}
            <p className="mt-2 text-xs leading-4 text-muted-foreground">
              Reporting doesn&rsquo;t remove a video on its own. You can see what happened to your
              reports in Report history.
            </p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <p className="px-4 pt-3 pb-1 text-xs text-muted-foreground">
                What&rsquo;s wrong with{" "}
                <span className="text-foreground">&ldquo;{title}&rdquo;</span>?
              </p>
              <ul>
                {VIDEO_REPORT_REASONS.map((reason) => (
                  <li key={reason}>
                    <button
                      type="button"
                      aria-pressed={selectedReason === reason}
                      onClick={() => setSelectedReason(reason)}
                      className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted"
                    >
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                          selectedReason === reason ? "border-foreground" : "border-border"
                        }`}
                      >
                        {selectedReason === reason && (
                          <span className="size-2 rounded-full bg-foreground" />
                        )}
                      </span>
                      <span className="text-sm text-foreground">
                        {VIDEO_REPORT_REASON_LABELS[reason]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="px-4 pt-2 pb-3">
                <label htmlFor="report-detail" className="block text-xs text-muted-foreground">
                  Anything else? (optional)
                </label>
                <textarea
                  id="report-detail"
                  value={detailText}
                  maxLength={DETAIL_MAX_LENGTH}
                  onChange={(changeEvent) => setDetailText(changeEvent.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            {refusal !== null && (
              <p role="alert" className="shrink-0 px-4 pb-2 text-xs text-red-700">
                {refusal.message}
              </p>
            )}

            <div className="shrink-0 border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={handleSubmitClick}
                // Disabled until a reason is picked: a report with no reason is one a
                // moderator cannot act on, and the backend's enum has no "unspecified".
                disabled={selectedReason === null || sheetState.status === "submitting"}
                className="w-full cursor-pointer rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sheetState.status === "submitting" ? "Sending…" : "Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
