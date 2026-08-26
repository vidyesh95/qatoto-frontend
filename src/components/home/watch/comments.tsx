"use client";

// The comments panel under the player, plus the products a creator attached to the video.
//
// ATTACHED PRODUCTS ARE REAL NOW. This file used to hold `PLACEHOLDER_SALE_ITEM`, a
// `{ name, price, sold }` triple of pre-formatted strings marked `TRANSPORT: mock` because
// nothing joined a product to a video on the public read. `video_attached_product` and
// `PUT /videos/:videoId/products` had existed the whole time; the READ half shipped, so the
// placeholder went with it.
//
// THE REVIEWS TAB IS REAL TOO, and the claim that it could not be was stale rather than wrong at
// the time. `GET /store/products/:productSlug/reviews` ships, `listStoreProductReviews` is
// already in the store api layer, and `RatingsAndReviews` takes exactly
// `{ productSlug, initialPage }` — so the tab mounts the store's own component against the
// attached product instead of a mock `Review[]`. One review surface, not two.
//
// `trending` STAYS MOCK. "Everyone is searching for…" needs a search-term aggregation that does
// not exist anywhere in the backend, and it is held `undefined` rather than invented.

import { useState } from "react";

import CatalogProductCard from "@/components/home/store/cards/catalog-product-card";
import RatingsAndReviews from "@/components/home/store/sections/ratings-and-reviews";
import VideoCommentThread from "@/components/home/watch/video-comment-thread";
import { formatCompactCountLabel } from "@/lib/feed/format";
import type { VideoComment, WatchPayload } from "@/lib/feed/schemas";

/**
 * TRANSPORT: mock — `trending` has no counterpart in `GET /feed/watch/:videoId`.
 *
 * There is no search-term aggregation behind "everyone is searching for…" — no table, no job, no
 * route. Held `undefined` so the block renders nothing rather than a fabricated phrase.
 * Deliberate; docs/HOME_STRUCTURE.md §10.
 */
const PLACEHOLDER_TRENDING_SEARCH: string | undefined = undefined;

type CommentsTab = "comments" | "reviews";

export default function Comments({
  videoId,
  areCommentsEnabled,
  initialComments,
  initialNextCursor,
  isViewerSignedIn,
  commentCount,
  attachedProducts,
  className = "",
}: {
  readonly videoId: string;
  readonly areCommentsEnabled: boolean;
  /** Null when the server-side read failed; the island then fetches page one itself. */
  readonly initialComments: VideoComment[] | null;
  readonly initialNextCursor: string | null;
  readonly isViewerSignedIn: boolean;
  readonly commentCount: number;
  /**
   * What the creator attached, already filtered server-side to listings the public may see. A
   * seller unpublishing a product makes this SHORTER — it never carries a dead card — so its
   * length is not "how many the creator attached" and must not be labelled as such.
   */
  readonly attachedProducts: WatchPayload["attachedProducts"];
  readonly className?: string;
}) {
  // THE REVIEWS TAB FOLLOWS THE FIRST ATTACHED PRODUCT. Reviews belong to a product, not to a
  // video, so a video with two attached products has two review sets and no honest way to merge
  // them — the first is the one the creator ordered first. With none, there is no tab at all.
  const reviewedProduct = attachedProducts[0]?.product ?? null;
  const [tab, setTab] = useState<CommentsTab>("comments");

  return (
    <section className={`rounded-xl border border-[#E5E7E7] bg-background ${className}`}>
      {reviewedProduct !== null ? (
        <>
          {/*
            THE STORE'S OWN CARD, not a bespoke row. `CatalogProductCard` is what every browse
            surface renders and it already links to `/store/product/{slug}` — a second card here
            would be a second place for a price to be formatted differently.

            `pinnedAtSeconds` IS DELIBERATELY NOT RENDERED YET. It is on the wire and it means
            "show this at 2:14", which is a player-timeline feature; printing it as text beside
            the card would be a timestamp with nothing to click.
          */}
          <div className="grid grid-cols-2 gap-3 px-4 py-3 sm:grid-cols-3">
            {attachedProducts.map((attachment) => (
              <CatalogProductCard key={attachment.product.id} product={attachment.product} />
            ))}
          </div>
          {/* Tabs */}
          <div className="flex flex-row border-b border-[#DAE4E5]">
            <TabButton active={tab === "comments"} onClick={() => setTab("comments")}>
              {formatCompactCountLabel(commentCount)} Comments
            </TabButton>
            {/*
              NO COUNT ON THIS TAB. The review total lives inside `RatingsAndReviews`'s own
              summary, which the watch payload does not carry — a number here would either be
              invented or require a second request to render a tab label.
            */}
            <TabButton active={tab === "reviews"} onClick={() => setTab("reviews")}>
              Reviews
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
      {tab === "reviews" && reviewedProduct !== null ? (
        /*
          `initialPage: null` — there IS no server-rendered first page here. This panel is a
          client island and the tab is not even mounted until a reader opens it, so the component
          fetches on mount, which is exactly what null means to it.
        */
        <RatingsAndReviews productSlug={reviewedProduct.publicSlug} initialPage={null} />
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
