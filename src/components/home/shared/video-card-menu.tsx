"use client";

// TRANSPORT: client-query — bookmark and share, wired to `/videos/:videoId/*`.
//
// A CLIENT ISLAND RATHER THAN A CLIENT CARD. `<VideoCard>` is a server component rendered by
// eight surfaces, and `recommended-section.tsx` is a pure-server consumer that making the card
// itself `"use client"` would drag into the bundle for the sake of one kebab.
//
// TWO OF THE EIGHT ITEMS ARE REAL. See INERT_MENU_ITEMS below for why the other six are not, and
// why they are kept anyway.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { ShareSheet } from "@/components/home/watch/share-sheet";
import {
  describeEngagementError,
  useVideoSaveMutation,
  useVideoShareMutation,
} from "@/hooks/feed/mutations";

/** One row in the menu: a 24px Material Symbols icon and its label. */
type MenuItem = {
  /** Icon base name, resolved to its FILL0 black SVG in `public/icons/`. */
  readonly icon: string;
  readonly label: string;
};

/**
 * TRANSPORT: mock — none of these six has a backend route, and each is a different absence.
 *
 * Add to queue      no queue exists, client or server — there is no player playlist to append to.
 * Save to playlist  `PUT /videos/:videoId/playlists` is real but OWNER-ONLY: the service's
 *                   `findUnownedVideoIds` answers 422 for any video the caller did not upload.
 *                   Playlists here group a creator's own uploads; they are not a viewer's saved
 *                   collection. Wiring it would work on your own cards and fail on every other
 *                   one in the feed, which is worse than an honest stub.
 * Download          the bytes are on youtube.com; there is no download route to call.
 * Not interested    no such signal is among the ranker's inputs, so the click would change
 * Don't recommend   nothing about what the feed shows next.
 * Report            no content-reporting flow — a deliberate v1 gap, HOME_BACKEND §8.4.
 *
 * They render as clickable buttons with NO handler — the same call `share-sheet.tsx` already
 * made for its own three. Not `disabled`, because a greyed row reads as "not available to you"
 * rather than "not built"; and no toast, because this repo has no toast layer. See
 * docs/HOME_STRUCTURE.md §10.
 */
const INERT_MENU_ITEMS: readonly (MenuItem & { readonly position: "before" | "after" })[] = [
  { icon: "playlist_play", label: "Add to queue", position: "before" },
  { icon: "playlist_add", label: "Save to playlist", position: "before" },
  { icon: "download", label: "Download", position: "before" },
  { icon: "heart_broken", label: "Not interested", position: "after" },
  { icon: "account_circle_off", label: "Don't recommend channel", position: "after" },
  { icon: "flag", label: "Report", position: "after" },
];

function iconSrc(iconBaseName: string, isFilled = false): string {
  return `/icons/${iconBaseName}_24dp_000000_FILL${isFilled ? 1 : 0}_wght400_GRAD0_opsz24.svg`;
}

type VideoCardMenuProps = {
  /**
   * The backend row id. ABSENT on the anime surfaces, which still build cards from
   * `src/mocks/anime-mocks.ts` — so the two wired items branch on it rather than assume it.
   */
  readonly videoId?: string;
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
};

export default function VideoCardMenu({
  videoId,
  title,
  shareUrl,
  hasSaved = false,
}: VideoCardMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(hasSaved);
  const panelRef = useRef<HTMLDivElement>(null);

  // `videoId ?? ""` keeps the hook call unconditional — the two controls it powers are inert
  // when there is no id, so the mutation is never fired with the empty string.
  const saveVideoMutation = useVideoSaveMutation(videoId ?? "");
  const shareVideoMutation = useVideoShareMutation(videoId ?? "");

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
    if (videoId === undefined) return;
    const shouldBeBookmarked = !isBookmarked;
    setIsBookmarked(shouldBeBookmarked);
    saveVideoMutation.mutate(shouldBeBookmarked, {
      onSuccess: (result) => setIsBookmarked(result.hasSaved),
      onError: () => setIsBookmarked(!shouldBeBookmarked),
    });
  };

  const refusal =
    saveVideoMutation.error === null ? null : describeEngagementError(saveVideoMutation.error);

  const itemsBefore = INERT_MENU_ITEMS.filter((item) => item.position === "before");
  const itemsAfter = INERT_MENU_ITEMS.filter((item) => item.position === "after");

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

      {isMenuOpen && !isShareSheetOpen && (
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

            {itemsBefore.map((item) => (
              <InertMenuItem key={item.label} icon={item.icon} label={item.label} />
            ))}

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
                if (videoId === undefined) return;
                setIsShareSheetOpen(true);
              }}
              className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
            >
              <Image src={iconSrc("share")} width={24} height={24} alt="" className="shrink-0" />
              <span>Share</span>
            </button>

            {itemsAfter.map((item) => (
              <InertMenuItem key={item.label} icon={item.icon} label={item.label} />
            ))}

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

      {isShareSheetOpen && (
        <ShareSheet
          {...(shareUrl === undefined ? {} : { shareUrl })}
          onClose={() => {
            setIsShareSheetOpen(false);
            setIsMenuOpen(false);
          }}
          onShared={(channel) => {
            if (videoId === undefined) return;
            shareVideoMutation.mutate(channel);
          }}
        />
      )}
    </div>
  );
}

/** A menu row with no handler — see the INERT_MENU_ITEMS note above. */
function InertMenuItem({ icon, label }: MenuItem) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
    >
      <Image src={iconSrc(icon)} width={24} height={24} alt="" className="shrink-0" />
      <span>{label}</span>
    </button>
  );
}
