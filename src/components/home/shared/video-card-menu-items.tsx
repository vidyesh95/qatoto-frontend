"use client";

import Image from "next/image";

function iconSrc(iconBaseName: string, isFilled = false): string {
  return `/icons/${iconBaseName}_24dp_000000_FILL${isFilled ? 1 : 0}_wght400_GRAD0_opsz24.svg`;
}

export type PreferenceState =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "hidden" };

export function PreferenceMenuItem({
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

export function VideoCardMenuPanel({
  isAlreadyQueued,
  isBookmarked,
  isBookmarkPending,
  videoPreference,
  channelPreference,
  channelName,
  refusalMessage,
  onQueueClick,
  onOpenPlaylist,
  onBookmarkClick,
  onOpenShare,
  onNotInterested,
  onNotInterestedUndo,
  onChannelMute,
  onChannelMuteUndo,
  onOpenReport,
}: {
  readonly isAlreadyQueued: boolean;
  readonly isBookmarked: boolean;
  readonly isBookmarkPending: boolean;
  readonly videoPreference: PreferenceState;
  readonly channelPreference: PreferenceState;
  readonly channelName: string;
  readonly refusalMessage: string | null;
  readonly onQueueClick: () => void;
  readonly onOpenPlaylist: () => void;
  readonly onBookmarkClick: () => void;
  readonly onOpenShare: () => void;
  readonly onNotInterested: () => void;
  readonly onNotInterestedUndo: () => void;
  readonly onChannelMute: () => void;
  readonly onChannelMuteUndo: () => void;
  readonly onOpenReport: () => void;
}) {
  return (
    <div
      role="menu"
      aria-label="Video options"
      className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-background pb-8 shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:bottom-auto sm:mt-1 sm:w-64 sm:max-w-[calc(100vw-1rem)] sm:rounded-xl sm:border sm:border-border sm:py-1 sm:pb-1 sm:shadow-lg"
    >
      <div className="flex justify-center pt-3 pb-1 sm:hidden">
        <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
      </div>

      <button
        type="button"
        role="menuitem"
        onClick={onQueueClick}
        className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
      >
        <Image src={iconSrc("playlist_play")} width={24} height={24} alt="" className="shrink-0" />
        <span>{isAlreadyQueued ? "Remove from queue" : "Add to queue"}</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={onOpenPlaylist}
        className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
      >
        <Image src={iconSrc("playlist_add")} width={24} height={24} alt="" className="shrink-0" />
        <span>Save to playlist</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={onBookmarkClick}
        disabled={isBookmarkPending}
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
        onClick={onOpenShare}
        className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
      >
        <Image src={iconSrc("share")} width={24} height={24} alt="" className="shrink-0" />
        <span>Share</span>
      </button>

      <PreferenceMenuItem
        state={videoPreference}
        icon="heart_broken"
        actionLabel="Not interested"
        confirmationLabel="We won't recommend this"
        isAvailable
        onAction={onNotInterested}
        onUndo={onNotInterestedUndo}
      />

      <PreferenceMenuItem
        state={channelPreference}
        icon="account_circle_off"
        actionLabel="Don't recommend channel"
        confirmationLabel={`We won't recommend ${channelName}`}
        isAvailable
        onAction={onChannelMute}
        onUndo={onChannelMuteUndo}
      />

      <button
        type="button"
        role="menuitem"
        onClick={onOpenReport}
        className="flex w-full cursor-pointer flex-row items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
      >
        <Image src={iconSrc("flag")} width={24} height={24} alt="" className="shrink-0" />
        <span>Report</span>
      </button>

      {refusalMessage !== null && (
        <p role="alert" className="px-4 py-2 text-xs text-destructive">
          {refusalMessage}
        </p>
      )}
    </div>
  );
}
