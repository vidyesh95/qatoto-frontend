"use client";

// TRANSPORT: client-query — like, save and share, wired to `/videos/:videoId/*`.
//
// VIEWER STATE ARRIVES WITH THE PAYLOAD. `GET /feed/watch/:videoId` embeds
// `viewerState: { hasLiked, hasSaved, isSubscribedToCreator }`, so there is no "hydrate my
// likes" follow-up call and the first paint already shows the right icon fill.
//
// LIKE AND SAVE ARE OPTIMISTIC; SHARE IS NOT. A like is cheap, idempotent server-side (each
// toggle has a per-user unique key) and visually instant — rolling it back costs nothing. The
// share COUNT is different: `videoStats.shareCount` moves only for a signed-in sharer, because
// it feeds the quality score's engagement rate and anonymous traffic must not move a ranking
// input. Incrementing it locally would show a number the server never agreed to.

import { useState } from "react";

import { ShareSheet } from "@/components/home/watch/share-sheet";
import StatPill from "@/components/home/watch/stat-pill";
import {
  describeEngagementError,
  useVideoLikeMutation,
  useVideoSaveMutation,
  useVideoShareMutation,
} from "@/hooks/feed/mutations";
import { formatCompactCountLabel } from "@/lib/feed/format";

export default function VideoEngagementBar({
  videoId,
  initialViewerState,
  initialStats,
  isCommentsOpen,
  onToggleComments,
}: {
  readonly videoId: string;
  readonly initialViewerState: { readonly hasLiked: boolean; readonly hasSaved: boolean };
  readonly initialStats: {
    readonly likeCount: number;
    readonly saveCount: number;
    readonly shareCount: number;
    readonly commentCount: number;
  };
  readonly isCommentsOpen: boolean;
  readonly onToggleComments: () => void;
}) {
  const [hasLiked, setHasLiked] = useState(initialViewerState.hasLiked);
  const [likeCount, setLikeCount] = useState(initialStats.likeCount);
  const [hasSaved, setHasSaved] = useState(initialViewerState.hasSaved);
  const [saveCount, setSaveCount] = useState(initialStats.saveCount);
  const [shareCount, setShareCount] = useState(initialStats.shareCount);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  const likeVideoMutation = useVideoLikeMutation(videoId);
  const saveVideoMutation = useVideoSaveMutation(videoId);
  const shareVideoMutation = useVideoShareMutation(videoId);

  const handleLikeClick = () => {
    const nextHasLiked = !hasLiked;
    setHasLiked(nextHasLiked);
    setLikeCount((previousCount) => previousCount + (nextHasLiked ? 1 : -1));
    likeVideoMutation.mutate(nextHasLiked, {
      // Settle on the server's numbers rather than keeping the guess: someone else's like may
      // have landed between the render and this call.
      onSuccess: (result) => {
        setHasLiked(result.hasLiked);
        setLikeCount(result.likeCount);
      },
      onError: () => {
        setHasLiked(!nextHasLiked);
        setLikeCount((previousCount) => previousCount + (nextHasLiked ? -1 : 1));
      },
    });
  };

  const handleSaveClick = () => {
    const nextHasSaved = !hasSaved;
    setHasSaved(nextHasSaved);
    setSaveCount((previousCount) => previousCount + (nextHasSaved ? 1 : -1));
    saveVideoMutation.mutate(nextHasSaved, {
      onSuccess: (result) => {
        setHasSaved(result.hasSaved);
        setSaveCount(result.saveCount);
      },
      onError: () => {
        setHasSaved(!nextHasSaved);
        setSaveCount((previousCount) => previousCount + (nextHasSaved ? -1 : 1));
      },
    });
  };

  // The refusal that matters most here is 403, not 401: better-auth's anonymous sessions carry
  // a cookie, so those viewers look signed in and would otherwise meet a control that silently
  // does nothing.
  const refusal =
    likeVideoMutation.error !== null
      ? describeEngagementError(likeVideoMutation.error)
      : saveVideoMutation.error !== null
        ? describeEngagementError(saveVideoMutation.error)
        : null;

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-4 items-center gap-2 lg:flex lg:flex-row">
        <StatPill
          icon="comment"
          label={formatCompactCountLabel(initialStats.commentCount)}
          active={isCommentsOpen}
          onClick={onToggleComments}
        />
        <StatPill
          icon="favorite"
          label={formatCompactCountLabel(likeCount)}
          active={hasLiked}
          onClick={handleLikeClick}
        />
        <StatPill
          icon="bookmark"
          label={formatCompactCountLabel(saveCount)}
          active={hasSaved}
          onClick={handleSaveClick}
        />
        <span className="relative inline-flex w-full lg:w-24">
          <StatPill
            icon="share"
            label={formatCompactCountLabel(shareCount)}
            onClick={() => setIsShareSheetOpen(true)}
          />
          {isShareSheetOpen && (
            <ShareSheet
              onClose={() => setIsShareSheetOpen(false)}
              onShared={(channel) => {
                shareVideoMutation.mutate(channel, {
                  // The server's number, not ours — see the header note on anonymous sharers.
                  onSuccess: (result) => setShareCount(result.shareCount),
                });
              }}
            />
          )}
        </span>
      </div>
      {refusal !== null && (
        <p role="alert" className="text-xs text-red-700">
          {refusal.message}
        </p>
      )}
    </div>
  );
}
