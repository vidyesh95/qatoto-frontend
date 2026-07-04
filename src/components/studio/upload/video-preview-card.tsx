"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Right-hand column of the upload modal. Create mode gets the picked File —
// a short timeout fakes the "Processing video…" → playable preview transition
// (UPLOAD_VIDEO_STRUCTURE.md §4). Edit mode only has the stored filename (no
// File object survives a save), so it shows a static placeholder instead.
type PreviewStage = "processing" | "ready";

const FAKE_PROCESSING_DURATION_MS = 2000;

type VideoPreviewCardProps = { videoFile: File } | { fileName: string };

export default function VideoPreviewCard(props: VideoPreviewCardProps) {
  const videoFile = "videoFile" in props ? props.videoFile : null;
  const fileName = "videoFile" in props ? props.videoFile.name : props.fileName;

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
      {!videoFile ? (
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
          <p className="text-xs text-muted-foreground">Filename</p>
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
