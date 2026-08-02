"use client";

// TRANSPORT: client-query — the comments card. The thread itself is real
// (`video-comment-thread.tsx`); this file is the shell around it.
//
// WHAT CHANGED: this used to be 447 lines rendering a mock `Comment[]` with Top/New sort pills
// that sorted nothing, like buttons with no `onClick` at all, and no composer anywhere. The
// thread moved to `video-comment-thread.tsx` and is wired to `GET/POST /videos/:id/comments`.
//
// WHAT DID NOT: the attached-item header and the Reviews tab, which are marked
// `TRANSPORT: mock` below.

import Image from "next/image";
import { useState } from "react";

import VideoCommentThread from "@/components/home/watch/video-comment-thread";
import { formatCompactCountLabel } from "@/lib/feed/format";
import type { VideoComment } from "@/lib/feed/schemas";
import type { Review, SaleItem } from "@/types/video";

/**
 * TRANSPORT: mock — `saleItem`, `reviews` and `trending` have no counterpart in
 * `GET /feed/watch/:videoId`.
 *
 * Attaching a store product to a video is a real product intent and a real backend gap: the
 * `/products` API exists, but nothing joins a product to a video and there is no product-review
 * table. `trending` ("everyone is searching for…") has no search-term aggregation behind it
 * either. All three are held empty so the tab bar collapses to the comments header rather than
 * showing a Reviews tab over invented reviews. Deliberate; docs/HOME_STRUCTURE.md §10.
 */
const PLACEHOLDER_SALE_ITEM: SaleItem | undefined = undefined;
const PLACEHOLDER_REVIEWS: Review[] = [];
const PLACEHOLDER_TRENDING_SEARCH: string | undefined = undefined;

type CommentsTab = "comments" | "reviews";

export default function Comments({
  videoId,
  areCommentsEnabled,
  initialComments,
  initialNextCursor,
  isViewerSignedIn,
  commentCount,
  className = "",
}: {
  readonly videoId: string;
  readonly areCommentsEnabled: boolean;
  readonly initialComments: VideoComment[];
  readonly initialNextCursor: string | null;
  readonly isViewerSignedIn: boolean;
  readonly commentCount: number;
  readonly className?: string;
}) {
  const hasReviews = PLACEHOLDER_SALE_ITEM !== undefined;
  const [tab, setTab] = useState<CommentsTab>("comments");

  return (
    <section className={`rounded-xl border border-[#E5E7E7] bg-background ${className}`}>
      {hasReviews && PLACEHOLDER_SALE_ITEM !== undefined ? (
        <>
          {/* Attached item */}
          <div className="flex flex-row items-center gap-3 px-4 py-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-[2px] bg-[#00696E]">
              <Image
                src="/icons/shopping_cart_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
                width={16}
                height={16}
                alt=""
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium">{PLACEHOLDER_SALE_ITEM.name}</p>
              <p className="text-[11px] text-[#1DBDC5]">
                Price: {PLACEHOLDER_SALE_ITEM.price} | Sold: {PLACEHOLDER_SALE_ITEM.sold}
              </p>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex flex-row border-b border-[#DAE4E5]">
            <TabButton active={tab === "comments"} onClick={() => setTab("comments")}>
              {formatCompactCountLabel(commentCount)} Comments
            </TabButton>
            <TabButton active={tab === "reviews"} onClick={() => setTab("reviews")}>
              {PLACEHOLDER_REVIEWS.length} Reviews
            </TabButton>
          </div>
        </>
      ) : (
        <>
          {PLACEHOLDER_TRENDING_SEARCH !== undefined && (
            <div className="px-4 py-3">
              <p className="text-sm font-medium">Everyone is searching for:</p>
              <p className="text-sm text-[#1DBDC5]">{PLACEHOLDER_TRENDING_SEARCH}</p>
            </div>
          )}
          <div className="border-b-2 border-[#1DBDC5] px-4 pt-1 pb-3 text-center">
            <h2 className="text-base font-medium">
              {formatCompactCountLabel(commentCount)} Comments
            </h2>
          </div>
        </>
      )}

      {/*
        NO SORT PILLS. The old Top/New pair set local state and never re-sorted anything, and
        `GET /videos/:id/comments` takes no `sort` parameter — the backend fixes newest-first
        for the thread and oldest-first for replies. A control that cannot do what it says is
        worse than no control.
      */}
      {tab === "reviews" ? (
        <p className="px-4 py-6 text-sm text-[#6F7979]">No reviews yet.</p>
      ) : (
        <VideoCommentThread
          videoId={videoId}
          areCommentsEnabled={areCommentsEnabled}
          initialComments={initialComments}
          initialNextCursor={initialNextCursor}
          isViewerSignedIn={isViewerSignedIn}
        />
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${
        active ? "border-b-2 border-[#1DBDC5] text-foreground" : "text-[#6F7979]"
      }`}
    >
      {children}
    </button>
  );
}
