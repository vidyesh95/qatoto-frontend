// TRANSPORT: client-query — "use client" island. Writes POST /discovery/problem-reports/photos
// once per picked file. The tiles live in the parent sheet, which sends the uploaded ids with the
// report and clears them when it closes.
"use client";

import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";

import { LABEL_CLASS } from "@/components/ui/field-classes";
import { useUploadProblemReportPhotoMutation } from "@/hooks/rnd/discovery";
import { ApiRequestError } from "@/lib/http";
import {
  ACCEPTED_IMAGE_INPUT_ACCEPT,
  checkImageFile,
  formatMegabytes,
  type ImageFileCheckFailure,
} from "@/lib/image-file-check";
import type { ProblemReportPhoto } from "@/lib/rnd/discovery.schemas";

/** Photos one report may carry. The server's `MAX_PROBLEM_REPORT_PHOTOS` is the same number. */
export const MAXIMUM_PROBLEM_REPORT_PHOTOS = 3;

/**
 * One picked photo, from the moment it is chosen.
 *
 * A UNION, NOT A BAG OF FLAGS (CLAUDE.md Pattern 1): a tile is uploading, stored, or refused, and
 * only a stored tile has a photo id to send. A refused tile stays on screen with its reason until
 * the reporter removes it, so a failed upload is never silently missing from the report.
 */
export type ProblemPhotoTile =
  | { readonly status: "uploading"; readonly tileId: string; readonly fileName: string }
  | { readonly status: "uploaded"; readonly tileId: string; readonly photo: ProblemReportPhoto }
  | { readonly status: "failed"; readonly tileId: string; readonly message: string };

function describePhotoCheckFailure(failure: ImageFileCheckFailure): string {
  switch (failure.reason) {
    case "unsupported_type":
      return "That file isn't a JPEG, PNG, WebP or AVIF photo.";
    case "file_too_large":
      return `That photo is ${formatMegabytes(failure.byteSize)}. The limit is 5 MB.`;
    case "undecodable":
      return "Couldn't read that photo. If it came from an iPhone it may be HEIC; export it as JPEG first.";
    case "below_minimum_dimensions":
      return `That photo is ${failure.widthPx} × ${failure.heightPx}. It needs at least ${failure.minimumDimensionPx} pixels on each side.`;
    case "above_maximum_dimensions":
      return `That photo is ${failure.widthPx} × ${failure.heightPx}. Neither side may be larger than ${failure.maximumDimensionPx} pixels.`;
    default: {
      const exhaustiveCheck: never = failure;
      return exhaustiveCheck;
    }
  }
}

/**
 * Up to three photos of the problem, each uploaded the moment it is picked.
 *
 * ⚠️ **THE ADVISORY IS PART OF THE CONTROL, NOT A FOOTNOTE** (`docs/GEOLOCATION_PRIVACY.md` §4).
 * These photos are public on the cluster page. The server strips the location data a phone writes
 * into the file, but nothing reviews or blurs the picture itself, so the reporter is told that in
 * plain words before they choose a file rather than after it is published.
 *
 * The browser check is courtesy (`image-file-check.ts`); the server decodes and re-checks every
 * byte and is the only authority.
 */
export default function ProblemPhotoPicker({
  tiles,
  onTilesChange,
}: {
  readonly tiles: readonly ProblemPhotoTile[];
  readonly onTilesChange: Dispatch<SetStateAction<ProblemPhotoTile[]>>;
}) {
  const uploadMutation = useUploadProblemReportPhotoMutation();
  const remainingSlotCount = MAXIMUM_PROBLEM_REPORT_PHOTOS - tiles.length;

  function replaceTile(tileId: string, nextTile: ProblemPhotoTile): void {
    // A tile removed while its upload was in flight is simply not found here, and stays removed.
    // Its stored photo is unclaimed and the server's daily sweep deletes it.
    onTilesChange((currentTiles) =>
      currentTiles.map((tile) => (tile.tileId === tileId ? nextTile : tile)),
    );
  }

  async function uploadPickedFile(pickedFile: File): Promise<void> {
    const tileId = crypto.randomUUID();
    onTilesChange((currentTiles) => [
      ...currentTiles,
      { status: "uploading", tileId, fileName: pickedFile.name },
    ]);

    const fileCheck = await checkImageFile(pickedFile);
    if (!fileCheck.success) {
      replaceTile(tileId, {
        status: "failed",
        tileId,
        message: describePhotoCheckFailure(fileCheck.failure),
      });
      return;
    }

    try {
      const uploadedPhoto = await uploadMutation.mutateAsync(pickedFile);
      replaceTile(tileId, { status: "uploaded", tileId, photo: uploadedPhoto });
    } catch (uploadError) {
      replaceTile(tileId, {
        status: "failed",
        tileId,
        message:
          uploadError instanceof ApiRequestError
            ? uploadError.apiError.message
            : "Couldn't upload that photo. Try again.",
      });
    }
  }

  function handleFileInputChange(pickedFiles: FileList | null): void {
    if (pickedFiles === null) return;
    // Extra files beyond the free slots are dropped rather than refused one by one: the button
    // already says how many are left, and three error tiles would push the form off the sheet.
    for (const pickedFile of Array.from(pickedFiles).slice(0, remainingSlotCount)) {
      void uploadPickedFile(pickedFile);
    }
  }

  function handleRemoveTileClick(tileId: string): void {
    onTilesChange((currentTiles) => currentTiles.filter((tile) => tile.tileId !== tileId));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={LABEL_CLASS}>Photos (optional)</span>
      <p className="text-xs text-muted-foreground">
        Photos are public on the problem map. Keep out faces, number plates, house numbers and
        documents. We remove location data from the file, but nobody reviews or blurs what is in the
        picture: you are responsible for it.
      </p>

      {tiles.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {tiles.map((tile) => (
            <li key={tile.tileId} className="flex flex-col gap-1">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-muted">
                {renderTileBody(tile)}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveTileClick(tile.tileId)}
                className="min-h-11 cursor-pointer text-xs font-medium text-primary-imprint"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {remainingSlotCount > 0 && (
        <label className="w-fit cursor-pointer rounded-full border border-outline-variant px-4 py-2 text-sm font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
          {tiles.length === 0 ? "Add a photo" : `Add another (${remainingSlotCount} left)`}
          <input
            type="file"
            accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
            multiple
            className="sr-only"
            onChange={(changeEvent) => {
              handleFileInputChange(changeEvent.target.files);
              // Cleared so picking the same file again after removing it fires `change`.
              changeEvent.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

function renderTileBody(tile: ProblemPhotoTile) {
  switch (tile.status) {
    case "uploading":
      return (
        <span className="px-2 text-center text-xs text-muted-foreground">
          Uploading {tile.fileName}…
        </span>
      );
    case "uploaded":
      return (
        <Image
          src={tile.photo.url}
          alt="Your photo of the problem"
          width={tile.photo.widthPx}
          height={tile.photo.heightPx}
          placeholder="blur"
          blurDataURL={tile.photo.blurDataUrl}
          sizes="128px"
          className="h-full w-full object-cover"
        />
      );
    case "failed":
      return (
        <span role="alert" className="px-2 text-center text-xs text-destructive">
          {tile.message}
        </span>
      );
    default: {
      const exhaustiveCheck: never = tile;
      return exhaustiveCheck;
    }
  }
}
