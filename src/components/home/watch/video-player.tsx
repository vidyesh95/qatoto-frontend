"use client";

// eslint-disable-next-line import/no-unassigned-import -- player stylesheet has no exports to bind
import "@vidstack/react/player/styles/default/theme.css";
// eslint-disable-next-line import/no-unassigned-import -- player stylesheet has no exports to bind
import "@vidstack/react/player/styles/default/layouts/video.css";

import { MediaPlayer, MediaProvider, Poster, Track } from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";

export type VideoPlayerChapter = {
  title: string;
  time: string;
};

export type VideoPlayerProps = {
  src: string;
  label: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  className?: string;
  /** Chapter markers rendered on the seek bar (times as "mm:ss" or "hh:mm:ss"). */
  chapters?: VideoPlayerChapter[];
  /** WebVTT storyboard file for seek-bar hover previews. */
  thumbnailsSrc?: string;
  /** Initial playback position, e.g. from a `?t=` deep link. */
  startTimeSeconds?: number;
};

function parseTimestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((totalSeconds, part) => totalSeconds * 60 + part, 0);
}

const padTwoDigits = (value: number) => String(value).padStart(2, "0");

function formatVttTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${padTwoDigits(hours)}:${padTwoDigits(minutes)}:${padTwoDigits(seconds)}.000`;
}

function buildChaptersWebVtt(chapters: VideoPlayerChapter[]): string {
  const cues = chapters.map((chapter, index) => {
    const startSeconds = parseTimestampToSeconds(chapter.time);
    const nextChapter = chapters[index + 1];
    const endSeconds = nextChapter ? parseTimestampToSeconds(nextChapter.time) : startSeconds + 60;
    return `${formatVttTimestamp(startSeconds)} --> ${formatVttTimestamp(endSeconds)}\n${chapter.title}`;
  });
  return `WEBVTT\n\n${cues.join("\n\n")}`;
}

/**
 * Engine-agnostic video player. Consumers pass a `src` and presentation
 * props; the underlying playback engine (currently vidstack's MediaPlayer
 * with its default video layout) is an implementation detail. Swapping
 * engines later means editing only this file — callers keep the same
 * prop contract.
 */
export default function VideoPlayer({
  src,
  label,
  poster,
  autoPlay = false,
  muted = false,
  controls = true,
  loop = false,
  playsInline = true,
  className = "w-full aspect-video rounded-xl overflow-hidden bg-black",
  chapters,
  thumbnailsSrc,
  startTimeSeconds,
}: VideoPlayerProps) {
  return (
    <MediaPlayer
      src={src}
      title={label}
      poster={poster}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      currentTime={startTimeSeconds}
      className={className}
      logLevel="silent"
    >
      <MediaProvider>
        {poster && <Poster className="vds-poster" src={poster} alt={label} />}
        {chapters && chapters.length > 0 && (
          <Track
            kind="chapters"
            label="Chapters"
            type="vtt"
            content={buildChaptersWebVtt(chapters)}
            default
          />
        )}
      </MediaProvider>
      {controls && (
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          colorScheme="light"
          thumbnails={thumbnailsSrc}
        />
      )}
    </MediaPlayer>
  );
}
