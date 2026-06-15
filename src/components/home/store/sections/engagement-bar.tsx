"use client";

import Image from "next/image";
import { useState } from "react";

import { ShareSheet } from "@/components/home/watch/share-sheet";

import CommentSheet from "@/components/home/store/sheets/comment-sheet";

// Engagement row for the product page. favorite / bookmark are self-toggling
// pills (icon swaps FILL0 → FILL1 while selected); comment opens a comment
// sheet and share opens a share sheet — both reuse the watch-screen shells.
const TOGGLE_PILLS = [
  { icon: "favorite", count: "3.7k" },
  { icon: "bookmark", count: "414" },
] as const;

const PILL_CLASS =
  "flex flex-1 cursor-pointer items-center justify-start gap-1 rounded-full bg-[#CCE8E9] px-2 py-1 text-xs font-medium tracking-wide text-[#041F21]";

function PillIcon({ icon, filled }: { icon: string; filled: boolean }) {
  return (
    <span className="relative size-4 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
      <Image
        src={`/icons/${icon}_24dp_000000_FILL${filled ? 1 : 0}_wght400_GRAD0_opsz24.svg`}
        fill
        sizes="16px"
        alt=""
        className="object-contain"
      />
    </span>
  );
}

export default function EngagementBar() {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <div className="flex gap-4 p-4 lg:px-6">
      {/* Comment — opens the comment sheet; icon stays unfilled. */}
      <span className="relative flex flex-1">
        <button type="button" onClick={() => setCommentsOpen(true)} className={PILL_CLASS}>
          <PillIcon icon="comment" filled={false} />
          <span className="[text-shadow:0_1px_2px_rgb(0_0_0/0.25)]">1.1k</span>
        </button>
        {commentsOpen && <CommentSheet onClose={() => setCommentsOpen(false)} />}
      </span>

      {TOGGLE_PILLS.map((pill) => {
        const isSelected = selected[pill.icon] ?? false;
        return (
          <button
            key={pill.icon}
            type="button"
            aria-pressed={isSelected}
            onClick={() => setSelected((prev) => ({ ...prev, [pill.icon]: !prev[pill.icon] }))}
            className={PILL_CLASS}
          >
            <PillIcon icon={pill.icon} filled={isSelected} />
            <span className="[text-shadow:0_1px_2px_rgb(0_0_0/0.25)]">{pill.count}</span>
          </button>
        );
      })}

      {/* Share — opens the bottom sheet / popover; icon stays unfilled. */}
      <span className="relative flex flex-1">
        <button type="button" onClick={() => setShareOpen(true)} className={PILL_CLASS}>
          <PillIcon icon="share" filled={false} />
          <span className="[text-shadow:0_1px_2px_rgb(0_0_0/0.25)]">3696</span>
        </button>
        {shareOpen && <ShareSheet onClose={() => setShareOpen(false)} />}
      </span>
    </div>
  );
}
