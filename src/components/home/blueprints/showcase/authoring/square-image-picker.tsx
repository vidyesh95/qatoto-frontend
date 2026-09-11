// TRANSPORT: props-only — renders a pick state it is handed and reports files up. No network.
"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import {
  HEADING_IMAGE_MINIMUM_DIMENSION_PX,
  type HeadingImagePickState,
} from "@/components/home/blueprints/showcase/authoring/use-heading-image-pick";
import { ACCEPTED_IMAGE_INPUT_ACCEPT, formatMegabytes } from "@/lib/image-file-check";

const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * A picked file's size for the status line. Under a megabyte it reads in KB, because
 * `formatMegabytes` rounds a small, well-compressed square to "0.0 MB", which reads as an empty file.
 */
function formatFileSizeLabel(byteSize: number): string {
  if (byteSize >= BYTES_PER_MEGABYTE) return formatMegabytes(byteSize);
  return `${String(Math.max(1, Math.round(byteSize / 1024)))} KB`;
}

/**
 * The square heading image slot: a drop zone until an image passes, then the image itself.
 *
 * PROPS-ONLY. The state and the object URL live in `useHeadingImagePick`, owned by the composer, for
 * the reason that hook gives. This file draws the slot and hands up files.
 *
 * ⚠️ THE HINT LISTS REQUIREMENTS ONLY. It does not say the image is not uploaded: that is said once,
 * on the receipt, and a second copy here would be the repeated warning nobody finishes reading.
 *
 * THE SLOT IS SQUARE BECAUSE THE IMAGE IS, and `object-cover` matches the feed row's own square media
 * slot, so what the maker sees here is how the feed will crop it.
 */
export default function SquareImagePicker({
  inputId,
  pickState,
  onFilePicked,
  onRemove,
}: {
  /** Unique on the page; the section heading's label points at it. */
  readonly inputId: string;
  readonly pickState: HeadingImagePickState;
  readonly onFilePicked: (file: File) => void;
  readonly onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  function handleIncomingFiles(incomingFiles: FileList | null): void {
    // ONE FILE. A multi-file drop that quietly kept the first would be a coin flip over which image
    // heads the launch.
    const firstFile = incomingFiles?.[0];
    if (firstFile !== undefined) onFilePicked(firstFile);
  }

  function handleDrop(dropEvent: React.DragEvent<HTMLDivElement>): void {
    dropEvent.preventDefault();
    setIsDraggingOver(false);
    handleIncomingFiles(dropEvent.dataTransfer.files);
  }

  function handleDragLeave(dragEvent: React.DragEvent<HTMLDivElement>): void {
    // Ignore leave events fired while crossing child elements, or the highlight flickers.
    const dragLeaveTarget = dragEvent.relatedTarget;
    if (dragLeaveTarget instanceof Node && dragEvent.currentTarget.contains(dragLeaveTarget))
      return;
    setIsDraggingOver(false);
  }

  const isReady = pickState.status === "ready";

  return (
    <div>
      {/* Hidden but real: it carries `accept`, the button clicks it, and it clears after each pick so
          choosing the same file again (after fixing it on disk) still fires. */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
        className="hidden"
        onChange={(changeEvent) => {
          handleIncomingFiles(changeEvent.target.files);
          changeEvent.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-start gap-4">
        <div
          onDrop={handleDrop}
          onDragOver={(dragOverEvent) => {
            dragOverEvent.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={handleDragLeave}
          className={`relative grid size-32 shrink-0 place-items-center overflow-hidden rounded-xl border transition-colors ${
            isReady
              ? "border-border bg-muted"
              : isDraggingOver
                ? "border-dashed border-[#00696E] bg-muted/60"
                : "border-dashed border-[#CAC4D0] bg-card"
          }`}
        >
          {pickState.status === "ready" ? (
            <Image
              src={pickState.previewUrl}
              alt="Your heading image"
              fill
              sizes="128px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <span className="flex flex-col items-center gap-1 px-2 text-center">
              <Image
                src="/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={28}
                height={28}
                className="opacity-60"
              />
              <span className="text-xs text-muted-foreground">
                {isDraggingOver ? "Drop it here" : "Drop a square image"}
              </span>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {renderStatusLine()}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-[#00696E]/40 px-4 py-2 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
            >
              {isReady ? "Choose another" : "Choose image"}
            </button>
            {isReady ? (
              <button
                type="button"
                onClick={onRemove}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Square, at least {HEADING_IMAGE_MINIMUM_DIMENSION_PX} × {HEADING_IMAGE_MINIMUM_DIMENSION_PX}{" "}
        pixels. JPEG, PNG, WebP or AVIF, up to 5 MB. It sits beside your launch&apos;s name in the
        feed.
      </p>
    </div>
  );

  function renderStatusLine() {
    switch (pickState.status) {
      case "empty":
        return <p className="text-sm text-muted-foreground">No image chosen yet.</p>;
      case "checking":
        return <p className="text-sm text-muted-foreground">Checking {pickState.fileName}…</p>;
      case "rejected":
        return (
          <p role="alert" className="text-sm text-destructive">
            {pickState.message}
          </p>
        );
      case "ready":
        return (
          <p className="text-sm text-foreground">
            <span className="block truncate">{pickState.file.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {pickState.widthPx} × {pickState.heightPx} ·{" "}
              {formatFileSizeLabel(pickState.file.size)}
            </span>
          </p>
        );
      default: {
        const exhaustiveCheck: never = pickState;
        return exhaustiveCheck;
      }
    }
  }
}
