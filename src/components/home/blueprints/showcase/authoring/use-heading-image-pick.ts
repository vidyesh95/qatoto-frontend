// TRANSPORT: props-only — browser-side state for one picked image. No network: in Part 1 the image is
// checked and previewed and never sent.
"use client";

import { useEffect, useRef, useState } from "react";

import {
  checkImageFile,
  formatMegabytes,
  type ImageFileCheckFailure,
} from "@/lib/image-file-check";

/**
 * The smallest side a heading image may have. It renders at 64px in the feed and larger on a launch
 * page, and a 64px original (the backend's absolute floor) looks soft on a high-density screen.
 */
export const HEADING_IMAGE_MINIMUM_DIMENSION_PX = 256;

/**
 * How far from square an image may be and still count, as a fraction of its longer side. A 1%
 * tolerance absorbs an export that came out 1024 × 1023; anything further is a photo that the feed's
 * square slot would crop.
 */
const SQUARE_TOLERANCE_RATIO = 0.01;

/**
 * One status at a time, because the check is asynchronous and "checking and already rejected" must
 * not be expressible. `ready` carries everything the picker and the receipt preview need.
 */
export type HeadingImagePickState =
  | { readonly status: "empty" }
  | { readonly status: "checking"; readonly fileName: string }
  | { readonly status: "rejected"; readonly message: string }
  | {
      readonly status: "ready";
      readonly file: File;
      readonly previewUrl: string;
      readonly widthPx: number;
      readonly heightPx: number;
    };

/** The launch form's own wording for each refusal. No em dash, unlike the admin picker's copy. */
function describeHeadingImageCheckFailure(failure: ImageFileCheckFailure): string {
  switch (failure.reason) {
    case "unsupported_type":
      return "That file isn't a JPEG, PNG, WebP or AVIF image.";
    case "file_too_large":
      return `That image is ${formatMegabytes(failure.byteSize)}. The limit is 5 MB.`;
    case "undecodable":
      return "Couldn't read that image. If it came from an iPhone it may be HEIC; export it as JPEG first.";
    case "below_minimum_dimensions":
      return `That image is ${failure.widthPx} × ${failure.heightPx}. A heading image needs at least ${failure.minimumDimensionPx} pixels on each side.`;
    case "above_maximum_dimensions":
      return `That image is ${failure.widthPx} × ${failure.heightPx}. Neither side may be larger than ${failure.maximumDimensionPx} pixels.`;
    default: {
      const exhaustiveCheck: never = failure;
      return exhaustiveCheck;
    }
  }
}

/**
 * The heading image a maker picked, checked and previewed.
 *
 * ⚠️ OWNED BY THE COMPOSER, NOT BY THE PICKER, and that placement is load-bearing. The composer stays
 * mounted across editing and the receipt, so the receipt's row preview can keep showing the image.
 * A picker that owned the object URL would revoke it the moment it unmounted, and the receipt would
 * show a broken image.
 *
 * ⚠️ A STALE CHECK IS DROPPED. Pick A, then pick B before A finishes decoding, and A's verdict must
 * not land on top of B's; the attempt counter is what tells them apart.
 */
export function useHeadingImagePick() {
  const [pickState, setPickState] = useState<HeadingImagePickState>({ status: "empty" });
  const latestAttemptNumberRef = useRef(0);
  const previewUrlRef = useRef<string | null>(null);

  function releasePreviewUrl(): void {
    if (previewUrlRef.current !== null) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  // Frees the last preview when the form goes away entirely.
  useEffect(
    () => () => {
      if (previewUrlRef.current !== null) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  async function pickFile(file: File): Promise<void> {
    latestAttemptNumberRef.current += 1;
    const attemptNumber = latestAttemptNumberRef.current;
    releasePreviewUrl();
    setPickState({ status: "checking", fileName: file.name });

    const checkResult = await checkImageFile(file, {
      minimumDimensionPx: HEADING_IMAGE_MINIMUM_DIMENSION_PX,
    });
    if (attemptNumber !== latestAttemptNumberRef.current) return;

    if (!checkResult.success) {
      setPickState({
        status: "rejected",
        message: describeHeadingImageCheckFailure(checkResult.failure),
      });
      return;
    }

    const { widthPx, heightPx } = checkResult;
    if (Math.abs(widthPx - heightPx) > SQUARE_TOLERANCE_RATIO * Math.max(widthPx, heightPx)) {
      setPickState({
        status: "rejected",
        message: `That image is ${widthPx} × ${heightPx}. A heading image has to be square, the same width and height.`,
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setPickState({ status: "ready", file, previewUrl, widthPx, heightPx });
  }

  function clearPick(): void {
    latestAttemptNumberRef.current += 1;
    releasePreviewUrl();
    setPickState({ status: "empty" });
  }

  return { pickState, pickFile, clearPick } as const;
}
