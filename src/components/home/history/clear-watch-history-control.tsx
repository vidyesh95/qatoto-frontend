// TRANSPORT: client-query — one mutation over `@/lib/feed/api`.
//
// A TWO-STEP INLINE CONFIRM, NOT A MODAL AND NOT A ONE-CLICK BUTTON.
//
// Clearing is the one write on this surface with NO undo: the backend has no per-call marker to
// reverse by, and a "restore everything hidden" would also resurrect every card the reader
// removed on purpose over the previous 90 days. The confirmation step IS the undo — the same
// trade YouTube makes — so removing it would leave a destructive action one stray click away.
//
// Inline rather than a dialog because this repo has no dialog primitive, and introducing a
// portal, a focus trap and an escape handler for one button is a worse trade than two clicks.

"use client";

import { useState } from "react";

import { describeEngagementError, useClearWatchHistoryMutation } from "@/hooks/feed/mutations";

type ConfirmState =
  | { readonly status: "idle" }
  | { readonly status: "confirming" }
  | { readonly status: "clearing" }
  | { readonly status: "cleared" }
  | { readonly status: "failed"; readonly message: string };

export default function ClearWatchHistoryControl() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({ status: "idle" });
  const clearMutation = useClearWatchHistoryMutation();

  const handleClearConfirmed = () => {
    setConfirmState({ status: "clearing" });
    clearMutation.mutate(undefined, {
      onSuccess: () => {
        // The mutation invalidates the feed queries, so the list below empties on its own.
        // This only reports what happened; it does not remove anything from the screen itself.
        setConfirmState({ status: "cleared" });
      },
      onError: (error) => {
        setConfirmState({
          status: "failed",
          message: describeEngagementError(error).message,
        });
      },
    });
  };

  switch (confirmState.status) {
    case "idle":
      return (
        <button
          type="button"
          onClick={() => {
            setConfirmState({ status: "confirming" });
          }}
          className="text-xs font-medium text-[#6F7979] hover:text-foreground"
        >
          Clear all watch history
        </button>
      );
    case "confirming":
    case "clearing":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-[#6F7979]">
            Clear your whole watch history? This can’t be undone.
          </p>
          <button
            type="button"
            onClick={handleClearConfirmed}
            disabled={confirmState.status === "clearing"}
            className="rounded-full bg-[#00696E] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {confirmState.status === "clearing" ? "Clearing…" : "Clear"}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmState({ status: "idle" });
            }}
            disabled={confirmState.status === "clearing"}
            className="text-xs font-medium text-[#6F7979] hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      );
    case "cleared":
      return <p className="text-xs text-[#6F7979]">Watch history cleared.</p>;
    case "failed":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-[#6F7979]">{confirmState.message}</p>
          <button
            type="button"
            onClick={() => {
              setConfirmState({ status: "confirming" });
            }}
            className="text-xs font-medium text-[#00696E]"
          >
            Try again
          </button>
        </div>
      );
    default: {
      const exhaustiveCheck: never = confirmState;
      return exhaustiveCheck;
    }
  }
}
