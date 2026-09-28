// TRANSPORT: props-only — presentational. Fetches nothing; renders the photos a parent read.
import Image from "next/image";

import type { ProblemReportPhoto } from "@/lib/rnd/discovery.schemas";

const ROW_HEIGHT_CLASS = { compact: "h-16", regular: "h-32" } as const;
const ROW_SIZES_ATTRIBUTE = { compact: "128px", regular: "384px" } as const;

/**
 * A wrapping row of reporter photos, each at its OWN aspect ratio.
 *
 * NO CROP. Every photo is drawn at a fixed height and the width its recorded size implies, so a
 * portrait shot of a broken pipe is not cut down to a square that loses the pipe. The size is the
 * server's measurement of the stored file, which is also what lets the box be reserved before the
 * file arrives, with the blur placeholder painted inside it.
 *
 * Each photo opens full size in a new tab. The address is Cloudinary's delivery host, which the
 * read schema pins, so the link sends a reader nowhere the page was not already loading from.
 *
 * EMPTY RENDERS NOTHING: a report or cluster without photos is the ordinary case, not a gap.
 */
export default function ProblemReportPhotoRow({
  photos,
  size,
  altText,
}: {
  readonly photos: readonly ProblemReportPhoto[];
  readonly size: keyof typeof ROW_HEIGHT_CLASS;
  readonly altText: string;
}) {
  if (photos.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {photos.map((photo) => (
        <li key={photo.photoId}>
          <a
            href={photo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-xl border border-outline-variant"
          >
            <Image
              src={photo.url}
              alt={altText}
              width={photo.widthPx}
              height={photo.heightPx}
              placeholder="blur"
              blurDataURL={photo.blurDataUrl}
              sizes={ROW_SIZES_ATTRIBUTE[size]}
              className={`${ROW_HEIGHT_CLASS[size]} w-auto max-w-full`}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
