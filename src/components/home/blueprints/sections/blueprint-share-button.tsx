// TRANSPORT: props-only — opens `ShareSheet`, which navigates and writes nothing.
//
// THE ONE REAL CONTROL ON A BLUEPRINT'S ENGAGEMENT ROW. Sharing is the exception to the rule the
// counts beside it obey: it hands the reader an outbound link rather than moving a number, so it
// needs no route and claims nothing the backend has to agree with.
//
// `onShared` IS DELIBERATELY OMITTED, and that omission is the whole reason this is safe. That
// callback exists to record a share against `video_share.videoId`, which is NOT NULL with no
// polymorphic target — there is no row a blueprint could be recorded against. The sheet
// optional-chains it, so leaving it off is a silent no-op and no counter moves. Same call shape as
// `channel/channel-about-sheet.tsx`, which shares a channel for the same reason.
//
// `shareUrl` IS PASSED EXPLICITLY, always. The sheet defaults to `window.location.href`, which on a
// developer's machine is a `localhost` URL that would be copied into somebody's chat. `SITE_URL` is
// what `sitemap.ts` uses for the same reason: a shared link must point at production.
//
// THE `relative` WRAPPER IS LOAD-BEARING. The desktop panel is `sm:absolute sm:top-full
// sm:right-0`, so it anchors to the nearest positioned ancestor — this span. Drop it and the sheet
// escapes to the page corner.
"use client";

import { useState } from "react";

import Image from "next/image";

import { ShareSheet } from "@/components/home/watch/share-sheet";
import { buildBlueprintHref, type BlueprintCategory } from "@/lib/blueprints/schemas";
import { SITE_URL } from "@/lib/site";

/**
 * ONE LOOK, AND IT USED TO BE TWO. A quiet `inline` text-link variant existed for the showcase
 * byline, where a pill would have shouted next to the launch date. Share moved into
 * `ShowcaseEngagementBar` — both detail pages now offer it in the same place, in the same shape —
 * and the variant lost its only caller. A prop with one value is a decision nobody makes, so it is
 * gone rather than kept for a hypothetical third surface.
 *
 * It matches `StatPill` (`src/components/home/watch/stat-pill.tsx`) deliberately: sized `w-full` so
 * it fills its grid cell below `lg` and `lg:w-24` beside it, the same widths the watch bar uses, so
 * the one real control lines up with the inert counts either side of it.
 */
const TRIGGER_CLASS =
  "flex w-full cursor-pointer flex-row items-center justify-center gap-2 rounded-full bg-[#CCE8E9] px-3 py-1.5 text-sm font-medium text-[#041F21] hover:bg-[#bfe0e1]";

export default function BlueprintShareButton({
  blueprint,
}: {
  readonly blueprint: {
    readonly category: BlueprintCategory;
    readonly slug: string;
    readonly title: string;
  };
}) {
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  return (
    <span className="relative inline-flex w-full lg:w-24">
      <button type="button" onClick={() => setIsShareSheetOpen(true)} className={TRIGGER_CLASS}>
        <Image
          src="/icons/share_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={18}
          height={18}
          className="size-4.5 shrink-0"
        />
        Share
      </button>
      {isShareSheetOpen && (
        <ShareSheet
          onClose={() => setIsShareSheetOpen(false)}
          shareUrl={`${SITE_URL}${buildBlueprintHref(blueprint)}`}
          videoTitle={blueprint.title}
        />
      )}
    </span>
  );
}
