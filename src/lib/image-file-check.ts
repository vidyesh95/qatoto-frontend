// TRANSPORT: props-only — a pure, browser-side check of a `File`. No network.
//
// HOISTED OUT OF `src/components/admin/shared/admin-image-picker.tsx` when a second surface (the
// showcase heading image) needed the same checks. The admin picker still owns its own copy: this
// module returns a REASON, not a sentence, so each picker words its own messages. The admin wording
// stayed byte-for-byte what it was; the launch form's wording has no em dash, which PRODUCT.md bans
// in product copy and the admin sentence carried.
//
// NOT A TRUST BOUNDARY. The Express backend re-validates format, size and dimensions and is the only
// authority; this exists so a 5 MB upload is not how somebody discovers their image is 40 pixels
// tall.

/**
 * What the OS file picker may offer, mirroring ALLOWED_INPUT_FORMATS in the backend's
 * `src/lib/image.ts`. Without it the picker offers files the server will refuse.
 *
 * `image/heic` IS DELIBERATELY ABSENT. The server cannot decode HEVC-coded HEIC (libheif is built
 * with the AV1 decoder only), and on iOS an accept list with no HEIC entry makes Safari hand over a
 * transcoded JPEG instead. Omitting it is the fix, not an oversight.
 */
export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/**
 * The `accept` attribute value: the MIME types above plus their extensions.
 *
 * SEPARATE FROM THE ARRAY ON PURPOSE. `accept` is a hint the OS dialog may ignore and a dragged
 * file never consults at all, so the extensions belong here while the JS check belongs to the MIME
 * array: one is a filter, the other is the actual gate. Both are listed because macOS Finder greys
 * files out when only MIME types are given.
 */
export const ACCEPTED_IMAGE_INPUT_ACCEPT = [
  ...ACCEPTED_IMAGE_MIME_TYPES,
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
].join(",");

/** `limits.fileSize` in the backend's image upload middlewares. */
export const MAXIMUM_IMAGE_BYTES = 5 * 1024 * 1024;

/** MIN_DIMENSION_PX / MAX_DIMENSION_PX in the backend's `src/lib/image.ts`. */
export const DEFAULT_MINIMUM_IMAGE_DIMENSION_PX = 64;
export const MAXIMUM_IMAGE_DIMENSION_PX = 8192;

/** Why a file was refused, with the measured numbers each reason's message needs. */
export type ImageFileCheckFailure =
  | { readonly reason: "unsupported_type" }
  | { readonly reason: "file_too_large"; readonly byteSize: number }
  | { readonly reason: "undecodable" }
  | {
      readonly reason: "below_minimum_dimensions";
      readonly widthPx: number;
      readonly heightPx: number;
      readonly minimumDimensionPx: number;
    }
  | {
      readonly reason: "above_maximum_dimensions";
      readonly widthPx: number;
      readonly heightPx: number;
      readonly maximumDimensionPx: number;
    };

/** Failure is a value, not an exception: the caller branches on `success`. */
export type ImageFileCheckResult =
  | { readonly success: true; readonly widthPx: number; readonly heightPx: number }
  | { readonly success: false; readonly failure: ImageFileCheckFailure };

export function formatMegabytes(byteCount: number): string {
  return `${(byteCount / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Everything the server checks about the bytes, checked here first.
 *
 * ORDER IS CHEAPEST-FIRST: a string compare, then a number compare, then a decode. The decode is
 * last because it is the only step that costs real work.
 */
export async function checkImageFile(
  file: File,
  options: { readonly minimumDimensionPx?: number } = {},
): Promise<ImageFileCheckResult> {
  const minimumDimensionPx = options.minimumDimensionPx ?? DEFAULT_MINIMUM_IMAGE_DIMENSION_PX;

  const isAcceptedMimeType = ACCEPTED_IMAGE_MIME_TYPES.some((mimeType) => mimeType === file.type);
  if (!isAcceptedMimeType) {
    return { success: false, failure: { reason: "unsupported_type" } };
  }

  if (file.size > MAXIMUM_IMAGE_BYTES) {
    return { success: false, failure: { reason: "file_too_large", byteSize: file.size } };
  }

  /**
   * THE DECODE IS THE HEIC CATCH. An iPhone photo renamed to `.jpg` passes the MIME check on some
   * platforms and then fails server-side with an unhelpful format error; here the browser simply
   * cannot decode it, and the person gets told what to do about it.
   */
  let decodedBitmap: ImageBitmap;
  try {
    decodedBitmap = await createImageBitmap(file);
  } catch {
    return { success: false, failure: { reason: "undecodable" } };
  }

  const widthPx = decodedBitmap.width;
  const heightPx = decodedBitmap.height;
  // Frees the decoded pixels immediately rather than waiting for GC: an 8192² bitmap is ~268 MB of
  // RGBA.
  decodedBitmap.close();

  if (widthPx < minimumDimensionPx || heightPx < minimumDimensionPx) {
    return {
      success: false,
      failure: { reason: "below_minimum_dimensions", widthPx, heightPx, minimumDimensionPx },
    };
  }

  if (widthPx > MAXIMUM_IMAGE_DIMENSION_PX || heightPx > MAXIMUM_IMAGE_DIMENSION_PX) {
    return {
      success: false,
      failure: {
        reason: "above_maximum_dimensions",
        widthPx,
        heightPx,
        maximumDimensionPx: MAXIMUM_IMAGE_DIMENSION_PX,
      },
    };
  }

  return { success: true, widthPx, heightPx };
}
