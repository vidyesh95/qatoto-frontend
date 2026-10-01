"use client";

import { useEffect, useRef, useState } from "react";
import type { PreferenceState } from "@/components/home/shared/video-card-menu-items";
import {
  describeEngagementError,
  useCreatorMuteMutation,
  useVideoNotInterestedMutation,
  useVideoSaveMutation,
  useVideoShareMutation,
} from "@/hooks/feed/mutations";
import { useQueue } from "@/state/queue-context";

export function useVideoCardMenuState({
  videoId,
  title,
  shareUrl,
  hasSaved = false,
  creatorId,
  channelName,
  thumbnailSrc,
}: {
  readonly videoId: string;
  readonly title: string;
  readonly shareUrl?: string;
  readonly hasSaved?: boolean;
  readonly creatorId: string;
  readonly channelName: string;
  readonly thumbnailSrc: string;
}) {
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
      href: shareUrl ?? `/watch?v=${encodeURIComponent(videoId)}`,
    });
  };

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
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    setIsMenuOpen((wasOpen) => !wasOpen);
  };

  const handleBookmarkClick = () => {
    const shouldBeBookmarked = !isBookmarked;
    setIsBookmarked(shouldBeBookmarked);
    saveVideoMutation.mutate(shouldBeBookmarked, {
      onSuccess: (result) => setIsBookmarked(result.hasSaved),
      onError: () => setIsBookmarked(!shouldBeBookmarked),
    });
  };

  const handleNotInterestedClick = (shouldBeSet: boolean) => {
    setVideoPreference({ status: "saving" });
    notInterestedMutation.mutate(shouldBeSet, {
      onSuccess: (result) => {
        setVideoPreference({ status: result.isNotInterested ? "hidden" : "idle" });
      },
      onError: () => setVideoPreference({ status: shouldBeSet ? "idle" : "hidden" }),
    });
  };

  const handleChannelMuteClick = (shouldBeSet: boolean) => {
    setChannelPreference({ status: "saving" });
    creatorMuteMutation.mutate(shouldBeSet, {
      onSuccess: (result) => {
        setChannelPreference({ status: result.isMuted ? "hidden" : "idle" });
      },
      onError: () => setChannelPreference({ status: shouldBeSet ? "idle" : "hidden" }),
    });
  };

  const failedMutationError =
    saveVideoMutation.error ?? notInterestedMutation.error ?? creatorMuteMutation.error ?? null;
  const refusal =
    failedMutationError === null ? null : describeEngagementError(failedMutationError);

  return {
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
    isBookmarkPending: saveVideoMutation.isPending,
    refusalMessage: refusal?.message ?? null,
    shareVideoMutation,
    handleTriggerClick,
    handleQueueClick,
    handleBookmarkClick,
    handleNotInterestedClick,
    handleChannelMuteClick,
  };
}
