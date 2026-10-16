"use client";

// TRANSPORT: client-query — bookmark, share, not-interested, channel mute, save-to-playlist and
// report, wired to `/videos/:videoId/*`, `/creators/:creatorId/mute` and `/playlists/*`.
// Add-to-queue is the one row that talks to nothing, by design (see `queue-context.tsx`).
//
// A CLIENT ISLAND RATHER THAN A CLIENT CARD. `<VideoCard>` is a server component rendered by
// eight surfaces, and `recommended-section.tsx` is a pure-server consumer that making the card
// itself `"use client"` would drag into the bundle for the sake of one kebab.

import Image from "next/image";

import ReportVideoSheet from "@/components/home/shared/report-video-sheet";
import SaveToPlaylistSheet from "@/components/home/shared/save-to-playlist-sheet";
import { ShareSheet } from "@/components/home/watch/share-sheet";
import { VideoCardMenuPanel } from "@/components/home/shared/video-card-menu-items";
import { useVideoCardMenuState } from "@/hooks/feed/use-video-card-menu-state";

type VideoCardMenuProps = {
  readonly videoId: string;
  readonly title: string;
  readonly shareUrl?: string;
  readonly hasSaved?: boolean;
  readonly creatorId: string;
  readonly channelName: string;
  readonly thumbnailSrc: string;
};

export default function VideoCardMenu(props: VideoCardMenuProps) {
  const { videoId, title, shareUrl, channelName } = props;

  const {
    isMenuOpen,
    setIsMenuOpen,
    isShareSheetOpen,
    setIsShareSheetOpen,
    isPlaylistSheetOpen,
    setIsPlaylistSheetOpen,
    isReportSheetOpen,
    setIsReportSheetOpen,
    isBookmarked,
    videoPreference,
    channelPreference,
    panelRef,
    isAlreadyQueued,
    isBookmarkPending,
    refusalMessage,
    shareVideoMutation,
    handleTriggerClick,
    handleQueueClick,
    handleBookmarkClick,
    handleNotInterestedClick,
    handleChannelMuteClick,
  } = useVideoCardMenuState(props);

  return (
    <div ref={panelRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={`More options for ${title}`}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        onClick={handleTriggerClick}
        className="relative z-10 cursor-pointer rounded-full p-1 hover:bg-muted"
      >
        <Image
          src="/icons/more_vert_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          width={24}
          height={24}
          alt=""
          className="size-4"
        />
      </button>

      {isMenuOpen && !isShareSheetOpen && !isPlaylistSheetOpen && !isReportSheetOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          />

          <VideoCardMenuPanel
            isAlreadyQueued={isAlreadyQueued}
            isBookmarked={isBookmarked}
            isBookmarkPending={isBookmarkPending}
            videoPreference={videoPreference}
            channelPreference={channelPreference}
            channelName={channelName}
            refusalMessage={refusalMessage}
            onQueueClick={handleQueueClick}
            onOpenPlaylist={() => setIsPlaylistSheetOpen(true)}
            onBookmarkClick={handleBookmarkClick}
            onOpenShare={() => setIsShareSheetOpen(true)}
            onNotInterested={() => handleNotInterestedClick(true)}
            onNotInterestedUndo={() => handleNotInterestedClick(false)}
            onChannelMute={() => handleChannelMuteClick(true)}
            onChannelMuteUndo={() => handleChannelMuteClick(false)}
            onOpenReport={() => setIsReportSheetOpen(true)}
          />
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
