"use client";

import { useState } from "react";

// Reject-with-reason modal, layered above the review detail. The reason is
// sent back to the creator with the rejection (mock phase: it lands on the
// video's status and the audit log).
type RejectReasonModalProps = {
  episodeTitle: string;
  onSubmitRejection: (rejectionReason: string) => void;
  onCancel: () => void;
};

export default function RejectReasonModal({
  episodeTitle,
  onSubmitRejection,
  onCancel,
}: RejectReasonModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");

  const isRejectDisabled = rejectionReason.trim() === "";

  function handleRejectClick() {
    if (isRejectDisabled) return;
    onSubmitRejection(rejectionReason.trim());
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cancel rejection"
        onClick={onCancel}
        className="fixed inset-0 z-80 cursor-default bg-black/40"
      />
      <div className="fixed inset-x-4 top-1/2 z-90 mx-auto flex max-h-[80dvh] w-auto max-w-sm -translate-y-1/2 flex-col overflow-y-auto rounded-2xl border border-black/10 bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-foreground">Reject “{episodeTitle}”?</h2>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="rejection-reason" className="text-sm font-medium text-foreground">
            Reason sent to the creator (required)
          </label>
          <textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Explain what needs to change before resubmission"
            rows={4}
            className="rounded-lg border border-border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRejectClick}
            disabled={isRejectDisabled}
            className="cursor-pointer rounded-full bg-destructive px-5 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      </div>
    </>
  );
}
