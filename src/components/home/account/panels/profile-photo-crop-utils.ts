import type { Area } from "react-easy-crop";

/** Client-side guard rails — fast UX feedback only; the backend re-validates. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Best-effort read of the backend's error message. */
export function readUploadErrorMessage(payload: unknown): string {
  const fallback = "Couldn't save your photo. Please try again.";
  if (typeof payload !== "object" || payload === null) return fallback;
  const body = payload as { message?: string };
  return body.message ?? fallback;
}

/** Load an object-URL into an HTMLImageElement so we can draw it to a canvas. */
function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Could not load image")));
    image.src = source;
  });
}

/** Bounding box of an image after rotating it `rotationDegrees`. */
function rotatedBoundingBox(width: number, height: number, rotationDegrees: number) {
  const rotationRadians = (rotationDegrees * Math.PI) / 180;
  return {
    width:
      Math.abs(Math.cos(rotationRadians) * width) + Math.abs(Math.sin(rotationRadians) * height),
    height:
      Math.abs(Math.sin(rotationRadians) * width) + Math.abs(Math.cos(rotationRadians) * height),
  };
}

/**
 * Crop `imageSource` to `cropArea` (pixel coords from react-easy-crop), applying
 * `rotationDegrees`, and re-encode as WebP. The backend still re-validates and
 * re-encodes — this is only so the user uploads what they actually framed.
 */
export async function getCroppedWebpBlob(
  imageSource: string,
  cropArea: Area,
  rotationDegrees: number,
): Promise<Blob | null> {
  const image = await loadImageElement(imageSource);
  const context = document.createElement("canvas").getContext("2d");
  if (context === null) return null;
  const canvas = context.canvas;

  const boundingBox = rotatedBoundingBox(image.width, image.height, rotationDegrees);
  canvas.width = boundingBox.width;
  canvas.height = boundingBox.height;
  context.translate(boundingBox.width / 2, boundingBox.height / 2);
  context.rotate((rotationDegrees * Math.PI) / 180);
  context.drawImage(image, -image.width / 2, -image.height / 2);

  const croppedPixels = context.getImageData(
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
  );
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;
  context.putImageData(croppedPixels, 0, 0);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
}
