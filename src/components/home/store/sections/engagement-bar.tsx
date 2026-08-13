// TRANSPORT: client-query — the toggles write through React Query; the counts are the server's.
//
// THE COMMENT PILL IS GONE, AND IT IS NOT COMING BACK. Product comments were decided against rather
// than deferred (STORE_BACKEND_STRUCTURE.md A10): a listing already has reviews, which require a
// completed order, Q&A, which requires a seller relationship or a verified purchase, and private
// inquiries, which require an authenticated buyer organization. A free-floating comment would have
// been the only public text surface on a listing with no standing requirement behind it, which is
// exactly what Q&A was shaped to avoid becoming. Neither reference market disagrees — Amazon removed
// customer comments from product pages in 2020. So `commentCount` has no table and never will, and
// the backend deliberately omits it from `engagement`.
//
// THE HEART AND THE BOOKMARK DO DIFFERENT THINGS, and the only place a buyer can learn that is
// here. The heart is a LIKE — a public number telling everyone how many people reacted to this
// listing, and it puts the product in no list at all. The bookmark is the WISHLIST, and it is the
// only one of the two that `/wishlist` will ever show. They were the same gesture under two icons
// until the backend's migration 0120.
//
// Which is why both buttons carry an `aria-label` naming what they do. Before the split they were
// two icons above two bare numbers, and a screen reader announced two anonymous pressable digits —
// survivable when the two meant the same thing, misleading now that they do not.
//
// `viewer` IS NULL FOR AN ANONYMOUS CALLER AND NOT `{hasLiked: false}`. "Not liked" and "we do not
// know who you are" are different facts. A null viewer renders an unfilled icon with `aria-pressed`
// ABSENT rather than `false` — the control makes no claim about a state it has not been told, and
// pressing it sends the buyer to sign in rather than firing a 401.
//
// NOTHING IS OPTIMISTIC. Each write answers the refreshed counters and those replace the cache
// whole; a number that moves and then moves back teaches a buyer that none of them are real.
"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { ShareSheet } from "@/components/home/watch/share-sheet";
import {
  useProductEngagement,
  useRecordProductShare,
  useToggleProductBookmarked,
  useToggleProductLiked,
} from "@/hooks/store/products";
import { formatCountLabel } from "@/lib/store/format";
import type { ProductEngagement } from "@/lib/store/products.schemas";

const PILL_CLASS =
  "flex flex-1 cursor-pointer items-center justify-start gap-1 rounded-full bg-[#CCE8E9] px-2 py-1 text-xs font-medium tracking-wide text-[#041F21] disabled:opacity-60";

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

export default function EngagementBar({
  productSlug,
  initialEngagement,
}: {
  readonly productSlug: string;
  readonly initialEngagement: ProductEngagement;
}) {
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  const { data: engagement } = useProductEngagement(productSlug, initialEngagement);
  const toggleLiked = useToggleProductLiked(productSlug);
  const toggleBookmarked = useToggleProductBookmarked(productSlug);
  const recordShare = useRecordProductShare(productSlug);

  // Null means "we do not know who you are", which is what makes the toggles unavailable rather
  // than off. These are keyed on the USER and not the organization — a signed-in visitor with no
  // commerce organization can both like and bookmark, because an org-keyed row would put a single
  // tap behind staff trade-state verification (A11).
  const viewer = engagement.viewer;
  const isViewerKnown = viewer !== null;

  const handleShareClick = () => {
    setIsShareSheetOpen(true);
    // Fired regardless of session — the route accepts an anonymous caller and simply does not move
    // the counter for one, which is a recorded share rather than a refusal.
    recordShare.mutate();
  };

  return (
    <div className="p-4 lg:px-6">
      <div className="flex gap-4">
        {/* The LIKE. A public reaction — it changes a number everyone sees and no list. */}
        <button
          type="button"
          aria-label={isViewerKnown && viewer.hasLiked ? "Remove your like" : "Like this product"}
          {...(isViewerKnown ? { "aria-pressed": viewer.hasLiked } : {})}
          disabled={!isViewerKnown || toggleLiked.isPending}
          onClick={() => {
            if (!isViewerKnown) return;
            toggleLiked.mutate({ isLiked: viewer.hasLiked });
          }}
          className={PILL_CLASS}
        >
          <PillIcon icon="favorite" filled={isViewerKnown && viewer.hasLiked} />
          <span className="[text-shadow:0_1px_2px_rgb(0_0_0/0.25)]">
            {formatCountLabel(engagement.likeCount)}
          </span>
        </button>

        {/* The BOOKMARK. This one, and only this one, puts the product in `/wishlist`. */}
        <button
          type="button"
          aria-label={
            isViewerKnown && viewer.hasBookmarked
              ? "Remove from your wishlist"
              : "Save to your wishlist"
          }
          {...(isViewerKnown ? { "aria-pressed": viewer.hasBookmarked } : {})}
          disabled={!isViewerKnown || toggleBookmarked.isPending}
          onClick={() => {
            if (!isViewerKnown) return;
            toggleBookmarked.mutate({ isBookmarked: viewer.hasBookmarked });
          }}
          className={PILL_CLASS}
        >
          <PillIcon icon="bookmark" filled={isViewerKnown && viewer.hasBookmarked} />
          <span className="[text-shadow:0_1px_2px_rgb(0_0_0/0.25)]">
            {formatCountLabel(engagement.bookmarkedCount)}
          </span>
        </button>

        {/* Share — opens the bottom sheet; icon stays unfilled because there is nothing to be in. */}
        <span className="relative flex flex-1">
          <button type="button" onClick={handleShareClick} className={PILL_CLASS}>
            <PillIcon icon="share" filled={false} />
            <span className="[text-shadow:0_1px_2px_rgb(0_0_0/0.25)]">
              {formatCountLabel(engagement.shareCount)}
            </span>
          </button>
          {isShareSheetOpen && <ShareSheet onClose={() => setIsShareSheetOpen(false)} />}
        </span>
      </div>

      {/* Why the two toggles are dead, when they are dead for a reason the visitor can act on. */}
      {!isViewerKnown && (
        <p className="mt-2 text-xs leading-4 text-[#6F7979]">
          <Link href="/sign-in" className="font-medium text-[#00696E]">
            Sign in
          </Link>{" "}
          to like this product or save it to your wishlist.
        </p>
      )}
    </div>
  );
}
