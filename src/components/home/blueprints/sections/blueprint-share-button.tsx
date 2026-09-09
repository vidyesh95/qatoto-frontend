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
 * Two looks, one behaviour. `pill` is the teardown bar, where the button sits in a row of counts
 * and has to read as the one control among them. `inline` is the showcase byline, where the share
 * affordance has always been a quiet text link beside the launch date and a pill would shout.
 */
const TRIGGER_CLASS = {
  pill: "flex cursor-pointer flex-row items-center justify-center gap-2 rounded-full bg-[#CCE8E9] px-3 py-1.5 text-sm font-medium text-[#041F21] hover:bg-[#bfe0e1]",
  inline:
    "inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#6F7979] hover:underline",
} as const;

const TRIGGER_ICON_SIZE_PX = { pill: 18, inline: 14 } as const;

export default function BlueprintShareButton({
  blueprint,
  variant = "pill",
}: {
  readonly blueprint: {
    readonly category: BlueprintCategory;
    readonly slug: string;
    readonly title: string;
  };
  readonly variant?: keyof typeof TRIGGER_CLASS;
}) {
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const iconSizePx = TRIGGER_ICON_SIZE_PX[variant];

  return (
    <span
      className={`relative inline-flex ${variant === "pill" ? "w-full lg:w-24" : ""}`}
    >
      <button
        type="button"
        onClick={() => setIsShareSheetOpen(true)}
        className={`${TRIGGER_CLASS[variant]} ${variant === "pill" ? "w-full" : ""}`}
      >
        <Image
          src="/icons/share_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={iconSizePx}
          height={iconSizePx}
          className={variant === "pill" ? "size-[18px] shrink-0" : "size-3.5 shrink-0 opacity-60"}
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
