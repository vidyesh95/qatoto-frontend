// TRANSPORT: client-query — seeded with the server's first page of `?mode=watched`, then
// paginates and edits.
//
// THIS IS THE ONLY PLACE ON THE SURFACE THAT KNOWS WHAT "TODAY" MEANS, and that is why it is a
// client island. A date heading is a function of the reader's clock AND their time zone;
// computing one during a server render bakes it into the `cacheComponents` entry, and the page
// then insists a video was watched "Today" for as long as that entry lives. Same bug, same fix
// as `@/components/home/shared/relative-time.tsx`: render the deterministic UTC form first,
// swap to the reader's own day once hydration has committed.
//
// REMOVAL IS NOT OPTIMISTIC. A card that disappears before the server agrees offers an Undo for
// a removal that never happened — and Undo is a second call, which would then answer
// `restoredSessionCount: 0` and strand the row in a state neither side can explain.

"use client";

import { useState } from "react";

import FeedStatusPanel from "@/components/home/feed/feed-status-panel";
import LoadMoreControl from "@/components/home/shared/load-more-control";
import VideoCard from "@/components/home/shared/video-card";
import { useFeedVideosInfiniteQuery } from "@/hooks/feed/queries";
import {
  describeEngagementError,
  useHideFromWatchHistoryMutation,
  useRestoreToWatchHistoryMutation,
} from "@/hooks/feed/mutations";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import {
  toLocalDateKeyOf,
  toLocalDateLabel,
  toUtcDateKey,
  toWatchHistoryDateGroups,
} from "@/lib/feed/history-grouping";
import { toVideoCardProps, type FeedVideoPage } from "@/lib/feed/schemas";

/** The filter this list is pinned to. Declared once so the key and the read cannot drift. */
const WATCH_HISTORY_FILTER = { mode: "watched", categorySlug: undefined } as const;

/**
 * What happened to a row the reader removed.
 *
 * A DISCRIMINATED UNION RATHER THAN TWO BOOLEANS, because "removing" and "removed" and "the
 * removal failed" are three states and a `isRemoving`/`didFail` pair admits a fourth that means
 * nothing. `gone` is the case the API forces us to model: the session rows can age past the
 * backend's 90-day prune between the removal and the Undo, and then the card is not coming back.
 */
type RemovedRowState =
  | { readonly status: "removing" }
  | { readonly status: "removed" }
  | { readonly status: "restoring" }
  | { readonly status: "gone" }
  | { readonly status: "failed"; readonly message: string };

export default function HistoryList({
  initialPage,
  limit,
}: {
  readonly initialPage: FeedVideoPage;
  readonly limit: number;
}) {
  const history = useFeedVideosInfiniteQuery({
    filter: WATCH_HISTORY_FILTER,
    initialPage,
    limit,
  });
  const isHydrated = useIsHydrated();
  const hideMutation = useHideFromWatchHistoryMutation();
  const restoreMutation = useRestoreToWatchHistoryMutation();

  // Keyed by videoId and held HERE rather than in the query cache. `feedKeys.videos` is an
  // infinite query with `staleTime: Infinity`; invalidating it to drop one row would refetch
  // page one and throw away every page the reader scrolled. The cost of this choice is that
  // `pagination.total` drifts by the number removed until the next full load.
  const [removedRows, setRemovedRows] = useState<ReadonlyMap<string, RemovedRowState>>(new Map());

  const setRowState = (videoId: string, state: RemovedRowState) => {
    setRemovedRows((previous) => new Map(previous).set(videoId, state));
  };
  const clearRowState = (videoId: string) => {
    setRemovedRows((previous) => {
      const next = new Map(previous);
      next.delete(videoId);
      return next;
    });
  };

  const handleRemoveClick = (videoId: string) => {
    setRowState(videoId, { status: "removing" });
    hideMutation.mutate(videoId, {
      onSuccess: () => {
        setRowState(videoId, { status: "removed" });
      },
      onError: (error) => {
        setRowState(videoId, {
          status: "failed",
          message: describeEngagementError(error).message,
        });
      },
    });
  };

  const handleUndoClick = (videoId: string) => {
    setRowState(videoId, { status: "restoring" });
    restoreMutation.mutate(videoId, {
      onSuccess: (result) => {
        // ZERO IS A REAL ANSWER, not a no-op to ignore: the rows aged past the 90-day prune
        // between the removal and this click, so the card genuinely cannot come back and
        // re-rendering it would be a lie the next reload corrects.
        if (result.restoredSessionCount === 0) {
          setRowState(videoId, { status: "gone" });
          return;
        }
        clearRowState(videoId);
      },
      onError: (error) => {
        setRowState(videoId, {
          status: "failed",
          message: describeEngagementError(error).message,
        });
      },
    });
  };

  // BEFORE hydration the keys are UTC and the labels are absolute dates — deterministic, and
  // identical on the server and on the hydration render. AFTER, both switch to the reader's own
  // calendar day. `dateKey` stays a `YYYY-MM-DD` string across the swap, so React keys survive.
  const groups = toWatchHistoryDateGroups(
    history.videos,
    isHydrated ? toLocalDateKeyOf : toUtcDateKey,
    isHydrated ? (dateKey) => toLocalDateLabel(dateKey, Date.now()) : (dateKey) => dateKey,
  );

  if (history.videos.length === 0) {
    return <FeedStatusPanel message="You haven't watched anything yet." />;
  }

  return (
    <>
      {groups.map((group) => (
        <section key={group.dateKey} className="space-y-2">
          {/*
            `suppressHydrationWarning` for the same reason <RelativeTime> carries it: the server
            and the hydration render agree here by construction, and only the render AFTER
            hydration differs. Without it React logs a mismatch for a swap we are performing on
            purpose.
          */}
          <h2
            className="px-4 pt-6 text-sm font-medium text-foreground lg:px-6"
            suppressHydrationWarning
          >
            {group.label}
          </h2>
          <div className="grid grid-cols-1 gap-x-3 gap-y-6 px-4 py-2 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
            {group.videos.map((video, indexInGroup) => {
              const rowState = removedRows.get(video.videoId);

              if (rowState !== undefined && rowState.status !== "removing") {
                return (
                  <RemovedRow
                    key={video.videoId}
                    title={video.title}
                    state={rowState}
                    onUndoClick={() => {
                      handleUndoClick(video.videoId);
                    }}
                  />
                );
              }

              return (
                // `group` HERE, not only inside VideoCard: the remove button is a SIBLING of
                // the card's own `.group`, so `group-hover` on it would resolve against an
                // ancestor that never hovers and the button would stay invisible.
                <div key={video.videoId} className="group relative">
                  <VideoCard
                    {...toVideoCardProps(video, {
                      // Only the first group's opening cards are above the fold, so priority is
                      // scoped to it rather than to the flat index across every group.
                      isPriority: group === groups[0] && indexInGroup < 4,
                    })}
                  />
                  {/*
                    z-20: the card lays a stretched <Link> over itself at z-0 and puts its own
                    interactive children at z-10. Anything below 20 here is either unclickable
                    or navigates instead of removing.
                  */}
                  <button
                    type="button"
                    onClick={() => {
                      handleRemoveClick(video.videoId);
                    }}
                    disabled={rowState?.status === "removing"}
                    aria-label={`Remove ${video.title} from watch history`}
                    className="absolute top-2 right-2 z-20 rounded-full bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50"
                  >
                    {rowState?.status === "removing" ? "Removing…" : "✕"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <div className="px-4 lg:px-6">
        <LoadMoreControl
          hasNextPage={history.hasNextPage}
          isFetchingNextPage={history.isFetchingNextPage}
          errorMessage={history.loadMoreErrorMessage}
          onLoadNextPage={history.loadNextPage}
          label="Load more"
        />
      </div>
    </>
  );
}

/**
 * The card's replacement while it is removed — inline, because this repo has no toast.
 *
 * IT OCCUPIES THE GRID CELL rather than floating over the page, which is what makes it survive
 * a scroll and removes the need for a dismissal timer. A timed toast that expires while the
 * reader is looking somewhere else is an Undo they never got offered.
 */
function RemovedRow({
  title,
  state,
  onUndoClick,
}: {
  readonly title: string;
  readonly state: Exclude<RemovedRowState, { status: "removing" }>;
  readonly onUndoClick: () => void;
}) {
  switch (state.status) {
    case "removed":
    case "restoring":
      return (
        <div className="flex flex-col items-start justify-center gap-2 rounded-xl border border-[#CAC4D0]/60 p-4">
          <p className="line-clamp-2 text-xs text-[#6F7979]">Removed “{title}”</p>
          <button
            type="button"
            onClick={onUndoClick}
            disabled={state.status === "restoring"}
            className="text-xs font-medium text-[#00696E] disabled:opacity-50"
          >
            {state.status === "restoring" ? "Restoring…" : "Undo"}
          </button>
        </div>
      );
    case "gone":
      return (
        <div className="flex flex-col items-start justify-center gap-2 rounded-xl border border-[#CAC4D0]/60 p-4">
          <p className="line-clamp-2 text-xs text-[#6F7979]">Removed “{title}”</p>
          {/*
            No Undo control, because there is nothing left to undo — the 90-day retention
            window closed on these rows. Saying so is better than an Undo that does nothing.
          */}
          <p className="text-xs text-[#6F7979]">This one is past the 90-day window.</p>
        </div>
      );
    case "failed":
      return (
        <div className="flex flex-col items-start justify-center gap-2 rounded-xl border border-[#CAC4D0]/60 p-4">
          <p className="line-clamp-2 text-xs text-[#6F7979]">{state.message}</p>
          <p className="text-xs text-[#6F7979]">Reload to see the current state.</p>
        </div>
      );
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}
