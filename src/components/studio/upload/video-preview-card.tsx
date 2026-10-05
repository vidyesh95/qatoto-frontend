"use client";

import Image from "next/image";
import { useEffect, useRef, type RefObject } from "react";
import { SITE_URL } from "@/lib/site";
import { buildYoutubeEmbedUrl, extractYoutubeVideoId } from "@/lib/youtube";

// Right-hand column of the upload modal. A linked YouTube video embeds
// directly — the iframe shows YouTube's own thumbnail until it is played, so
// there is nothing to "process". A picked File plays straight from the
// browser's own copy (an object URL) the moment it is picked. Edit mode only has
// the stored filename (no File object survives a save), so it shows a static
// placeholder instead.
//
// ⚠️ NO "PROCESSING" STAGE. A picked file used to sit behind a 2-second timer
// showing "Processing video…" before the same local preview appeared. Nothing was
// being processed — the file had not left the browser, and today it never does,
// because Qatoto does not host video and the save refuses a file. The timer only
// pretended the upload was further along than it was.
//
// ⚠️ THE "VIDEO LINK" IS THE REAL WATCH URL OR NOTHING. It used to be
// `https://qatoto.com/watch/<hash of the title or YouTube URL>` — a path the watch route does
// not serve (it reads `?v=<video id>`), shown with a copy button before the video even existed.
// A creator who pasted it anywhere shared a dead link. Now an existing video (edit mode) shows
// `/watch?v=<its id>`, and a video not yet saved says the link arrives with the save.
type VideoPreviewSource = { videoFile: File } | { youtubeUrl: string } | { fileName: string };

/** `savedVideoId` is the backend's id once the video exists, and `null` before the first save. */
type VideoPreviewCardProps = VideoPreviewSource & { readonly savedVideoId: string | null };

function resolvePreviewProps(props: VideoPreviewSource) {
  if ("youtubeUrl" in props) {
    const youtubeVideoId = extractYoutubeVideoId(props.youtubeUrl);
    return {
      videoFile: null,
      youtubeUrl: props.youtubeUrl,
      youtubeVideoId,
      fileName: props.youtubeUrl,
    };
  }
  if ("videoFile" in props) {
    return {
      videoFile: props.videoFile,
      youtubeUrl: null,
      youtubeVideoId: null,
      fileName: props.videoFile.name,
    };
  }
  return {
    videoFile: null,
    youtubeUrl: null,
    youtubeVideoId: null,
    fileName: props.fileName,
  };
}

function VideoDisplay({
  youtubeVideoId,
  videoFile,
  videoElementRef,
}: {
  readonly youtubeVideoId: string | null;
  readonly videoFile: File | null;
  readonly videoElementRef: RefObject<HTMLVideoElement | null>;
}) {
  if (youtubeVideoId !== null) {
    return (
      <iframe
        src={buildYoutubeEmbedUrl(youtubeVideoId)}
        title="YouTube video preview"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-scripts allow-popups allow-presentation"
        allowFullScreen
        className="aspect-video w-full bg-black"
      />
    );
  }

  if (videoFile === null) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-secondary">
        <Image
          src="/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={28}
          height={28}
        />
        <p className="text-xs text-muted-foreground">Preview available on the watch page</p>
      </div>
    );
  }

  // `src` is attached by the card's effect, not here: the object URL is an external resource with a
  // lifetime, and the effect is what creates and revokes it.
  return (
    <video ref={videoElementRef} controls className="aspect-video w-full bg-black">
      <track kind="captions" />
    </video>
  );
}

export default function VideoPreviewCard(props: VideoPreviewCardProps) {
  const { videoFile, youtubeUrl, youtubeVideoId, fileName } = resolvePreviewProps(props);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Points the player at the browser's own copy of the picked file, and revokes that copy when the
  // file changes or the card unmounts. Strict Mode's setup → cleanup → setup makes a fresh URL on the
  // second setup, so the revoked one is never left on the element.
  useEffect(() => {
    const videoElement = videoElementRef.current;
    const objectUrl = videoFile && videoElement !== null ? URL.createObjectURL(videoFile) : null;
    if (objectUrl !== null && videoElement !== null) {
      videoElement.src = objectUrl;
    }
    return () => {
      if (objectUrl) {
        videoElement?.removeAttribute("src");
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [videoFile]);

  const watchUrl =
    props.savedVideoId === null
      ? null
      : `${SITE_URL}/watch?v=${encodeURIComponent(props.savedVideoId)}`;

  function handleCopyWatchLinkClick() {
    if (watchUrl !== null) void navigator.clipboard?.writeText(watchUrl);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-secondary/50">
      <VideoDisplay
        youtubeVideoId={youtubeVideoId}
        videoFile={videoFile}
        videoElementRef={videoElementRef}
      />

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Video link</p>
            {watchUrl === null ? (
              <p className="text-sm text-muted-foreground">Available once you save</p>
            ) : (
              <p className="truncate text-sm text-primary-imprint">{watchUrl}</p>
            )}
          </div>
          {watchUrl !== null && (
            <button
              type="button"
              onClick={handleCopyWatchLinkClick}
              aria-label="Copy video link"
              className="shrink-0 cursor-pointer rounded-full p-2 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/content_copy_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
              />
            </button>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {youtubeUrl === null ? "Filename" : "YouTube link"}
          </p>
          <p className="truncate text-sm text-foreground">{fileName}</p>
        </div>
      </div>
    </div>
  );
}
