"use client";

// TRANSPORT: client-query — `POST /commerce/reports`.
//
// ONE SHEET FOR ALL FIVE TARGET KINDS, mounted on the product page, on a review, on a question, on
// an answer and on a company storefront. A per-kind sheet would be five places for the copy below
// to drift, and the copy is the part that has to be right.
//
// ⚠️ **A 201 IS NOT A VERDICT, AND THE CONFIRMATION BRANCHES ON TARGET KIND BECAUSE THE CONTRACT
// GENUINELY DIFFERS.** A product and an organization NEVER hide automatically — the backend's own
// reason is that "delisting a seller's listing is a commercial action against their livelihood" and
// a person has to take it. A review, question or answer DOES hide once several distinct people have
// open reports against it, in the same transaction as the insert, and goes back up if a moderator
// dismisses. Pasting the video sheet's "nothing here happens automatically" onto a review would be
// a plain false statement, so `doesTargetKindAutoHide` picks the sentence.
//
// ⚠️ **THE THRESHOLD NUMBER IS NEVER PRINTED.** "Three reports hides this" is a griefing recipe and
// the number is the server's to change. "Several different people" is true at any value.
//
// ⚠️ **NEVER SAY "Removed", "Taken down" or "Thanks, we've dealt with it", and never show a
// "Reported ✓" tick.** And never link to Report history — that page lists VIDEO reports, there is
// no commerce equivalent, and a reporter who followed it would find nothing and conclude their
// report was never filed.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { useReportCommerceContentMutation } from "@/hooks/store/content-reports";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  COMMERCE_CONTENT_TARGET_KIND_LABELS,
  COMMERCE_REPORT_REASONS,
  COMMERCE_REPORT_REASON_LABELS,
  doesTargetKindAutoHide,
  type CommerceContentTargetKind,
  type CommerceReportReason,
} from "@/lib/store/content-reports.schemas";

/** Matches the backend's `.max(2000)`, so the server never has to refuse on length. */
const DETAIL_MAX_LENGTH = 2000;

/**
 * Four states, as a union rather than a bag of booleans.
 *
 * ⚠️ **`alreadyReported` IS A TERMINAL STATE, NOT AN INLINE ERROR, AND THIS IS THE ONE REAL
 * DEPARTURE FROM `report-video-sheet.tsx`.** There is no reporter-side read anywhere on this
 * surface, so a `409` is the ONLY way a person ever learns their earlier report exists. Rendered as
 * a red line under a live "Report" button, they simply press it again — and get the same 409. As a
 * state, the sheet stops being a form and says what happened.
 */
type ContentReportSheetState =
  | { readonly status: "composing" }
  | { readonly status: "submitting" }
  | { readonly status: "submitted" }
  | { readonly status: "alreadyReported" };

type ReportContentSheetProps = {
  readonly targetKind: CommerceContentTargetKind;
  /**
   * The target's INTERNAL id, never a slug.
   *
   * ⚠️ The backend matches `product.id`, `commerceReview.id`, `commerceProductQuestion.id`,
   * `commerceProductAnswer.id` and `commerceOrganization.id`. The product page addresses itself by
   * `publicSlug` everywhere else, so passing the slug here is a 404 that looks exactly like a
   * missing product — the same trap the Q&A create had with `productId` versus the slug.
   */
  readonly targetId: string;
  /** What the reporter is looking at, quoted back so they can see they picked the right row. */
  readonly targetLabel: string;
  readonly onClose: () => void;
};

export default function ReportContentSheet({
  targetKind,
  targetId,
  targetLabel,
  onClose,
}: ReportContentSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [sheetState, setSheetState] = useState<ContentReportSheetState>({ status: "composing" });
  const [selectedReason, setSelectedReason] = useState<CommerceReportReason | null>(null);
  const [detailText, setDetailText] = useState("");

  const reportMutation = useReportCommerceContentMutation();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

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

  const [refusalMessage, setRefusalMessage] = useState<string | null>(null);

  const handleSubmitClick = () => {
    if (selectedReason === null) return;
    setSheetState({ status: "submitting" });
    setRefusalMessage(null);
    const trimmedDetail = detailText.trim();
    reportMutation.mutate(
      {
        input: {
          targetKind,
          targetId,
          reason: selectedReason,
          // OMITTED, never `""` and never null: the field is `.optional()` with an inner
          // `.min(1)` inside a `.strict()` body, so both spellings are a 422 for a box nobody
          // typed in.
          ...(trimmedDetail === "" ? {} : { detailText: trimmedDetail }),
        },
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            // Rotated ONLY here. A second report from this same mounted sheet — a different
            // review on the same page — must not replay the first one into silence.
            resetIdempotencyKey();
            setSheetState({ status: "submitted" });
            return;
          }
          // BRANCHED ON THE CODE, NEVER ON THE MESSAGE. A backend copy edit must not break a
          // state machine, and `REPORT_ALREADY_RESOLVED` cannot arise on a create, so 409 here
          // is unambiguously "you already reported this".
          if (result.error.code === "409") {
            setSheetState({ status: "alreadyReported" });
            return;
          }
          // Everything else returns to the form with the reason still selected. The 422
          // self-report refusal renders its own sentence — it shares a status with schema
          // failure, and "check the highlighted fields" would be a lie about a rule.
          setRefusalMessage(result.error.message);
          setSheetState({ status: "composing" });
        },
        onError: (error) => {
          setRefusalMessage(error.message);
          setSheetState({ status: "composing" });
        },
      },
    );
  };

  const headerText =
    sheetState.status === "submitted"
      ? "Report sent"
      : sheetState.status === "alreadyReported"
        ? "Already reported"
        : `Report ${COMMERCE_CONTENT_TARGET_KIND_LABELS[targetKind]}`;

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
        aria-label="Report content"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background pb-8 shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:bottom-auto sm:mt-1 sm:w-80 sm:max-w-[calc(100vw-1rem)] sm:rounded-xl sm:border sm:border-border sm:pb-0"
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 flex-row items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">{headerText}</h2>
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
            <p className="text-sm text-foreground">Thanks — a moderator will read this.</p>
            {doesTargetKindAutoHide(targetKind) ? (
              <p className="mt-2 text-xs leading-4 text-muted-foreground">
                Your report on its own doesn&rsquo;t remove anything. If several different people
                report the same thing it can be hidden while a moderator looks, and it goes straight
                back up if they decide it&rsquo;s fine.
              </p>
            ) : (
              <p className="mt-2 text-xs leading-4 text-muted-foreground">
                Reporting doesn&rsquo;t take this down. Nothing here happens automatically — that is
                a commercial decision about someone&rsquo;s livelihood, and a person has to make it.
              </p>
            )}
          </div>
        ) : sheetState.status === "alreadyReported" ? (
          <div className="px-4 py-5">
            <p className="text-sm text-foreground">You&rsquo;ve already reported this.</p>
            <p className="mt-2 text-xs leading-4 text-muted-foreground">
              It&rsquo;s with a moderator. Reporting it again doesn&rsquo;t move it up the queue.
            </p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <p className="px-4 pt-3 pb-1 text-xs text-muted-foreground">
                What&rsquo;s wrong with{" "}
                <span className="text-foreground">&ldquo;{targetLabel}&rdquo;</span>?
              </p>
              <ul>
                {COMMERCE_REPORT_REASONS.map((reason) => (
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
                        {COMMERCE_REPORT_REASON_LABELS[reason]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="px-4 pt-2 pb-3">
                <label
                  htmlFor="commerce-report-detail"
                  className="block text-xs text-muted-foreground"
                >
                  Anything else? (optional)
                </label>
                <textarea
                  id="commerce-report-detail"
                  value={detailText}
                  maxLength={DETAIL_MAX_LENGTH}
                  onChange={(changeEvent) => setDetailText(changeEvent.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            {refusalMessage !== null && (
              <p role="alert" className="shrink-0 px-4 pb-2 text-xs text-red-700">
                {refusalMessage}
              </p>
            )}

            <div className="shrink-0 border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={handleSubmitClick}
                // Disabled until a reason is picked: the enum has no "unspecified", and a report
                // with no reason is one a moderator cannot act on.
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
