// TRANSPORT: props-only — this component fetches nothing and mutates nothing. It hands a
// validated `File` up to its parent, which owns the mutation.
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * What the OS file picker may offer, mirroring ALLOWED_INPUT_FORMATS in the backend's
 * `src/lib/image.ts`. Without it the picker offers files the server will refuse, and the
 * admin only finds out after an upload round trip.
 *
 * BOTH MIME TYPES AND EXTENSIONS: some pickers filter on UTI/extension rather than MIME, and
 * macOS Finder in particular greys files out when only MIME types are listed.
 *
 * `image/heic` IS DELIBERATELY ABSENT. The server cannot decode HEVC-coded HEIC — libheif is
 * built with the AV1 decoder only — and on iOS an accept list with no HEIC entry makes Safari
 * hand over a transcoded JPEG instead. Omitting it is the fix, not an oversight.
 */
const ACCEPTED_SLIDE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/**
 * The `accept` attribute value: the MIME types above plus their extensions.
 *
 * SEPARATE FROM THE ARRAY ON PURPOSE. `accept` is a hint the OS dialog may ignore and a
 * dragged file never consults at all, so the extensions belong here while the JS check
 * belongs to the MIME array — one is a filter, the other is the actual gate.
 */
const ACCEPTED_SLIDE_IMAGE_TYPES = [
  ...ACCEPTED_SLIDE_IMAGE_MIME_TYPES,
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
].join(",");

/** `limits.fileSize` in the backend's `upload-promotional-slide-image` middleware. */
const MAX_SLIDE_IMAGE_BYTES = 5 * 1024 * 1024;

/** MIN_DIMENSION_PX / MAX_DIMENSION_PX in the backend's `src/lib/image.ts`. */
const MIN_SLIDE_DIMENSION_PX = 64;
const MAX_SLIDE_DIMENSION_PX = 8192;

/** The drag-active accent already used by the studio listing dropzone. */
const DRAG_ACTIVE_BORDER_CLASS = "border-[#1DBDC5] bg-muted/40";

/**
 * The picker's own state, as a union rather than a bag of flags.
 *
 * Validation is ASYNCHRONOUS — reading real pixel dimensions means decoding the file — so a
 * `isChecking` boolean beside an `error?` string would permit "checking and already rejected"
 * at once. There is exactly one status at a time and the render switch is exhaustive.
 */
type SlideImagePickState =
  | { status: "empty" }
  | { status: "checking"; previewUrl: string }
  | { status: "rejected"; message: string }
  | { status: "ready"; previewUrl: string; widthPx: number; heightPx: number };

/** Failure is a value, not an exception — the caller branches on `success`. */
type SlideImageCheckResult =
  | { success: true; widthPx: number; heightPx: number }
  | { success: false; message: string };

function formatMegabytes(byteCount: number): string {
  return `${(byteCount / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Everything the server checks about the bytes, checked here first.
 *
 * NOT A TRUST BOUNDARY. The Express backend re-validates format, size and dimensions and is
 * the only authority; this exists so a 5 MB upload is not the way an admin discovers their
 * screenshot is 40 pixels tall.
 *
 * ORDER IS CHEAPEST-FIRST: a string compare, then a number compare, then a decode. The decode
 * is last because it is the only step that costs real work.
 */
async function checkSlideImageFile(file: File): Promise<SlideImageCheckResult> {
  const isAcceptedMimeType = (ACCEPTED_SLIDE_IMAGE_MIME_TYPES as readonly string[]).includes(
    file.type,
  );
  if (!isAcceptedMimeType) {
    return {
      success: false,
      message: "That file isn't a JPEG, PNG, WebP or AVIF image.",
    };
  }

  if (file.size > MAX_SLIDE_IMAGE_BYTES) {
    return {
      success: false,
      message: `That image is ${formatMegabytes(file.size)}. The limit is 5 MB.`,
    };
  }

  /**
   * THE DECODE IS THE HEIC CATCH. An iPhone photo renamed to `.jpg` passes the MIME check on
   * some platforms and then fails server-side with an unhelpful format error; here the
   * browser simply cannot decode it, and the admin gets told what to do about it.
   */
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
  // Frees the decoded pixels immediately rather than waiting for GC — an 8192² bitmap is
  // ~268 MB of RGBA.
  decodedBitmap.close();

  if (widthPx < MIN_SLIDE_DIMENSION_PX || heightPx < MIN_SLIDE_DIMENSION_PX) {
    return {
      success: false,
      message: `That image is ${String(widthPx)} × ${String(heightPx)}. Both sides must be at least ${String(MIN_SLIDE_DIMENSION_PX)} pixels.`,
    };
  }

  if (widthPx > MAX_SLIDE_DIMENSION_PX || heightPx > MAX_SLIDE_DIMENSION_PX) {
    return {
      success: false,
      message: `That image is ${String(widthPx)} × ${String(heightPx)}. Neither side may exceed ${String(MAX_SLIDE_DIMENSION_PX)} pixels.`,
    };
  }

  return { success: true, widthPx, heightPx };
}

/**
 * Pick a slide image by drop, by button or by keyboard, and see it before it is sent.
 *
 * THE PARENT IS HANDED ONLY FILES THAT PASSED. It owns the submit — the create form sends the
 * file with the rest of a new slide, a row sends it on its own — so a rejected file simply
 * never reaches it, and the picker keeps the candidate and the verdict to itself.
 *
 * THE PREVIEW LETTERBOXES (`object-contain` on a filled box) because that is what the home
 * carousel does. A preview that cropped to fill would show framing the visitor never gets,
 * which is worse than no preview — it would be confidently wrong.
 */
export function SlideImagePicker({
  inputId,
  isDisabled,
  selectedFile,
  onFileSelected,
}: {
  /** Must be unique per instance — one lives in the create form, one per slide row. */
  inputId: string;
  isDisabled: boolean;
  /** The parent's copy: the last file that PASSED, or null. Never a rejected one. */
  selectedFile: File | null;
  onFileSelected: (file: File | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  /** What the admin last chose, verdict not yet known. The parent never sees this one. */
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  const [pickState, setPickState] = useState<SlideImagePickState>({ status: "empty" });

  /**
   * The parent is told about a file only once it PASSES, and this split is load-bearing.
   *
   * The obvious arrangement — parent holds every pick, picker reports a verdict — cannot
   * express a rejection: clearing the parent's file to keep it out of the submit feeds a
   * `null` straight back down, which resets the picker and wipes the message explaining
   * why. Holding the candidate here means "rejected" is a state the picker can actually
   * stay in, and the parent's existing `disabled={!imageFile}` gate keeps the bad file out
   * of the request without any extra guard.
   */
  const onFileSelectedRef = useRef(onFileSelected);
  useEffect(() => {
    onFileSelectedRef.current = onFileSelected;
  }, [onFileSelected]);

  /**
   * What we last handed the parent, so "the parent cleared it" is distinguishable from "we
   * cleared it ourselves a moment ago". Comparing against `pickState` instead would read a
   * status one render stale and cancel the pick that caused the clear.
   */
  const reportedFileRef = useRef<File | null>(null);

  function reportFileToParent(file: File | null) {
    reportedFileRef.current = file;
    onFileSelectedRef.current(file);
  }

  /**
   * The object URL lives and dies with the candidate, and the check runs in the same effect.
   *
   * `isStale` guards the async gap: pick A, pick B before A finishes decoding, and A's
   * verdict must not land on top of B's.
   */
  useEffect(() => {
    if (candidateFile === null) {
      setPickState({ status: "empty" });
      return undefined;
    }

    const previewUrl = URL.createObjectURL(candidateFile);
    setPickState({ status: "checking", previewUrl });

    let isStale = false;
    async function runCheck(file: File) {
      const checkResult = await checkSlideImageFile(file);
      if (isStale) return;
      if (checkResult.success) {
        setPickState({
          status: "ready",
          previewUrl,
          widthPx: checkResult.widthPx,
          heightPx: checkResult.heightPx,
        });
        reportFileToParent(file);
      } else {
        setPickState({ status: "rejected", message: checkResult.message });
      }
    }
    void runCheck(candidateFile);

    return () => {
      isStale = true;
      URL.revokeObjectURL(previewUrl);
    };
  }, [candidateFile]);

  /**
   * The parent clearing its file — after a successful submit — clears the preview too.
   *
   * The `reportedFileRef` comparison is what makes this safe: it fires only when the parent
   * dropped a file we had reported as good, never on the null we ourselves just sent while
   * starting a new check.
   */
  useEffect(() => {
    if (selectedFile === null && reportedFileRef.current !== null) {
      reportedFileRef.current = null;
      setCandidateFile(null);
    }
  }, [selectedFile]);

  function handleIncomingFile(incomingFiles: FileList | null) {
    // ONE FILE. The backend's multer config sets `files: 1`; a multi-file drop that silently
    // uploaded the first one would be a coin flip over which slide the admin gets.
    const firstFile = incomingFiles?.[0] ?? null;
    setCandidateFile(firstFile);
    // A new pick invalidates whatever the parent was holding until this one passes.
    reportFileToParent(null);
  }

  function handleRemoveClick() {
    setCandidateFile(null);
    reportFileToParent(null);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    if (isDisabled) return;
    handleIncomingFile(event.dataTransfer.files);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (isDisabled) return;
    setIsDraggingOver(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    // Ignore drag-leave events fired when moving over child elements — without this the
    // highlight flickers off the moment the cursor crosses the icon or the button.
    const dragLeaveTarget = event.relatedTarget;
    if (dragLeaveTarget instanceof Node && event.currentTarget.contains(dragLeaveTarget)) return;
    setIsDraggingOver(false);
  }

  return (
    <div className="space-y-2">
      {/* The input is hidden but real: it carries `accept`, it is what the button clicks, and
          it is what a screen reader lands on via the label. */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_SLIDE_IMAGE_TYPES}
        disabled={isDisabled}
        className="hidden"
        onChange={(event) => {
          handleIncomingFile(event.target.files);
          // Re-picking the SAME file fires no `change` event unless the value is cleared —
          // which is exactly what an admin does after fixing the file on disk.
          event.target.value = "";
        }}
      />

      {renderPickState()}

      <p className="text-xs text-muted-foreground">
        JPEG, PNG, WebP or AVIF, up to 5 MB and at least 64 pixels on each side. Re-encoded
        server-side. iPhone photos saved as HEIC aren&apos;t supported — set Settings → Camera →
        Formats → Most Compatible, or export as JPEG.
      </p>
    </div>
  );

  function renderPickState() {
    switch (pickState.status) {
      case "empty":
        return renderDropZone();
      case "rejected":
        return (
          <div className="space-y-2">
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {pickState.message}
            </p>
            {/* The zone stays put so the next attempt is one action away. */}
            {renderDropZone()}
          </div>
        );
      case "checking":
        return renderPreview(pickState.previewUrl, null);
      case "ready":
        return renderPreview(pickState.previewUrl, {
          widthPx: pickState.widthPx,
          heightPx: pickState.heightPx,
        });
      default: {
        const exhaustiveCheck: never = pickState;
        return exhaustiveCheck;
      }
    }
  }

  function renderDropZone() {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 transition-colors ${
          isDraggingOver ? DRAG_ACTIVE_BORDER_CLASS : "border-[#CAC4D0]/60"
        } ${isDisabled ? "opacity-50" : ""}`}
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Image
            src="/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={40}
            height={40}
          />
        </span>
        <p className="text-sm font-medium">
          {isDraggingOver ? "Drop the image here" : "Drag an image here"}
        </p>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Choose image
        </button>
      </div>
    );
  }

  /** `measured === null` means the decode is still running. */
  function renderPreview(
    previewUrl: string,
    measured: { widthPx: number; heightPx: number } | null,
  ) {
    return (
      <div className="space-y-2">
        <div className="aspect-video w-full max-w-md overflow-hidden rounded-xl border border-[#CAC4D0]/60 bg-muted">
          {/* A plain <img>: `next/image` routes through the optimizer, which cannot fetch a
              blob: URL. Same reason the studio listing previews use one. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="size-full object-contain" />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="max-w-60 truncate">{candidateFile?.name}</span>
          {measured === null ? (
            <span>Checking…</span>
          ) : (
            // The dimensions are the point: undersized art is the failure an admin cannot
            // see by eye in a scaled-down preview.
            <span>
              {String(measured.widthPx)} × {String(measured.heightPx)}
              {candidateFile ? ` · ${formatMegabytes(candidateFile.size)}` : ""}
            </span>
          )}
          <button
            type="button"
            disabled={isDisabled}
            onClick={handleRemoveClick}
            className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }
}
