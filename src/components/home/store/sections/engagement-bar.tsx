// TRANSPORT: mock — the counts and the toggles are local. NOTHING here reaches a backend yet.
//
// THE COMMENT PILL IS GONE, AND IT IS NOT COMING BACK. Product comments were decided against
// rather than deferred (STORE_BACKEND_STRUCTURE.md A10): a listing already has reviews, which
// require a completed order, Q&A, which requires a seller relationship or a verified purchase,
// and private inquiries, which require an authenticated buyer organization. A free-floating
// comment would have been the only public text surface on a listing with no standing
// requirement behind it, which is exactly what Q&A was shaped to avoid becoming. Neither
// reference market disagrees — Amazon removed customer comments from product pages in 2020.
//
// So `commentCount` has no table and never will, and the backend deliberately omits it from
// `engagement` for that reason. A hardcoded "1.1k" beside three real counters is the failure
// mode the whole appendix exists to prevent: a number that looks wired and can never be.
// `questionCount` is the honest figure next to these, and it belongs on the Q&A section.
//
// What IS wired-able here, when this file becomes `client-query`:
//   PUT/DELETE /store/products/:productSlug/save        → the favourite toggle
//   PUT/DELETE /store/products/:productSlug/bookmark    → the bookmark toggle
//   POST       /store/products/:productSlug/share       → the share counter
// with `engagement.viewer` supplying the initial pressed state. Note `viewer` is `null` for an
// anonymous caller and NOT `{hasSaved: false}` — "not saved" and "we do not know who you are"
// are different facts, and only the second one may render as an unfilled icon with no promise
// attached to it.
"use client";

import { useState } from "react";

import Image from "next/image";

import { ShareSheet } from "@/components/home/watch/share-sheet";

// favorite / bookmark are self-toggling pills (the icon swaps FILL0 → FILL1 while selected);
// share opens the watch-screen sheet. The counts are strings because they are placeholders —
// the wire carries integers and the client formats them, never the reverse.
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

  return (
    <div className="flex gap-4 p-4 lg:px-6">
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
