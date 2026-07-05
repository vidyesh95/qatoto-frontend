"use client";

import Image from "next/image";
import { useState } from "react";
import { MOCK_CREATOR_NAME, MOCK_CURRENT_STAFF_MEMBER } from "@/lib/admin-staff";
import { useAdminAuditLog } from "@/state/admin-audit-log-context";
import { StudioVideo, useStudioVideos } from "@/state/studio-videos-context";
import EpisodeReviewDetail from "@/components/admin/review/episode-review-detail";

// Staff content review queue (ADMIN_STRUCTURE.md §4.1, UI phase). Reads the
// same store the creator's My Videos list uses; Approve / Reject flip the
// video's status via updateVideo, so decisions are state-only mocks. The
// detail view is in-page state, not a sub-route — "pending list → detail →
// decision" is a view transition over client data.

type ReviewTab = "pending" | "approved" | "rejected";

type ReviewPageView = { kind: "queue-list" } | { kind: "episode-detail"; videoId: string };

const REVIEW_TABS: { tab: ReviewTab; label: string; statusKind: StudioVideo["status"]["kind"] }[] =
  [
    { tab: "pending", label: "Pending", statusKind: "pending-review" },
    { tab: "approved", label: "Approved", statusKind: "approved" },
    { tab: "rejected", label: "Rejected", statusKind: "rejected" },
  ];

export default function ReviewQueuePage() {
  const { videos, updateVideo } = useStudioVideos();
  const { appendAuditLogEntry } = useAdminAuditLog();
  const [activeReviewTab, setActiveReviewTab] = useState<ReviewTab>("pending");
  const [reviewPageView, setReviewPageView] = useState<ReviewPageView>({ kind: "queue-list" });

  function recordReviewDecision(video: StudioVideo, actionLabel: string, detailNote: string) {
    appendAuditLogEntry({
      id: crypto.randomUUID(),
      actorName: MOCK_CURRENT_STAFF_MEMBER.fullName,
      actorRole: MOCK_CURRENT_STAFF_MEMBER.role,
      actionLabel,
      targetLabel: buildReviewTargetLabel(video),
      detailNote,
      occurredAtLabel: "Just now",
    });
  }

  function handleApproveEpisode(video: StudioVideo) {
    updateVideo({ ...video, status: { kind: "approved" } });
    recordReviewDecision(video, "Approved episode", "");
    setReviewPageView({ kind: "queue-list" });
  }

  function handleRejectEpisode(video: StudioVideo, rejectionReason: string) {
    updateVideo({ ...video, status: { kind: "rejected", rejectionReason } });
    recordReviewDecision(video, "Rejected episode", rejectionReason);
    setReviewPageView({ kind: "queue-list" });
  }

  if (reviewPageView.kind === "episode-detail") {
    const videoBeingReviewed = videos.find(
      (existingVideo) => existingVideo.id === reviewPageView.videoId,
    );

    // Stale id (video gone from the store) — fall back to the queue list.
    if (videoBeingReviewed) {
      return (
        <EpisodeReviewDetail
          video={videoBeingReviewed}
          onBackToQueueClick={() => setReviewPageView({ kind: "queue-list" })}
          onApprove={() => handleApproveEpisode(videoBeingReviewed)}
          onRejectWithReason={(rejectionReason) =>
            handleRejectEpisode(videoBeingReviewed, rejectionReason)
          }
        />
      );
    }
  }

  const activeStatusKind = REVIEW_TABS.find(
    (tabConfig) => tabConfig.tab === activeReviewTab,
  )!.statusKind;
  const videosInActiveTab = videos.filter((video) => video.status.kind === activeStatusKind);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Content review</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Videos land here on upload and stay hidden until approved. Approved anime episodes
        auto-publish on their release date.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {REVIEW_TABS.map((tabConfig) => {
          const videosInTabCount = videos.filter(
            (video) => video.status.kind === tabConfig.statusKind,
          ).length;

          return (
            <button
              key={tabConfig.tab}
              type="button"
              onClick={() => setActiveReviewTab(tabConfig.tab)}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeReviewTab === tabConfig.tab
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabConfig.label} ({videosInTabCount})
            </button>
          );
        })}
      </div>

      {videosInActiveTab.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-border py-16">
          <p className="text-lg font-medium text-foreground">Nothing here</p>
          <p className="text-sm text-muted-foreground">
            No {activeReviewTab} videos in the queue right now.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {videosInActiveTab.map((video) => (
            <ReviewQueueRow
              key={video.id}
              video={video}
              onRowClick={() => setReviewPageView({ kind: "episode-detail", videoId: video.id })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// "Stellar Drift · Season 1 · Ep 3" for anime episodes; plain title otherwise.
function buildReviewTargetLabel(video: StudioVideo): string {
  const episodeDetails = video.animeEpisodeDetails;
  if (video.videoType === "anime-episode" && episodeDetails) {
    return `${episodeDetails.seriesName} · ${episodeDetails.seasonLabel} · Ep ${episodeDetails.episodeNumber}`;
  }
  return video.title;
}

function ReviewQueueRow({ video, onRowClick }: { video: StudioVideo; onRowClick: () => void }) {
  const episodeDetails = video.animeEpisodeDetails;
  const secondaryLineText =
    video.videoType === "anime-episode" && episodeDetails
      ? `${episodeDetails.seriesName} · ${episodeDetails.seasonLabel} · Ep ${episodeDetails.episodeNumber}`
      : video.fileName;

  return (
    <li>
      <button
        type="button"
        onClick={onRowClick}
        className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-secondary/50"
      >
        <span className="flex aspect-video w-28 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Image
            src={
              video.videoType === "anime-episode"
                ? "/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                : "/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            }
            alt=""
            width={24}
            height={24}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{video.title}</p>
          <p className="truncate text-xs text-muted-foreground">{secondaryLineText}</p>
          {video.status.kind === "rejected" && (
            <p className="mt-1 text-xs text-destructive">Reason: {video.status.rejectionReason}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
          <span>{MOCK_CREATOR_NAME}</span>
          <span className="w-24 text-right">{video.uploadedAtLabel}</span>
        </div>
      </button>
    </li>
  );
}
