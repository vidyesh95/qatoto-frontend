"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { buildYoutubeEmbedUrl, extractYoutubeVideoId } from "@/lib/youtube";

// Right-hand column of the upload modal. A linked YouTube video embeds
// directly — the iframe shows YouTube's own thumbnail until it is played, so
// there is nothing to "process". A picked File uses a short timeout to fake the
// "Processing video…" → playable preview transition (UPLOAD_VIDEO_STRUCTURE.md
// §4). Edit mode only has the stored filename (no File object survives a save),
// so it shows a static placeholder instead.
type PreviewStage = "processing" | "ready";

const FAKE_PROCESSING_DURATION_MS = 2000;

type VideoPreviewCardProps = { videoFile: File } | { youtubeUrl: string } | { fileName: string };

export default function VideoPreviewCard(props: VideoPreviewCardProps) {
  const videoFile = "videoFile" in props ? props.videoFile : null;
  const youtubeUrl = "youtubeUrl" in props ? props.youtubeUrl : null;
  const youtubeVideoId = youtubeUrl === null ? null : extractYoutubeVideoId(youtubeUrl);
  const sourceLabel = youtubeUrl ?? ("videoFile" in props ? props.videoFile.name : null);
  const fileName = sourceLabel ?? ("fileName" in props ? props.fileName : "");

  const [previewStage, setPreviewStage] = useState<PreviewStage>("processing");
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoFile) return undefined;
    const objectUrl = URL.createObjectURL(videoFile);
    setVideoObjectUrl(objectUrl);
    setPreviewStage("processing");

    const processingTimeoutId = setTimeout(() => {
      setPreviewStage("ready");
    }, FAKE_PROCESSING_DURATION_MS);

    return () => {
      clearTimeout(processingTimeoutId);
      URL.revokeObjectURL(objectUrl);
    };
  }, [videoFile]);

  const fakeWatchUrl = `https://qatoto.com/watch/${buildFakeWatchSlug(fileName)}`;

  function handleCopyWatchLinkClick() {
    void navigator.clipboard?.writeText(fakeWatchUrl);
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-secondary/50">
      {youtubeVideoId ? (
        <iframe
          src={buildYoutubeEmbedUrl(youtubeVideoId)}
          title="YouTube video preview"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          // The player needs both to run; youtube-nocookie is a foreign origin, so
          // same-origin only grants it its own storage, never ours. Top-level
          // navigation and form submission stay blocked.
          // oxlint-disable-next-line iframe-missing-sandbox
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allowFullScreen
          className="aspect-video w-full bg-black"
        />
      ) : !videoFile ? (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-secondary">
          <Image
            src="/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={28}
            height={28}
          />
          <p className="text-xs text-muted-foreground">Preview available on the watch page</p>
        </div>
      ) : previewStage === "processing" ? (
        <div className="flex aspect-video w-full animate-pulse flex-col items-center justify-center gap-2 bg-secondary">
          <Image
            src="/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={28}
            height={28}
          />
          <p className="text-xs text-muted-foreground">Processing video…</p>
        </div>
      ) : (
        videoObjectUrl && (
          <video src={videoObjectUrl} controls className="aspect-video w-full bg-black">
            <track kind="captions" />
          </video>
        )
      )}

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Video link</p>
            <p className="truncate text-sm text-[#1DBDC5]">{fakeWatchUrl}</p>
          </div>
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

// Stable pseudo-slug so the fake link doesn't change between renders — real
// video ids come from the backend later.
function buildFakeWatchSlug(fileName: string) {
  let hashValue = 0;
  for (let characterIndex = 0; characterIndex < fileName.length; characterIndex++) {
    hashValue = (hashValue * 31 + fileName.charCodeAt(characterIndex)) % 36 ** 6;
  }
  return hashValue.toString(36).padStart(6, "0");
}
