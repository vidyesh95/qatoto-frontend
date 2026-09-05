// TRANSPORT: props-only — the teardown arrives from `teardowns-index-page`, which reads
// `@/lib/blueprints/api`. This component fetches nothing.

import Link from "next/link";

import BlueprintCardBody from "@/components/home/blueprints/cards/blueprint-card-body";
import { buildBlueprintHref, type TeardownBlueprint } from "@/lib/blueprints/schemas";

/** The play triangle. Inline rather than an asset — `public/icons` has no play glyph. */
function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3 fill-current">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

const MEDIA_BADGE_CLASS =
  "flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white";

/**
 * One teardown in the index grid.
 *
 * IT SHOWS TWO THINGS THE RAIL CARD CANNOT: whether there is a walkthrough video, and how many
 * documents were published. On this surface that is the difference between a teardown worth
 * opening and a summary — most teardowns publish neither, so the absence is the common case and
 * the badge is the signal. Both render nothing when there is nothing, rather than a "0 files"
 * badge, which would be an answer to a question nobody asked.
 */
export default function TeardownGridCard({ teardown }: { teardown: TeardownBlueprint }) {
  const documentCount = teardown.documents.length;

  return (
    <Link href={buildBlueprintHref(teardown)} className="group/card block">
      <BlueprintCardBody
        blueprint={teardown}
        imageSizes="(min-width: 1280px) 300px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
        badge={
          teardown.walkthroughVideo === null && documentCount === 0 ? undefined : (
            <>
              {teardown.walkthroughVideo === null ? null : (
                <span className={MEDIA_BADGE_CLASS}>
                  <PlayGlyph />
                  Video
                </span>
              )}
              {documentCount === 0 ? null : (
                <span className={MEDIA_BADGE_CLASS}>
                  {documentCount} {documentCount === 1 ? "file" : "files"}
                </span>
              )}
            </>
          )
        }
      />
    </Link>
  );
}
