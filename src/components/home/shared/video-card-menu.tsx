"use client";

// TRANSPORT: client-query — bookmark, share, not-interested, channel mute, save-to-playlist and
// report, wired to `/videos/:videoId/*`, `/creators/:creatorId/mute` and `/playlists/*`.
// Add-to-queue is the one row that talks to nothing, by design (see `queue-context.tsx`).
//
// A CLIENT ISLAND RATHER THAN A CLIENT CARD. `<VideoCard>` is a server component rendered by
// eight surfaces, and `recommended-section.tsx` is a pure-server consumer that making the card
// itself `"use client"` would drag into the bundle for the sake of one kebab.
//
// SEVEN ROWS, ALL WIRED. Download is the eighth and is commented out rather than rendered —
// see the block below for why that is a comment and not a deletion.
//
// THE TWO PREFERENCES CANNOT REMOVE THE CARD, and the copy is written around that. This
// component renders INSIDE the card it would have to delete, and their mutations deliberately
// do not invalidate the feed — an infinite query pinned at `staleTime: Infinity` would lose
// every page the reader scrolled. So the row becomes "we won't recommend this — Undo" and the
// card leaves on the next real load. The alternative, swapping the card for a tombstone the
// way `/history` does, needs a client wrapper around every grid cell in three server
// components; it is worth doing, and it is not this change.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import ReportVideoSheet from "@/components/home/shared/report-video-sheet";
import SaveToPlaylistSheet from "@/components/home/shared/save-to-playlist-sheet";
import { ShareSheet } from "@/components/home/watch/share-sheet";
import {
  describeEngagementError,
  useCreatorMuteMutation,
  useVideoNotInterestedMutation,
  useVideoSaveMutation,
  useVideoShareMutation,
} from "@/hooks/feed/mutations";
import { useQueue } from "@/state/queue-context";

/*
 * THE ONE ROW THAT IS NOT HERE: DOWNLOAD.
 *
 * It is commented out rather than rendered inert, and rather than deleted, because it is
 * EARLY rather than impossible — and the difference decides which of the three it should be.
 *
 * Every video on the platform today is a YouTube link. The bytes sit on youtube.com, Qatoto
 * never holds them and has no right to serve them, so a download control on one of these
 * rows could only ever lie. Download becomes real when a creator's bytes are Qatoto's own —
 * `videoSource: "hosted"` — which is STUDIO_BACKEND_STRUCTURE.md Appendix A, "Deferred:
 * self-hosted video (Livepeer direct upload)", parked on cost and complexity and headed
 * "⛔ DO NOT BUILD THIS NOW". Roughly a year out.
 *
 * The scaffolding for it already exists and is deliberately dormant: `videoSourceEnum`
 * carries `"hosted"`, `storage_provider` / `video_asset_id` / `playback_id` / `playback_url`
 * are columns written by nothing that the schema header calls "INTENTIONALLY DEAD … do not
 * delete them", and `video-player.tsx` already branches to a `HostedVideoPlayer` no row
 * reaches. This comment is the same kind of placeholder, one layer up.
 *
 * WHOEVER BUILDS APPENDIX A: restore the row, and gate it on the video's source. A hosted
 * row may offer it; a youtube row must not, and "the button is hidden" is not the gate — the
 * backend has to refuse it too.
 *
 *   { icon: "download", label: "Download", position: "before" },
 *
 * With it gone the menu is SEVEN rows, and that is the honest count. A Download that cannot
 * work is worse than one that is visibly not here yet.
 *
 * `INERT_MENU_ITEMS` and its `InertMenuItem` renderer are gone with it — every remaining row
 * is wired, so there is no longer a list of stubs to keep. This file has left the mock
 * inventory in docs/HOME_STRUCTURE.md §10, and the banner that put it there is gone with the
 * list. (The phrase §10's grep looks for is deliberately not written out here — spelling it
 * would put this file straight back into the results it is documenting its absence from.)
 */

function iconSrc(iconBaseName: string, isFilled = false): string {
  return `/icons/${iconBaseName}_24dp_000000_FILL${isFilled ? 1 : 0}_wght400_GRAD0_opsz24.svg`;
}

type VideoCardMenuProps = {
  /** The backend row id. Required — see the note on `videoId` in `@/types/video`. */
  readonly videoId: string;
  /** The card's title, used for the trigger's accessible name. */
  readonly title: string;
  /**
   * Absolute-or-relative URL for this video, copied by Share.
   *
   * WITHOUT IT `<ShareSheet>` falls back to `window.location.href`, which on a feed card is the
   * FEED's URL rather than the video's.
   */
  readonly shareUrl?: string;
  /** `viewerState.hasSaved` off the wire, so the first paint shows the right label. */
  readonly hasSaved?: boolean;
  /**
   * The creator's row id, for "don't recommend channel".
   *
   * NOT `channelHref`, which is a path and is omitted entirely for a creator with no handle:
   * the mute route addresses the creator by id, so a display path cannot stand in for it.
   */
  readonly creatorId: string;
  /** The channel's display name — mute confirmation copy, and the queue panel's subtitle. */
  readonly channelName: string;
  /** The card's thumbnail, carried into a queue entry so the panel needs no second fetch. */
  readonly thumbnailSrc: string;
};

/**
 * What the viewer has told the feed about this card, held here rather than on the wire.
 *
 * A DISCRIMINATED UNION, not two booleans plus a pending flag. The three states are mutually
 * exclusive — the row is either offering the action, waiting on the server, or showing an
 * Undo — and the bag-of-booleans version admits "hidden and still pending", which renders a
 * confirmation and a spinner at once.
 */
type PreferenceState =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "hidden" };

export default function VideoCardMenu({
  videoId,
  title,
  shareUrl,
  hasSaved = false,
  creatorId,
  channelName,
  thumbnailSrc,
}: VideoCardMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isPlaylistSheetOpen, setIsPlaylistSheetOpen] = useState(false);
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(hasSaved);
  const [videoPreference, setVideoPreference] = useState<PreferenceState>({ status: "idle" });
  const [channelPreference, setChannelPreference] = useState<PreferenceState>({ status: "idle" });
  const panelRef = useRef<HTMLDivElement>(null);

  const saveVideoMutation = useVideoSaveMutation(videoId);
  const shareVideoMutation = useVideoShareMutation(videoId);
  const notInterestedMutation = useVideoNotInterestedMutation(videoId);
  const creatorMuteMutation = useCreatorMuteMutation(creatorId);

  const { addToQueue, removeFromQueue, isQueued } = useQueue();
  const isAlreadyQueued = isQueued(videoId);

  /**
   * Add to queue — the one control here that talks to nothing.
   *
   * A TOGGLE, because the row is the only place this video's queue state is visible: with no
   * "added" confirmation to show and no toast layer to show it in, a second tap that silently
   * did nothing would be indistinguishable from a first tap that failed.
   */
  const handleQueueClick = () => {
    if (isAlreadyQueued) {
      removeFromQueue(videoId);
      return;
    }
    addToQueue({
      videoId,
      title,
      thumbnailSrc,
      channelName,
      // The card's own link, so the panel navigates exactly where the card would have.
      href: shareUrl ?? `/watch?v=${encodeURIComponent(videoId)}`,
    });
  };

  // Close on Escape or an outside press. Scroll is locked ONLY for the bottom-sheet viewport;
  // `share-sheet.tsx` locks unconditionally, which is wrong behind a desktop dropdown.
  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") setIsMenuOpen(false);
    };
    const handlePressOutside = (pointerEvent: MouseEvent) => {
      const pressedNode = pointerEvent.target;
      if (
        pressedNode instanceof Node &&
        panelRef.current &&
        !panelRef.current.contains(pressedNode)
      ) {
        setIsMenuOpen(false);
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
  }, [isMenuOpen]);

  const handleTriggerClick = (clickEvent: React.MouseEvent<HTMLButtonElement>) => {
    // The card lays a stretched <Link> over itself; without both of these the kebab navigates.
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    setIsMenuOpen((wasOpen) => !wasOpen);
  };

  /**
   * Optimistic, then settled on the server's answer — the same shape as the watch page's
   * bookmark pill. A save is cheap and idempotent server-side, so a rollback costs nothing.
   */
  const handleBookmarkClick = () => {
    const shouldBeBookmarked = !isBookmarked;
    setIsBookmarked(shouldBeBookmarked);
    saveVideoMutation.mutate(shouldBeBookmarked, {
      onSuccess: (result) => setIsBookmarked(result.hasSaved),
      onError: () => setIsBookmarked(!shouldBeBookmarked),
    });
  };

  /**
   * "Not interested" and its Undo.
   *
   * NOT OPTIMISTIC. The row it lives in becomes an Undo control the moment it succeeds, and
   * offering Undo for a write the server refused means a second call with nothing to reverse.
   * So it goes to "saving", then to whatever the server actually said.
   */
  const handleNotInterestedClick = (shouldBeSet: boolean) => {
    setVideoPreference({ status: "saving" });
    notInterestedMutation.mutate(shouldBeSet, {
      onSuccess: (result) => {
        setVideoPreference({ status: result.isNotInterested ? "hidden" : "idle" });
      },
      // Back to where it was, so the control the viewer pressed is the control they see.
      onError: () => setVideoPreference({ status: shouldBeSet ? "idle" : "hidden" }),
    });
  };

  /** "Don't recommend channel" and its Undo. Same shape, same reasoning. */
  const handleChannelMuteClick = (shouldBeSet: boolean) => {
    setChannelPreference({ status: "saving" });
    creatorMuteMutation.mutate(shouldBeSet, {
      onSuccess: (result) => {
        setChannelPreference({ status: result.isMuted ? "hidden" : "idle" });
      },
      onError: () => setChannelPreference({ status: shouldBeSet ? "idle" : "hidden" }),
    });
  };

  // FIRST ERROR WINS rather than a list. Only one control in this menu can be mid-flight at a
  // time — the panel is small enough that the viewer sees what they pressed — and stacking
  // four alerts under a 64px-wide menu would push the items off screen.
  //
  // A 403 does NOT mean the same thing for every mutation here. Bookmark 403s an anonymous
  // session (`requireIdentifiedUser`); the two preference writes let anonymous sessions
  // through, so their 403 is a domain refusal — muting your own channel. `describeEngagementError`
  // labels both `full_account_required`, which is wrong for the second case, but it carries
  // the backend's own message and that is the only part rendered.
  const failedMutationError =
    saveVideoMutation.error ?? notInterestedMutation.error ?? creatorMuteMutation.error ?? null;
  const refusal =
    failedMutationError === null ? null : describeEngagementError(failedMutationError);

  return (
    // `relative` with NO z-index on purpose: this must not become a stacking context, or the
    // open panel's z-50 would be trapped inside it and clipped under the next card in the grid.
    <div ref={panelRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={`More options for ${title}`}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        onClick={handleTriggerClick}
        className="relative z-10 cursor-pointer rounded-full p-1 hover:bg-black/20"
      >
        {/*
          `size-4` IS THE ORIGINAL SIZE, not a shrink. Before this was a button the `p-1` sat on
          the <img> itself, and Tailwind's preflight makes every box `border-box` — so the
          padding ate INWARD and a `width={24}` icon drew at 16px inside a 24px box. With the
          padding moved onto the button, an unconstrained image would render the full 24 and the
          control would grow to 32. 16 + 8 keeps the box at 24 and the glyph at 16.
          `width`/`height` stay 24 so the SVG's own intrinsic size is unchanged.
        */}
        <Image src={iconSrc("more_vert")} width={24} height={24} alt="" className="size-4" />
      </button>

      {isMenuOpen && !isShareSheetOpen && !isPlaylistSheetOpen && !isReportSheetOpen && (
        <>
          {/* Backdrop — bottom-sheet viewport only; dims the page and dismisses on tap. */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          />

          <div
            role="menu"
            aria-label="Video options"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-background pb-8 shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:bottom-auto sm:mt-1 sm:w-64 sm:max-w-[calc(100vw-1rem)] sm:rounded-xl sm:border sm:border-border sm:py-1 sm:pb-1 sm:shadow-lg"
          >
            {/* Drag handle — bottom-sheet affordance only. */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-black/15" />
            </div>

            {/*
              Add to queue — the one row backed by nothing on the server, on purpose. A queue
              is what you mean to watch next, not a collection; see `queue-context.tsx`.
            */}
            <button
              type="button"
              role="menuitem"
              onClick={handleQueueClick}
              className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
            >
              <Image
                src={iconSrc("playlist_play")}
                width={24}
                height={24}
                alt=""
                className="shrink-0"
              />
              <span>{isAlreadyQueued ? "Remove from queue" : "Add to queue"}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsPlaylistSheetOpen(true);
              }}
              className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
            >
              <Image
                src={iconSrc("playlist_add")}
                width={24}
                height={24}
                alt=""
                className="shrink-0"
              />
              <span>Save to playlist</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={handleBookmarkClick}
              disabled={saveVideoMutation.isPending}
              className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-60"
            >
              <Image
                src={iconSrc("bookmark", isBookmarked)}
                width={24}
                height={24}
                alt=""
                className="shrink-0"
              />
              <span>{isBookmarked ? "Saved to bookmarks" : "Save to bookmarks"}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsShareSheetOpen(true);
              }}
              className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
            >
              <Image src={iconSrc("share")} width={24} height={24} alt="" className="shrink-0" />
              <span>Share</span>
            </button>

            {/*
              THE TWO WIRED PREFERENCES. Each row REPLACES ITSELF with a confirmation and an
              Undo rather than the card vanishing, and the copy is chosen to match what really
              happened: this menu is a client island INSIDE the card, so it cannot remove its
              own container, and the mutations deliberately do not invalidate the feed — that
              would refetch page one and discard every page the reader scrolled. The card is
              gone on the next real load. "We won't recommend this" is true now; "Removed"
              would not be.
            */}
            <PreferenceMenuItem
              state={videoPreference}
              icon="heart_broken"
              actionLabel="Not interested"
              confirmationLabel="We won't recommend this"
              isAvailable
              onAction={() => handleNotInterestedClick(true)}
              onUndo={() => handleNotInterestedClick(false)}
            />

            <PreferenceMenuItem
              state={channelPreference}
              icon="account_circle_off"
              actionLabel="Don't recommend channel"
              confirmationLabel={`We won't recommend ${channelName}`}
              isAvailable
              onAction={() => handleChannelMuteClick(true)}
              onUndo={() => handleChannelMuteClick(false)}
            />

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsReportSheetOpen(true);
              }}
              className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
            >
              <Image src={iconSrc("flag")} width={24} height={24} alt="" className="shrink-0" />
              <span>Report</span>
            </button>

            {/*
              403 rather than 401 is the refusal that matters: a better-auth anonymous session
              carries a cookie, so those viewers look signed in and would otherwise meet a
              control that silently does nothing. `describeEngagementError` is where that is
              decided; this repo has no toast, so the message renders inline.
            */}
            {refusal !== null && (
              <p role="alert" className="px-4 py-2 text-xs text-red-700">
                {refusal.message}
              </p>
            )}
          </div>
        </>
      )}

      {isReportSheetOpen && (
        <ReportVideoSheet
          videoId={videoId}
          title={title}
          onClose={() => {
            setIsReportSheetOpen(false);
            setIsMenuOpen(false);
          }}
        />
      )}

      {isPlaylistSheetOpen && (
        <SaveToPlaylistSheet
          videoId={videoId}
          onClose={() => {
            setIsPlaylistSheetOpen(false);
            setIsMenuOpen(false);
          }}
        />
      )}

      {isShareSheetOpen && (
        <ShareSheet
          {...(shareUrl === undefined ? {} : { shareUrl })}
          videoTitle={title}
          onClose={() => {
            setIsShareSheetOpen(false);
            setIsMenuOpen(false);
          }}
          onShared={(channel) => {
            shareVideoMutation.mutate(channel);
          }}
        />
      )}
    </div>
  );
}

/**
 * One wired preference row, rendered from its state rather than from a pile of booleans.
 *
 * The `switch` is exhaustive with a `never` default, so a fourth state cannot be added to
 * `PreferenceState` without this failing to compile — which is the point of the union.
 *
 * `isAvailable` renders a row inert rather than hiding it, matching the four stubs around it: a
 * menu that changes length depending on which page you opened it from is more confusing than one
 * whose rows sometimes do nothing.
 *
 * NOTHING PASSES `isAvailable={false}` ANY MORE, and the prop is kept anyway. Both `videoId`
 * and `creatorId` are now required — the last holdout was the R&D venture reel, whose backend
 * projection gained the creator id — so every wired row is live on every surface. It stays
 * because the four unwired stub rows beside these two still need it, and because it is the
 * seam a future card without one of those ids would use rather than hiding the row.
 */
function PreferenceMenuItem({
  state,
  icon,
  actionLabel,
  confirmationLabel,
  isAvailable,
  onAction,
  onUndo,
}: {
  readonly state: PreferenceState;
  readonly icon: string;
  readonly actionLabel: string;
  readonly confirmationLabel: string;
  readonly isAvailable: boolean;
  readonly onAction: () => void;
  readonly onUndo: () => void;
}) {
  switch (state.status) {
    case "idle":
      return (
        <button
          type="button"
          role="menuitem"
          onClick={isAvailable ? onAction : undefined}
          className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
        >
          <Image src={iconSrc(icon)} width={24} height={24} alt="" className="shrink-0" />
          <span>{actionLabel}</span>
        </button>
      );

    case "saving":
      // Not a spinner. The row is one line of a 256px menu and these writes settle in one
      // round trip; a spinner here reads as a stall where the verb reads as progress.
      return (
        <p className="flex flex-row items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground">
          <Image
            src={iconSrc(icon)}
            width={24}
            height={24}
            alt=""
            className="shrink-0 opacity-60"
          />
          <span>Saving…</span>
        </p>
      );

    case "hidden":
      return (
        <div className="flex flex-row items-center gap-2 px-4 py-2.5 text-sm">
          <span className="min-w-0 flex-1 text-muted-foreground">{confirmationLabel}</span>
          <button
            type="button"
            role="menuitem"
            onClick={onUndo}
            className="shrink-0 cursor-pointer rounded font-medium text-foreground underline hover:no-underline"
          >
            Undo
          </button>
        </div>
      );

    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}
