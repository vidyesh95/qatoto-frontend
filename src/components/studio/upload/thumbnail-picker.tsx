// TRANSPORT: props-only — validates a `File` and hands it up. The parent owns the upload,
// because in create mode there is no `videoId` to upload against until after the video exists.
//
// REPLACES A DEAD CONTROL. This slot used to be a dashed box reading "Change in mobile app",
// which did nothing on any platform. The backend route has existed all along:
// `POST /videos/:videoId/thumbnail`, multipart field **`image`**, 5 MB, sharp re-encode to AVIF
// at max 1280px, Cloudinary. Only this half was missing.
//
// THE DEFAULT PREVIEW IS YOUTUBE'S OWN THUMBNAIL, not an empty box. Every video here is a
// YouTube link, so there is always a real image to show — a creator who is happy with it should
// not have to upload anything, and showing blank would imply they must.

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { extractYoutubeVideoId } from "@/lib/youtube";

/**
 * What the OS file picker may offer, mirroring `ALLOWED_INPUT_FORMATS` in the backend's
 * `src/lib/image.ts`. Without it the picker offers files the server will refuse, and the
 * creator only finds out after an upload round trip.
 *
 * `image/heic` IS DELIBERATELY ABSENT — the same call `slide-image-picker.tsx` makes, for the
 * same reason: the server's libheif is built with the AV1 decoder only and cannot decode
 * HEVC-coded HEIC. On iOS, an accept list with no HEIC entry makes Safari hand over a
 * transcoded JPEG instead, so omitting it is the fix rather than an oversight.
 */
const ACCEPTED_THUMBNAIL_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/**
 * The `accept` attribute value: the MIME types above plus their extensions.
 *
 * SEPARATE FROM THE ARRAY ON PURPOSE. `accept` is a hint the OS dialog may ignore and a
 * dragged file never consults at all, so the extensions belong here while the JS check below is
 * the actual gate.
 */
const ACCEPTED_THUMBNAIL_TYPES = [
  ...ACCEPTED_THUMBNAIL_MIME_TYPES,
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
].join(",");

/** `limits.fileSize` in the backend's `upload-video-thumbnail` middleware. */
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

/** `MIN_DIMENSION_PX` in the backend's `src/lib/image.ts`. */
const MIN_THUMBNAIL_DIMENSION_PX = 64;

/**
 * State as a union, because validation is ASYNCHRONOUS — reading real pixel dimensions means
 * decoding the file — and an `isChecking` boolean beside an `error?` string would permit
 * "checking and already rejected" at once.
 */
type ThumbnailPickState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "rejected"; message: string }
  | { status: "ready"; previewUrl: string };

type ThumbnailCheckResult = { success: true } | { success: false; message: string };

function formatMegabytes(byteCount: number): string {
  return `${(byteCount / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Everything the server checks about the bytes, checked here first.
 *
 * NOT A TRUST BOUNDARY — the backend re-validates format, size and dimensions and is the only
 * authority. This exists so a 5 MB upload is not how a creator discovers their image is 40
 * pixels tall.
 *
 * ORDER IS CHEAPEST-FIRST: string compare, number compare, then a decode.
 */
async function checkThumbnailFile(file: File): Promise<ThumbnailCheckResult> {
  if (!(ACCEPTED_THUMBNAIL_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { success: false, message: "That file isn't a JPEG, PNG, WebP or AVIF image." };
  }

  if (file.size > MAX_THUMBNAIL_BYTES) {
    return {
      success: false,
      message: `That image is ${formatMegabytes(file.size)}. The limit is 5 MB.`,
    };
  }

  // THE DECODE IS THE HEIC CATCH. An iPhone photo renamed to `.jpg` passes the MIME check on
  // some platforms and then fails server-side with an unhelpful format error.
  let decodedBitmap: ImageBitmap;
  try {
    decodedBitmap = await createImageBitmap(file);
  } catch {
    return {
      success: false,
      message:
        "Couldn't read that image. If it came from an iPhone it may be HEIC — export it as JPEG first.",
    };
  }

  const widthPx = decodedBitmap.width;
  const heightPx = decodedBitmap.height;
  // Frees the decoded pixels immediately rather than waiting for GC.
  decodedBitmap.close();

  if (widthPx < MIN_THUMBNAIL_DIMENSION_PX || heightPx < MIN_THUMBNAIL_DIMENSION_PX) {
    return {
      success: false,
      message: `That image is ${String(widthPx)} × ${String(heightPx)}. Both sides must be at least ${String(MIN_THUMBNAIL_DIMENSION_PX)} pixels.`,
    };
  }

  return { success: true };
}

/**
 * YouTube's own thumbnail for a link, or null when the link is not parseable yet.
 *
 * `extractYoutubeVideoId` already owns the hostname allowlist and the 11-character id regex —
 * building this URL by hand anywhere is how an unvalidated id reaches an `<img src>`.
 * `hqdefault` exists for every video; `maxresdefault` 404s on anything not uploaded in HD.
 */
function toYoutubeThumbnailUrl(youtubeUrl: string): string | null {
  const youtubeVideoId = extractYoutubeVideoId(youtubeUrl);
  return youtubeVideoId === null ? null : `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`;
}

function computePickState(
  candidateFile: File | null,
  checkOutcome:
    | { file: File; status: "ready"; previewUrl: string }
    | { file: File; status: "rejected"; message: string }
    | null,
): ThumbnailPickState {
  if (candidateFile === null) return { status: "idle" };
  if (checkOutcome?.file === candidateFile && checkOutcome.status === "ready") {
    return { status: "ready", previewUrl: checkOutcome.previewUrl };
  }
  if (checkOutcome?.file === candidateFile && checkOutcome.status === "rejected") {
    return { status: "rejected", message: checkOutcome.message };
  }
  return { status: "checking" };
}

function ThumbnailPreview({
  previewUrl,
  isCustomReady,
}: {
  readonly previewUrl: string | null;
  readonly isCustomReady: boolean;
}) {
  return (
    <div className="flex aspect-video w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary">
      {previewUrl === null ? (
        <div className="flex flex-col items-center gap-1 px-2 text-center">
          <Image
            src="/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={24}
            height={24}
          />
          <p className="text-xs text-muted-foreground">Paste a YouTube link first</p>
        </div>
      ) : (
        <Image
          src={previewUrl}
          alt="Video thumbnail"
          width={160}
          height={90}
          unoptimized={isCustomReady}
          className="size-full object-cover"
        />
      )}
    </div>
  );
}

function ThumbnailFeedback({
  pickState,
  selectedFile,
  currentThumbnailUrl,
  onClearClick,
}: {
  readonly pickState: ThumbnailPickState;
  readonly selectedFile: File | null;
  readonly currentThumbnailUrl?: string | null;
  readonly onClearClick: () => void;
}) {
  if (pickState.status === "checking") {
    return <p className="text-xs text-muted-foreground">Checking that image…</p>;
  }

  if (pickState.status === "rejected") {
    return (
      <p role="alert" className="max-w-72 text-xs text-destructive">
        {pickState.message}
      </p>
    );
  }

  if (pickState.status === "ready" && selectedFile !== null) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">
          Custom thumbnail ready — it uploads when you save.
        </p>
        <button
          type="button"
          onClick={onClearClick}
          className="cursor-pointer text-xs font-medium text-muted-foreground underline hover:text-foreground"
        >
          Clear
        </button>
      </div>
    );
  }

  const idleHelpText =
    currentThumbnailUrl === null || currentThumbnailUrl === undefined
      ? "YouTube's thumbnail is used unless you upload your own. JPEG, PNG, WebP or AVIF, up to 5 MB. Images are centre-cropped to 16:9."
      : "Upload a new image to replace this one. JPEG, PNG, WebP or AVIF, up to 5 MB. Images are centre-cropped to 16:9.";

  return <p className="max-w-72 text-xs text-muted-foreground">{idleHelpText}</p>;
}

export default function ThumbnailPicker({
  youtubeUrl,
  currentThumbnailUrl,
  selectedFile,
  isDisabled = false,
  onFileSelected,
}: {
  /** The pasted link, used to derive YouTube's own thumbnail as the default preview. */
  readonly youtubeUrl: string;
  /** The saved `thumbnailUrl` in edit mode — a custom one if the creator uploaded before. */
  readonly currentThumbnailUrl?: string | null;
  /** The parent's copy: the last file that PASSED, or null. Never a rejected one. */
  readonly selectedFile: File | null;
  readonly isDisabled?: boolean;
  readonly onFileSelected: (file: File | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  const [checkOutcome, setCheckOutcome] = useState<
    | { file: File; status: "ready"; previewUrl: string }
    | { file: File; status: "rejected"; message: string }
    | null
  >(null);

  const onFileSelectedRef = useRef(onFileSelected);
  useEffect(() => {
    onFileSelectedRef.current = onFileSelected;
  }, [onFileSelected]);

  const pickState = computePickState(candidateFile, checkOutcome);

  useEffect(() => {
    if (candidateFile === null) return undefined;

    let isCurrentCandidate = true;
    const objectUrl = URL.createObjectURL(candidateFile);

    const runCheck = async () => {
      const result = await checkThumbnailFile(candidateFile);
      if (!isCurrentCandidate) return;
      if (result.success) {
        setCheckOutcome({ file: candidateFile, status: "ready", previewUrl: objectUrl });
        onFileSelectedRef.current(candidateFile);
        return;
      }
      setCheckOutcome({ file: candidateFile, status: "rejected", message: result.message });
      onFileSelectedRef.current(null);
    };
    void runCheck();

    return () => {
      isCurrentCandidate = false;
      URL.revokeObjectURL(objectUrl);
    };
  }, [candidateFile]);

  const youtubeThumbnailUrl = toYoutubeThumbnailUrl(youtubeUrl);
  const fallbackPreviewUrl = currentThumbnailUrl ?? youtubeThumbnailUrl;
  const previewUrl = pickState.status === "ready" ? pickState.previewUrl : fallbackPreviewUrl;

  function handleClearClick() {
    setCandidateFile(null);
    setCheckOutcome(null);
    onFileSelectedRef.current(null);
    if (fileInputRef.current !== null) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="upload-thumbnail-file" className="text-sm font-medium text-foreground">
        Thumbnail
      </label>

      <div className="flex flex-wrap items-start gap-3">
        <ThumbnailPreview previewUrl={previewUrl} isCustomReady={pickState.status === "ready"} />

        <div className="flex min-w-0 flex-col gap-2">
          <input
            ref={fileInputRef}
            id="upload-thumbnail-file"
            type="file"
            accept={ACCEPTED_THUMBNAIL_TYPES}
            disabled={isDisabled}
            onChange={(event) => {
              setCandidateFile(event.target.files?.[0] ?? null);
              setCheckOutcome(null);
            }}
            className="text-xs text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-border file:bg-transparent file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground"
          />

          <ThumbnailFeedback
            pickState={pickState}
            selectedFile={selectedFile}
            currentThumbnailUrl={currentThumbnailUrl}
            onClearClick={handleClearClick}
          />
        </div>
      </div>
    </div>
  );
}
