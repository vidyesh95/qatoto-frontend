// TRANSPORT: client-query — `GET /users/me/muted-creators` and
// `GET /users/me/not-interested-videos`, with `DELETE /creators/:creatorId/mute` and
// `DELETE /videos/:videoId/not-interested` behind each row's Remove.
"use client";

// THE SURFACE THAT MAKES BOTH FEED PREFERENCES REVERSIBLE, and until it existed neither
// really was.
//
// "Not interested" and "Don't recommend channel" have always shipped an Undo — inside
// `video-card-menu.tsx`, which renders INSIDE the card it just hid. That Undo is good for
// about as long as the reader does not scroll. After that the card is gone on the next load
// and the control went with it, so a mis-tap was permanent. The backend says the same thing
// about itself in `feed-preferences.service.ts`: "a preference a viewer cannot withdraw is a
// trap."
//
// TWO LISTS, TWO TRANSPORTS, AND THE ASYMMETRY IS THE BACKEND'S. Muted channels arrive as one
// unpaginated read — muting is deliberate and tops out in the tens. Dismissed videos are
// keyset-paginated, because dismissing is one tap on one card and accumulates without bound.
//
// "SHOW MORE" RATHER THAN INFINITE SCROLL. This panel is ~380px wide and already lives inside
// an `overflow-y-auto` dropdown; hanging an intersection observer inside an ancestor that
// scrolls is how a list quietly loads pages nobody asked for.
//
// NOTHING HERE IS OPTIMISTIC. Same rule the card menu follows. A row that vanished on click
// and then failed would have to reappear in a list the reader is actively working through,
// and they would have no way to tell it from one they had not reached yet.

import Image from "next/image";
import { useState } from "react";

import RelativeTime from "@/components/home/shared/relative-time";
import StatusPanel from "@/components/home/shared/status-panel";
import { useMutedCreatorsQuery, useNotInterestedVideosQuery } from "@/hooks/feed/queries";
import {
  describeEngagementError,
  useRemoveFeedPreferenceMutation,
  type FeedPreferenceKind,
} from "@/hooks/feed/mutations";
import type { MutedCreator, NotInterestedVideo } from "@/lib/feed/schemas";
import { ApiRequestError, isUnauthorized } from "@/lib/http";

/**
 * What this panel is showing (CLAUDE.md Pattern 1).
 *
 * `signed_out` IS ITS OWN VARIANT, not an error with a friendlier message. Someone who is not
 * signed in has no list — which is a different fact from "your list is empty", and rendering
 * the second at them would be telling them something untrue about their own account.
 */
type FeedPreferencesView =
  | { readonly status: "loading" }
  | { readonly status: "signed_out" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | {
      readonly status: "ready";
      readonly mutedCreators: readonly MutedCreator[];
      readonly dismissedVideos: readonly NotInterestedVideo[];
    };

/**
 * Which row is mid-flight, keyed by `kind:id`.
 *
 * A SET RATHER THAN A BOOLEAN, because two rows can be removed in quick succession and a
 * shared flag would put a spinner on the row the reader did not press. Keyed by kind AND id
 * because a video id and a creator id are different namespaces that could collide.
 */
function toRowKey(kind: FeedPreferenceKind, id: string): string {
  return `${kind}:${id}`;
}

export function FeedPreferencesPanel({ onBack }: { readonly onBack: () => void }) {
  const mutedCreatorsQuery = useMutedCreatorsQuery();
  const dismissedVideosList = useNotInterestedVideosQuery();
  const removePreference = useRemoveFeedPreferenceMutation();

  const [pendingRowKeys, setPendingRowKeys] = useState<ReadonlySet<string>>(new Set());
  const [removalErrorMessage, setRemovalErrorMessage] = useState<string | null>(null);

  const handleRemoveClick = (kind: FeedPreferenceKind, id: string) => {
    const rowKey = toRowKey(kind, id);
    setPendingRowKeys((previous) => new Set(previous).add(rowKey));
    setRemovalErrorMessage(null);

    removePreference.mutate(
      { kind, id },
      {
        // `onSettled`, not `onSuccess` + `onError`: the row must stop being pending either
        // way, and doing it in one place is what stops a failed removal leaving a row stuck
        // under a spinner forever.
        onSettled: () => {
          setPendingRowKeys((previous) => {
            const next = new Set(previous);
            next.delete(rowKey);
            return next;
          });
        },
        onError: (error) => {
          setRemovalErrorMessage(describeEngagementError(error).message);
        },
      },
    );
  };

  const view = buildFeedPreferencesView(mutedCreatorsQuery, dismissedVideosList);

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-black/10 bg-background p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={24}
            height={24}
          />
        </button>
        <h2 className="text-xl font-medium text-secondary-foreground">Feed preferences</h2>
      </header>

      {removalErrorMessage !== null && (
        <output className="m-4 block rounded-2xl border border-black/10 bg-muted/40 p-3 text-sm text-muted-foreground">
          {removalErrorMessage}
        </output>
      )}

      <FeedPreferencesBody
        view={view}
        pendingRowKeys={pendingRowKeys}
        onRemove={handleRemoveClick}
        hasMoreDismissedVideos={dismissedVideosList.hasNextPage}
        isLoadingMoreDismissedVideos={dismissedVideosList.isFetchingNextPage}
        loadMoreErrorMessage={dismissedVideosList.loadMoreErrorMessage}
        onLoadMoreDismissedVideos={dismissedVideosList.loadNextPage}
      />
    </div>
  );
}

/**
 * Folds two independent reads into one view state.
 *
 * THE 401 COMES FROM THE MUTED-CREATORS QUERY ALONE, and that is deliberate rather than
 * arbitrary. `useKeysetList` surfaces a message, not an `ApiRequestError`, so the dismissed
 * list cannot tell a 401 from any other failure — sniffing its string would be guessing at
 * copy the backend is free to change. The muted read is a plain `useQuery` typed
 * `ApiRequestError` and answers the same session, so it is the one asked.
 */
function buildFeedPreferencesView(
  mutedCreatorsQuery: ReturnType<typeof useMutedCreatorsQuery>,
  dismissedVideosList: ReturnType<typeof useNotInterestedVideosQuery>,
): FeedPreferencesView {
  if (mutedCreatorsQuery.isPending || dismissedVideosList.isLoadingFirstPage) {
    return { status: "loading" };
  }

  if (mutedCreatorsQuery.error) {
    const requestError =
      mutedCreatorsQuery.error instanceof ApiRequestError ? mutedCreatorsQuery.error : null;
    if (requestError && isUnauthorized(requestError.apiError)) {
      return { status: "signed_out" };
    }
    return {
      status: "error",
      message: requestError?.apiError.message ?? "We could not load your feed preferences.",
    };
  }

  // A FIRST-PAGE FAILURE ON ONE LIST IS NOT AN EMPTY PANEL. The muted list may have loaded
  // fine, and blanking it because the other read failed would hide preferences the reader
  // could otherwise have lifted.
  if (dismissedVideosList.firstPageErrorMessage !== null && mutedCreatorsQuery.data === undefined) {
    return { status: "error", message: dismissedVideosList.firstPageErrorMessage };
  }

  const mutedCreators = mutedCreatorsQuery.data ?? [];
  const dismissedVideos = dismissedVideosList.rows;

  // EMPTY ONLY WHEN BOTH ARE. One empty list beside one full one is a normal ready state with
  // a section that says so.
  if (mutedCreators.length === 0 && dismissedVideos.length === 0) return { status: "empty" };

  return { status: "ready", mutedCreators, dismissedVideos };
}

function FeedPreferencesBody({
  view,
  pendingRowKeys,
  onRemove,
  hasMoreDismissedVideos,
  isLoadingMoreDismissedVideos,
  loadMoreErrorMessage,
  onLoadMoreDismissedVideos,
}: {
  readonly view: FeedPreferencesView;
  readonly pendingRowKeys: ReadonlySet<string>;
  readonly onRemove: (kind: FeedPreferenceKind, id: string) => void;
  readonly hasMoreDismissedVideos: boolean;
  readonly isLoadingMoreDismissedVideos: boolean;
  readonly loadMoreErrorMessage: string | null;
  readonly onLoadMoreDismissedVideos: () => void;
}) {
  switch (view.status) {
    case "loading":
      return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;

    case "signed_out":
      return (
        <div className="p-4">
          <StatusPanel
            message="Sign in to see the channels and videos you've hidden."
            className="border border-border px-6 py-10"
          />
        </div>
      );

    case "error":
      return (
        <output className="m-4 block rounded-2xl border border-black/10 bg-muted/40 p-3 text-sm text-muted-foreground">
          {view.message}
        </output>
      );

    case "empty":
      return (
        <div className="space-y-3 p-4">
          <p className="text-sm text-foreground">You haven&apos;t hidden anything yet.</p>
          <p className="text-xs text-muted-foreground">
            When you pick &ldquo;Not interested&rdquo; or &ldquo;Don&apos;t recommend channel&rdquo;
            on a video, it shows up here so you can undo it later.
          </p>
        </div>
      );

    case "ready":
      return (
        <div className="space-y-6 p-4">
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Hidden channels</h3>
            {view.mutedCreators.length === 0 ? (
              <p className="text-xs text-muted-foreground">You haven&apos;t hidden any channels.</p>
            ) : (
              <ul className="space-y-1">
                {view.mutedCreators.map((mutedCreator) => (
                  <MutedCreatorRow
                    key={mutedCreator.id}
                    mutedCreator={mutedCreator}
                    isPending={pendingRowKeys.has(toRowKey("creator", mutedCreator.id))}
                    onRemove={() => onRemove("creator", mutedCreator.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Hidden videos</h3>
            {view.dismissedVideos.length === 0 ? (
              <p className="text-xs text-muted-foreground">You haven&apos;t hidden any videos.</p>
            ) : (
              <ul className="space-y-1">
                {view.dismissedVideos.map((dismissedVideo) => (
                  <DismissedVideoRow
                    key={dismissedVideo.videoId}
                    dismissedVideo={dismissedVideo}
                    isPending={pendingRowKeys.has(toRowKey("video", dismissedVideo.videoId))}
                    onRemove={() => onRemove("video", dismissedVideo.videoId)}
                  />
                ))}
              </ul>
            )}

            {loadMoreErrorMessage !== null && (
              <output className="block text-xs text-muted-foreground">
                {loadMoreErrorMessage}
              </output>
            )}

            {hasMoreDismissedVideos && (
              <button
                type="button"
                onClick={onLoadMoreDismissedVideos}
                disabled={isLoadingMoreDismissedVideos}
                className="cursor-pointer text-xs font-medium text-foreground underline hover:no-underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
              >
                {isLoadingMoreDismissedVideos ? "Loading…" : "Show more"}
              </button>
            )}
          </section>

          {/*
            THE COPY IS ABOUT WHAT REMOVING A ROW ACTUALLY DID, and it is here rather than on
            each row because it is true of both lists. Lifting a preference does NOT repopulate
            the feed the reader currently has open: the mutations deliberately do not
            invalidate it, because it is an infinite query pinned at `staleTime: Infinity` and
            refetching would discard every page they had scrolled.
          */}
          <p className="text-xs text-muted-foreground">
            Removing something here lets it appear in your recommendations again from the next time
            your feed loads.
          </p>
        </div>
      );

    default: {
      const exhaustiveCheck: never = view;
      return exhaustiveCheck;
    }
  }
}

function MutedCreatorRow({
  mutedCreator,
  isPending,
  onRemove,
}: {
  readonly mutedCreator: MutedCreator;
  readonly isPending: boolean;
  readonly onRemove: () => void;
}) {
  return (
    <li className="flex flex-row items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted">
      {/*
        NO `<Image src={imageUrl}>` WITHOUT A URL, and no `/channel/${handle}` without a
        handle. Both are nullable on the wire because an account with neither is a real
        account — see `MutedCreatorSchema`.
      */}
      {mutedCreator.imageUrl === null ? (
        <span aria-hidden="true" className="size-9 shrink-0 rounded-full bg-muted-foreground/20" />
      ) : (
        <Image
          src={mutedCreator.imageUrl}
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-full object-cover"
        />
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{mutedCreator.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {mutedCreator.handle === null ? (
            <RelativeTime isoInstant={mutedCreator.mutedAt} />
          ) : (
            <>
              @{mutedCreator.handle} · <RelativeTime isoInstant={mutedCreator.mutedAt} />
            </>
          )}
        </span>
      </span>

      <RemoveRowButton
        isPending={isPending}
        onRemove={onRemove}
        accessibleLabel={`Stop hiding ${mutedCreator.name}`}
      />
    </li>
  );
}

function DismissedVideoRow({
  dismissedVideo,
  isPending,
  onRemove,
}: {
  readonly dismissedVideo: NotInterestedVideo;
  readonly isPending: boolean;
  readonly onRemove: () => void;
}) {
  return (
    <li className="flex flex-row items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted">
      {dismissedVideo.thumbnailUrl === null ? (
        <span aria-hidden="true" className="h-9 w-16 shrink-0 rounded bg-muted-foreground/20" />
      ) : (
        <Image
          src={dismissedVideo.thumbnailUrl}
          alt=""
          width={64}
          height={36}
          className="h-9 w-16 shrink-0 rounded object-cover"
        />
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{dismissedVideo.title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {dismissedVideo.creatorName} · <RelativeTime isoInstant={dismissedVideo.dismissedAt} />
        </span>
      </span>

      <RemoveRowButton
        isPending={isPending}
        onRemove={onRemove}
        accessibleLabel={`Stop hiding ${dismissedVideo.title}`}
      />
    </li>
  );
}

/** The one Remove control, shared so both lists cannot drift on wording or pending behaviour. */
function RemoveRowButton({
  isPending,
  onRemove,
  accessibleLabel,
}: {
  readonly isPending: boolean;
  readonly onRemove: () => void;
  readonly accessibleLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={isPending}
      aria-label={accessibleLabel}
      className="shrink-0 cursor-pointer rounded px-2 py-1 text-xs font-medium text-foreground underline hover:no-underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
    >
      {isPending ? "Removing…" : "Remove"}
    </button>
  );
}
