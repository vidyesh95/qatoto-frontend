"use client";

// TRANSPORT: client-query — the watch screen. The payload arrives as props from
// `watch-page.tsx` (server-fetch); every control below writes to the backend.
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// TWO THINGS ON THIS SCREEN HAVE NO BACKEND COUNTERPART AND ARE MARKED `TRANSPORT: mock`.
//
// It used to be four. `seasons` NOW SHIPS on `GET /feed/watch/:videoId` — the backend grew a
// public series read to serve it — and the attached-product half moved to `comments.tsx` against
// a real `attachedProducts` field. Both placeholders are gone, along with their banners.
//
// What is left is `transcript` and `isPremium`, and neither is a wiring gap: there is no ASR
// pipeline and no transcript table, and there is no entitlement model, tier or paywall anywhere.
// Each is held EMPTY rather than invented, so the component shells survive with their layout.
//
// This DELIBERATELY breaks the `grep -rn "TRANSPORT: mock" src/` -> nothing invariant that the
// R&D surface holds. That grep returns these blocks and only these blocks, and
// docs/HOME_STRUCTURE.md §10 lists exactly them. If you are reading this while "fixing" a stray
// mock banner: this is not a regression, it is the decision. Delete a placeholder only when its
// field ships on the wire — which is exactly what happened to `seasons`.
// ─────────────────────────────────────────────────────────────────────────────────────────

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import RelativeTime from "@/components/home/shared/relative-time";
import VideoCard from "@/components/home/shared/video-card";
import Comments from "@/components/home/watch/comments";
import FocusButton from "@/components/home/watch/focus-button";
import VideoDescription from "@/components/home/watch/video-description";
import VideoEngagementBar from "@/components/home/watch/video-engagement-bar";
import WatchOpenRoles from "@/components/home/watch/watch-open-roles";
import { PROJECT_STAGE_LABELS } from "@/lib/rnd/labels";
import VideoPlayer from "@/components/home/watch/video-player";
import WatchInfoPanel from "@/components/home/watch/watch-info-panel";
import { formatSubscriberCountLabel, formatViewCountLabel } from "@/lib/feed/format";
import {
  toVideoCardProps,
  type FeedVideo,
  type VideoComment,
  type WatchPayload,
  type WatchSeasons,
} from "@/lib/feed/schemas";

/**
 * TRANSPORT: mock — `transcript` and `transcriptTitle` have no counterpart in
 * `GET /feed/watch/:videoId`.
 *
 * Speech-to-text is not a backend capability: no transcript table, no ASR job, no column on
 * `video`. The panel stays because the chapter list beside it IS real — `chapters` is on the
 * payload — and removing the transcript would take the chapter navigator with it. Empty rather
 * than invented, so the panel renders its chapters and simply shows no transcript rows.
 * Deliberate; docs/HOME_STRUCTURE.md §10.
 */
const PLACEHOLDER_TRANSCRIPT_TITLE = "Transcript";
const PLACEHOLDER_TRANSCRIPT: { time: string; text: string }[] = [];

/**
 * TRANSPORT: mock — `isPremium` has no counterpart anywhere in the backend.
 *
 * There is no premium tier, no entitlement table and no paywall. The banner is kept because
 * the product intends one, and it is hard-gated to `false` so it can never render over a video
 * a viewer is entitled to watch. Deliberate; docs/HOME_STRUCTURE.md §10.
 */
const PLACEHOLDER_IS_PREMIUM = false;

export default function WatchContent({
  video,
  initialComments = null,
  initialCommentsNextCursor = null,
  recommendedVideos = [],
  isViewerSignedIn,
  startTimeSeconds,
}: {
  readonly video: WatchPayload | null;
  /**
   * Page one of the thread, or NULL when the server had none — a failed read, or a caller with
   * no video at all. Null makes the island fetch page one itself; an empty array would claim,
   * permanently, that nobody has commented.
   */
  readonly initialComments?: VideoComment[] | null;
  readonly initialCommentsNextCursor?: string | null;
  readonly recommendedVideos?: FeedVideo[];
  readonly isViewerSignedIn: boolean;
  readonly startTimeSeconds?: number;
}) {
  const [isCommentsOpen, setIsCommentsOpen] = useState(true);
  // WHICH SEASON TAB IS OPEN, and nothing else. There is no `selectedEpisodeId` any more: the
  // episode being watched IS the current video, so selection is derived from `video.videoId`
  // rather than stored. The old state was a leftover from the fake list, where clicking an
  // episode could not navigate because the episode had no video behind it.
  const [activeSeasonIndex, setActiveSeasonIndex] = useState(0);

  if (video === null) {
    return (
      <section className="px-4 py-8 lg:px-6">
        <p className="text-sm text-[#6F7979]">Video not found.</p>
      </section>
    );
  }

  // `PLACEHOLDER_IS_PREMIUM` ALONE. The per-episode half of this expression is gone with the
  // fake list: the wire carries no `isPremium` on an episode, deliberately, because no
  // entitlement model exists and a lock over a free episode is a claim nobody can back.
  const showPremium = PLACEHOLDER_IS_PREMIUM;

  const chapterLabels = video.chapters.map((chapter) => ({
    title: chapter.title,
    time: toChapterTimeLabel(chapter.startSeconds),
  }));

  return (
    <section className="mx-auto px-4 py-6 lg:px-6">
      <div className="lg:flex lg:items-start lg:gap-4">
        {/* Left column — player, meta, engagement, comments */}
        <div className="min-w-0 space-y-4 lg:flex-1">
          {showPremium ? (
            <PremiumBanner />
          ) : (
            <VideoPlayer
              videoSource={video.videoSource}
              youtubeVideoId={video.youtubeVideoId}
              label={video.title}
              autoPlay
              startTimeSeconds={startTimeSeconds}
              videoId={video.videoId}
              // The reader arrived by URL as far as this component can tell. Threading the real
              // origin would mean carrying it through every card link; `direct` is the honest
              // answer rather than a guessed `feed_recommended`.
              feedSource="direct"
            />
          )}

          {/* In-video panel — mobile only, hidden for premium */}
          {!showPremium && (
            <WatchInfoPanel
              videoId={video.videoId}
              chapters={chapterLabels}
              transcriptTitle={PLACEHOLDER_TRANSCRIPT_TITLE}
              transcript={PLACEHOLDER_TRANSCRIPT}
              className="h-100 w-full lg:hidden"
            />
          )}

          <VideoDescription
            title={video.title}
            views={formatViewCountLabel(video.stats.viewCount)}
            // `postedAt` is a display string on this component and the payload gives an ISO
            // instant. Passing "" and rendering <RelativeTime> below keeps the relative label
            // out of any server render — see `relative-time.tsx`.
            postedAt=""
            description={video.description ?? ""}
          />

          {video.publishedAt !== null && (
            <RelativeTime isoInstant={video.publishedAt} className="text-xs text-[#6F7979]" />
          )}

          {/* Channel + subscribe */}
          <div className="flex flex-row items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-foreground">
              <Image
                src={video.creator.imageUrl ?? "/dummy/profile_image_01.avif"}
                width={38}
                height={38}
                alt="profile image"
                className="size-9.5 rounded-full"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-row items-center gap-1">
                <span className="text-sm font-medium">{video.creator.name}</span>
                {/*
                  NO VERIFIED BADGE. The backend omits `creator.isVerified` because no
                  creator-verification concept exists in its schema, and a hard-coded `false`
                  would be a trust signal the platform cannot support.
                */}
                <span className="ml-1 text-xs text-[#6F7979]">
                  {formatSubscriberCountLabel(video.creator.subscriberCount)}
                </span>
              </div>
            </div>
            <FocusButton
              creatorId={video.creator.id}
              isSubscribed={video.viewerState.isSubscribedToCreator}
            />
          </div>

          {/*
            BUILT IN THE OPEN. Present only when this video names an ACTIVE venture — the
            backend nulls it for a draft one rather than 404ing the video, so absence here
            means "no public venture", never "something went wrong". Identity and a link,
            deliberately: no counts, no equity, nothing that reads as a claim.
          */}
          {video.builtInTheOpen !== null && (
            <Link
              href={`/research-and-development/project/${video.builtInTheOpen.projectSlug}`}
              className="flex items-center gap-2 self-start rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs transition hover:bg-[#F4FBFA]"
            >
              <span className="text-[#6F7979]">Built in the open ·</span>
              <span className="font-medium text-[#191C1C]">{video.builtInTheOpen.projectName}</span>
              <span className="text-[#00696E]">
                {PROJECT_STAGE_LABELS[video.builtInTheOpen.stage]}
              </span>
            </Link>
          )}

          <WatchOpenRoles openRoles={video.openRoles} />

          <VideoEngagementBar
            videoId={video.videoId}
            initialViewerState={video.viewerState}
            initialStats={video.stats}
            videoTitle={video.title}
            isCommentsOpen={isCommentsOpen}
            onToggleComments={() => setIsCommentsOpen((isOpen) => !isOpen)}
          />

          {/*
            Season + Episode grid.

            `null` HIDES IT; `[]` RENDERS IT EMPTY, and the two are different answers rather than
            one absence. Null means this video is not an anime episode at all — every pitch and
            demo on the platform. An empty array means a series whose episodes are not public
            yet, which is a real state a creator can be in and which the picker should show as
            such rather than pretend the series does not exist.
          */}
          {video.seasons !== null && (
            <>
              <hr className="border-[#CAC4D0]" />
              <AnimeSeasonPanel
                seasons={video.seasons}
                currentVideoId={video.videoId}
                activeSeasonIndex={activeSeasonIndex}
                onSeasonChange={setActiveSeasonIndex}
              />
            </>
          )}

          {isCommentsOpen && (
            <Comments
              videoId={video.videoId}
              areCommentsEnabled={video.areCommentsEnabled}
              initialComments={initialComments}
              initialNextCursor={initialCommentsNextCursor}
              isViewerSignedIn={isViewerSignedIn}
              commentCount={video.stats.commentCount}
              attachedProducts={video.attachedProducts}
            />
          )}
        </div>

        {/* Right column — in-video panel + recommended */}
        <div className="mt-4 space-y-4 lg:mt-0 lg:w-100 lg:shrink-0">
          {!showPremium && (
            <WatchInfoPanel
              videoId={video.videoId}
              chapters={chapterLabels}
              transcriptTitle={PLACEHOLDER_TRANSCRIPT_TITLE}
              transcript={PLACEHOLDER_TRANSCRIPT}
              className="hidden w-full lg:block lg:h-68 xl:h-130 2xl:h-130"
            />
          )}

          {/*
            REAL, not mocked. The old version rendered four hardcoded cards; these come from
            `GET /feed/videos`, whose candidate pool already excludes the viewer's own uploads
            and anything they have recently watched.
          */}
          {recommendedVideos.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Recommended for You</h2>
              <div className="space-y-5">
                {recommendedVideos.map((recommendedVideo) => (
                  <VideoCard
                    key={recommendedVideo.videoId}
                    {...toVideoCardProps(recommendedVideo)}
                    /*
                      This rail is a fixed `lg:w-100` (400px) column that stacks to full width
                      below `lg` — not the quarter-viewport grid `VideoCard` assumes. Without
                      the override every card here fetches a grid-sized image it never uses.
                    */
                    thumbnailSizes="(min-width: 1024px) 400px, 100vw"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PremiumBanner() {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-xl bg-black p-6">
      <p className="text-center text-sm leading-5 font-medium tracking-[0.1px] text-[#C4C7C7]">
        Get Premium and enjoy the Premium exclusive video!
      </p>
      <button
        type="button"
        className="flex items-center gap-2 rounded-full bg-[#00696E] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        <Image
          src="/icons/diamond_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
          width={18}
          height={18}
          alt=""
        />
        Join the Premium
      </button>
    </div>
  );
}

/**
 * The season tabs and the episode grid.
 *
 * EVERY EPISODE IS A LINK, not a selection. The previous version stored a `selectedEpisodeId` in
 * component state and changed nothing when you clicked — which was correct while the list was a
 * fake with no videos behind it, and wrong the moment each row gained a real `videoId`. A picker
 * that highlights episode 4 and keeps playing episode 3 is worse than one that does nothing.
 *
 * WHICH EPISODE IS "SELECTED" IS DERIVED, never stored: it is whichever row matches the video on
 * screen. Storing it would let the highlight disagree with the player after a back-navigation.
 *
 * GAPS IN THE NUMBERING ARE REAL AND MUST SURVIVE. The server sends only episodes a stranger may
 * watch, so 1, 2, 4 means episode 3 is not public — renumbering to 1, 2, 3 would invent a fact.
 * The label therefore comes from `episodeNumber`, never from the array index.
 *
 * NO PREMIUM ICON. The wire carries no `isPremium` on an episode, deliberately.
 */
function AnimeSeasonPanel({
  seasons,
  currentVideoId,
  activeSeasonIndex,
  onSeasonChange,
}: {
  readonly seasons: WatchSeasons;
  readonly currentVideoId: string;
  readonly activeSeasonIndex: number;
  readonly onSeasonChange: (seasonIndex: number) => void;
}) {
  const episodes = seasons[activeSeasonIndex]?.episodes ?? [];

  return (
    <section>
      <h2 className="pb-2 text-base font-medium">Season</h2>
      <div className="border-b border-border">
        <div className="flex scrollbar-none overflow-x-auto px-2">
          {seasons.map((season, seasonIndex) => {
            const isActive = activeSeasonIndex === seasonIndex;
            return (
              <button
                key={season.seasonId}
                type="button"
                onClick={() => onSeasonChange(seasonIndex)}
                aria-pressed={isActive}
                className={`relative min-w-16 flex-1 cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? "text-[#00696E]" : "text-[#6F7979] hover:text-foreground"
                }`}
              >
                <span className="relative inline-block">
                  {season.seasonLabel}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-3 h-0.75 rounded-t-full bg-[#00696E]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <h2 className="pt-4 pb-3 text-base font-medium">Episode</h2>
      {episodes.length === 0 ? (
        // A SEASON WITH NO PUBLIC EPISODES IS A REAL STATE, not an error — the creator has
        // created the season and released nothing in it yet.
        <p className="text-sm text-[#6F7979]">No episodes released in this season yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {episodes.map((episode) => {
            const isCurrent = episode.videoId === currentVideoId;
            return (
              <Link
                key={episode.episodeId}
                href={`/watch?v=${encodeURIComponent(episode.videoId)}`}
                aria-current={isCurrent ? "true" : undefined}
                title={episode.episodeTitle}
                className={`flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-[#CCE8E9] text-[#041F21]"
                    : "text-[#3F4949] ring-1 ring-[#6F7979] hover:bg-[#F1F3F3]"
                }`}
              >
                {episode.episodeNumber}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

/**
 * `412` -> `"6:52"`. The payload carries chapter starts as integer seconds; `WatchInfoPanel`
 * takes the display string, and it is the one that builds `?t=` deep links from it.
 */
function toChapterTimeLabel(startSeconds: number): string {
  const totalSeconds = Math.max(0, Math.trunc(startSeconds));
  const hours = Math.trunc(totalSeconds / 3600);
  const minutes = Math.trunc((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours === 0
    ? `${minutes}:${seconds}`
    : `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`;
}
