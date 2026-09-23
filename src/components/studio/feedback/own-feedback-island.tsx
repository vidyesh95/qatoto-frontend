// TRANSPORT: client-query — reads GET /feedback/mine.
"use client";

// `signedOut` IS A VIEW STATE AND IT WINS OVER `loading`, the ordering the admin queues
// established: a disabled React Query sits in `pending` forever, so checking `isPending` first
// would spin permanently for a signed-out viewer. Studio pages render for them too.
//
// The signed-in answer is SEEDED FROM THE SERVER (`hasCallerSession()` threaded down as a prop)
// so the first client render matches the HTML. It is an initial value, not an authority: the
// backend re-authorizes every request regardless.
//
// ⚠️ **NOTHING HERE MAY IMPLY A REPLY IS COMING, INCLUDING BY LAYOUT.** This list looks like
// the support-case list two routes away, and that one IS a conversation: rows link to a thread,
// a staff member writes back, a notification arrives. These rows link nowhere, because there is
// nothing at the other end. The empty state and the header both say so in words rather than
// leaving the resemblance to do the talking.

import { useMemo, useState } from "react";

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { useOwnPlatformFeedbackQuery } from "@/hooks/platform/feedback";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";
import { isUnauthorized } from "@/lib/http";
import {
  PLATFORM_FEEDBACK_CATEGORY_LABELS,
  PLATFORM_FEEDBACK_STATUS_LABELS,
  type OwnPlatformFeedback,
} from "@/lib/platform/feedback.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

type OwnFeedbackViewState =
  | { status: "signedOut" }
  | { status: "loading" }
  | { status: "signInRequired" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; notes: readonly OwnPlatformFeedback[]; hasNextPage: boolean };

/**
 * `reviewed` gets the emphatic treatment because it is the only one of the three that reports
 * something happening after the person pressed send. `new` and `closed` are both resting states.
 *
 * ⚠️ NOT A TRAFFIC LIGHT, and not colour-alone signalling: every pill carries its own word from
 * `PLATFORM_FEEDBACK_STATUS_LABELS`, and the fill only decides which one is worth a glance.
 */
const STATUS_PILL_CLASSES: Readonly<Record<OwnPlatformFeedback["status"], string>> = {
  new: "bg-muted text-muted-foreground",
  reviewed: "bg-foreground text-background",
  closed: "bg-muted text-muted-foreground",
};

export default function OwnFeedbackIsland({ isViewerSignedIn }: { isViewerSignedIn: boolean }) {
  const [isShowingAll, setIsShowingAll] = useState(false);
  const isSignedIn = useViewerSignedIn(isViewerSignedIn);

  const ownFeedbackQuery = useOwnPlatformFeedbackQuery(undefined, isSignedIn);

  const viewState = useMemo<OwnFeedbackViewState>(() => {
    // Before `isPending` — see the header.
    if (!isSignedIn) return { status: "signedOut" };
    if (ownFeedbackQuery.isPending) return { status: "loading" };
    if (ownFeedbackQuery.isError) {
      // A stale cookie that got past the seed. The affordance is signing in, not retrying.
      if (isUnauthorized(ownFeedbackQuery.error.apiError)) return { status: "signInRequired" };
      return { status: "error", message: ownFeedbackQuery.error.apiError.message };
    }

    const notes = ownFeedbackQuery.data.pages.flatMap((page) => page.rows);
    if (notes.length === 0) return { status: "empty" };
    return { status: "ready", notes, hasNextPage: ownFeedbackQuery.hasNextPage };
  }, [isSignedIn, ownFeedbackQuery]);

  switch (viewState.status) {
    case "signedOut":
      return (
        <StatusPanel
          message="Sign in to send feedback, or to read what you have already sent."
          className="border border-border px-6 py-12"
          action={
            <Link
              href="/sign-in"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </Link>
          }
        />
      );
    case "signInRequired":
      return (
        <StatusPanel
          message="Your session has expired. Sign in again to see what you have sent."
          className="border border-border px-6 py-12"
          action={
            <Link
              href="/sign-in"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </Link>
          }
        />
      );
    case "loading":
      return <p className="text-sm text-muted-foreground">Loading…</p>;
    case "error":
      return (
        <StatusPanel message={viewState.message} className="border border-border px-6 py-12" />
      );
    case "empty":
      return (
        <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
          You have not sent any feedback yet. Anything you send shows up here with what the team has
          done with it.
        </p>
      );
    case "ready":
      return (
        <div className="space-y-4">
          <ul className="space-y-2">
            {(isShowingAll ? viewState.notes : viewState.notes.slice(0, 5)).map((note) => (
              // NOT A LINK, DELIBERATELY. There is no feedback detail page and there is nothing
              // to put on one: a note has no thread, no verdict and no correspondence. A row
              // that looked clickable would promise a screen that does not exist.
              <li key={note.feedbackId} className="rounded-xl border border-border px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {PLATFORM_FEEDBACK_CATEGORY_LABELS[note.category]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs leading-4 font-medium ${STATUS_PILL_CLASSES[note.status]}`}
                  >
                    {PLATFORM_FEEDBACK_STATUS_LABELS[note.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-5 whitespace-pre-line text-foreground">
                  {note.message}
                </p>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">
                  Sent {formatIsoInstantLabel(note.createdAt)}
                  {/* The path as TEXT, never a link: the route may have moved or been
                      retired since, and a dead link here would look like a second bug. */}
                  {" · from "}
                  {note.pagePath}
                </p>
              </li>
            ))}
          </ul>

          {(viewState.notes.length > 5 || viewState.hasNextPage) && !isShowingAll && (
            <button
              type="button"
              onClick={() => setIsShowingAll(true)}
              className="cursor-pointer text-sm font-medium text-foreground underline"
            >
              Show everything you have sent
            </button>
          )}

          {isShowingAll && viewState.hasNextPage && (
            <button
              type="button"
              disabled={ownFeedbackQuery.isFetchingNextPage}
              onClick={() => void ownFeedbackQuery.fetchNextPage()}
              className="cursor-pointer text-sm font-medium text-foreground underline disabled:opacity-50"
            >
              {ownFeedbackQuery.isFetchingNextPage ? "Loading…" : "Load older feedback"}
            </button>
          )}
        </div>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
