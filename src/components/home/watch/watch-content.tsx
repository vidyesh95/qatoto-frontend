"use client";

import { useState } from "react";

import Image from "next/image";

import Comments from "@/components/home/watch/comments";
import FocusButton from "@/components/home/watch/focus-button";
import ShareButton from "@/components/home/watch/share-sheet";
import StatPill from "@/components/home/watch/stat-pill";
import VideoCard, { type VideoCardProps } from "@/components/home/shared/video-card";
import VideoDescription from "@/components/home/watch/video-description";
import VideoPlayer from "@/components/home/watch/video-player";
import WatchInfoPanel from "@/components/home/watch/watch-info-panel";
import type { Episode, Season, WatchVideo } from "@/lib/videos";

const RECOMMENDED_VIDEOS: VideoCardProps[] = [
  {
    thumbnailSrc: "/dummy/thumbnail_image02.avif",
    profileSrc: "/dummy/profile_image_02.avif",
    title: "Need for speed @234MPH",
    channelName: "BTS fan boi🤩",
    views: "973 views",
    postedAt: "37 minutes ago",
    hoverBg: "group-hover:bg-amber-100",
  },
  {
    thumbnailSrc: "/dummy/thumbnail_image03.avif",
    profileSrc: "/dummy/profile_image_03.avif",
    title: "Your everyday slicing made easy - cucumber, carrot, radish in snap",
    channelName: "Home owners friend",
    views: "9k watching",
    postedAt: "Live",
    verified: true,
    hoverBg: "group-hover:bg-green-100",
    isChannelLive: true,
  },
  {
    thumbnailSrc: "/dummy/thumbnail_image04.avif",
    profileSrc: "/dummy/profile_image_04.avif",
    title: "Lo-fi beats to study and relax to all night long",
    channelName: "Chill Hub",
    views: "412k views",
    postedAt: "2 days ago",
    hoverBg: "group-hover:bg-indigo-100",
  },
  {
    thumbnailSrc: "/dummy/thumbnail_image01.avif",
    profileSrc: "/dummy/profile_image_01.avif",
    title: "Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land",
    channelName: "Arin Light",
    views: "2.5M views",
    postedAt: "12 hours ago",
    verified: true,
    hoverBg: "group-hover:bg-yellow-100",
  },
];

function findEpisode(seasons: Season[], episodeId: string): Episode | undefined {
  for (const season of seasons) {
    const matchingEpisode = season.episodes.find((episode) => episode.id === episodeId);
    if (matchingEpisode) return matchingEpisode;
  }
  return undefined;
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

function AnimeSeasonPanel({
  seasons,
  activeSeason,
  selectedEpisodeId,
  onSeasonChange,
  onEpisodeSelect,
}: {
  seasons: Season[];
  activeSeason: number;
  selectedEpisodeId: string;
  onSeasonChange: (seasonIndex: number) => void;
  onEpisodeSelect: (episodeId: string) => void;
}) {
  const episodes = seasons[activeSeason]?.episodes ?? [];

  return (
    <section>
      <h2 className="pb-2 text-base font-medium">Season</h2>
      <div className="border-b border-border">
        <div className="flex scrollbar-none overflow-x-auto px-2">
          {seasons.map((season, seasonIndex) => {
            const isActive = activeSeason === seasonIndex;
            return (
              <button
                key={season.id}
                type="button"
                onClick={() => onSeasonChange(seasonIndex)}
                aria-pressed={isActive}
                className={`relative min-w-16 flex-1 cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? "text-[#00696E]" : "text-[#6F7979] hover:text-foreground"
                }`}
              >
                <span className="relative inline-block">
                  {season.label}
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
      <div className="grid grid-cols-3 gap-3">
        {episodes.map((episode) => {
          const isSelected = episode.id === selectedEpisodeId;
          return (
            <button
              key={episode.id}
              type="button"
              onClick={() => onEpisodeSelect(episode.id)}
              className={`flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-[#CCE8E9] text-[#041F21]"
                  : "text-[#3F4949] ring-1 ring-[#6F7979] hover:bg-[#F1F3F3]"
              }`}
            >
              {episode.label}
              {episode.isPremium && (
                <Image
                  src={`/icons/diamond_24dp_000000_FILL${isSelected ? 1 : 0}_wght400_GRAD0_opsz24.svg`}
                  width={14}
                  height={14}
                  alt="premium"
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function WatchContent({ video }: { video: WatchVideo | null }) {
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>(
    () => video?.seasons?.[0]?.episodes[0]?.id ?? "",
  );
  const [activeSeason, setActiveSeason] = useState(0);

  if (!video) {
    return (
      <section className="px-4 py-8 lg:px-6">
        <p className="text-sm text-[#6F7979]">Video not found.</p>
      </section>
    );
  }

  const { stats } = video;
  const selectedEpisode = video.seasons ? findEpisode(video.seasons, selectedEpisodeId) : undefined;
  const showPremium = !!(video.isPremium || selectedEpisode?.isPremium);

  return (
    <section className="mx-auto px-4 py-6 lg:px-6">
      <div className="lg:flex lg:items-start lg:gap-4">
        {/* Left column — player, meta, seasons, comments */}
        <div className="min-w-0 space-y-4 lg:flex-1">
          {showPremium ? (
            <PremiumBanner />
          ) : (
            <VideoPlayer src={video.videoSrc} label={video.title} autoPlay muted />
          )}

          {/* In-video panel — mobile only, hidden for premium */}
          {!showPremium && (
            <WatchInfoPanel
              videoId={video.id}
              chapters={video.chapters}
              transcriptTitle={video.transcriptTitle}
              transcript={video.transcript}
              className="h-100 w-full lg:hidden"
            />
          )}

          <VideoDescription
            title={video.title}
            views={video.views}
            postedAt={video.postedAt}
            description={video.description}
          />

          {/* Channel + Focus */}
          <div className="flex flex-row items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-foreground">
              <Image
                src={video.profileSrc}
                width={38}
                height={38}
                alt="profile image"
                className="size-9.5 rounded-full"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-row items-center gap-1">
                <span className="text-sm font-medium">{video.channelName}</span>
                {video.verified && (
                  <Image
                    src={"/icons/check_circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"}
                    width={16}
                    height={16}
                    alt="verified"
                  />
                )}
                <span className="ml-1 text-xs text-[#6F7979]">{video.subscribers}</span>
              </div>
            </div>
            <FocusButton />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 items-center gap-2 lg:flex lg:flex-row">
            <StatPill
              icon="comment"
              label={stats.comments}
              active={commentsOpen}
              onClick={() => setCommentsOpen((open) => !open)}
            />
            <StatPill icon="favorite" label={stats.likes} />
            <StatPill icon="bookmark" label={stats.bookmarks} />
            <ShareButton shares={stats.shares} />
          </div>

          {/* Season + Episode grid — anime only */}
          {video.seasons && (
            <>
              <hr className="border-[#CAC4D0]" />
              <AnimeSeasonPanel
                seasons={video.seasons}
                activeSeason={activeSeason}
                selectedEpisodeId={selectedEpisodeId}
                onSeasonChange={(seasonIndex) => {
                  setActiveSeason(seasonIndex);
                  setSelectedEpisodeId(video.seasons![seasonIndex]?.episodes[0]?.id ?? "");
                }}
                onEpisodeSelect={setSelectedEpisodeId}
              />
            </>
          )}

          {/* Comments + reviews */}
          {commentsOpen && (
            <Comments
              count={stats.comments}
              comments={video.comments}
              trending={video.trending}
              saleItem={video.saleItem}
              reviews={video.reviews}
            />
          )}
        </div>

        {/* Right column — in-video panel + recommended */}
        <div className="mt-4 space-y-4 lg:mt-0 lg:w-100 lg:shrink-0">
          {!showPremium && (
            <WatchInfoPanel
              videoId={video.id}
              chapters={video.chapters}
              transcriptTitle={video.transcriptTitle}
              transcript={video.transcript}
              className="hidden w-full lg:block lg:h-68 xl:h-130 2xl:h-130"
            />
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-medium">Recommended for You</h2>
            <div className="space-y-5">
              {RECOMMENDED_VIDEOS.map((recommendedVideo) => (
                <VideoCard key={recommendedVideo.title} {...recommendedVideo} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
