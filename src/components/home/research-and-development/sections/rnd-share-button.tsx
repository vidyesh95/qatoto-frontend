// TRANSPORT: props-only — opens `ShareSheet`, which navigates and writes nothing.
//
// A project or pitch has no share table, so `onShared` is omitted, exactly as in
// `blueprints/sections/blueprint-share-button.tsx`, whose notes apply here. `shareUrl` is built from
// `SITE_URL` so a link shared from a developer's machine still points at production.
"use client";

import Image from "next/image";
import { useState } from "react";

import { createLazySheet } from "@/components/home/shared/lazy-overlay";
import { SITE_URL } from "@/lib/site";

const { LazyOverlay: LazyShareSheet, preload: preloadShareSheet } = createLazySheet(
  () =>
    import("@/components/home/watch/share-sheet").then((module) => ({
      default: module.ShareSheet,
    })),
  "Share",
);

export default function RndShareButton({
  sharePath,
  shareTitle,
}: {
  /** Site-relative, such as `/research-and-development/project/solar-cold-storage`. */
  readonly sharePath: string;
  readonly shareTitle: string;
}) {
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  return (
    // `relative` anchors the sheet's desktop panel. Without it the panel escapes to the page corner.
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onPointerEnter={preloadShareSheet}
        onFocus={preloadShareSheet}
        onClick={() => setIsShareSheetOpen(true)}
        className="flex cursor-pointer items-center gap-2 rounded-full border border-outline-strong px-4 py-2 text-sm font-medium text-primary-imprint"
      >
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
        <LazyShareSheet
          onClose={() => setIsShareSheetOpen(false)}
          shareUrl={`${SITE_URL}${sharePath}`}
          videoTitle={shareTitle}
        />
      )}
    </span>
  );
}
