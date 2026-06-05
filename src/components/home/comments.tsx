"use client";

import { useState } from "react";

import Image from "next/image";

export type Comment = {
  id: string;
  profileSrc: string;
  author: string;
  postedAt: string;
  location: string;
  text: string;
  likes: string;
  replies: string;
};

export type Review = {
  id: string;
  profileSrc: string;
  author: string;
  variant: string;
  rating: number;
  text: string;
  images: string[];
  postedAt: string;
  location: string;
  likes: string;
  verified: boolean;
};

export type SaleItem = {
  name: string;
  price: string;
  sold: string;
};

export type CommentsProps = {
  count: string;
  comments: Comment[];
  /** Trending search shown above comments when no item is attached. */
  trending?: string;
  /** Set when the creator attached an item for sale — unlocks the Reviews tab. */
  saleItem?: SaleItem;
  reviews?: Review[];
  className?: string;
};

type Tab = "comments" | "reviews";
type Sort = "top" | "new";

export default function Comments({
  count,
  comments,
  trending,
  saleItem,
  reviews = [],
  className = "",
}: CommentsProps) {
  const hasReviews = Boolean(saleItem);
  const [tab, setTab] = useState<Tab>("comments");
  const [sort, setSort] = useState<Sort>("top");

  return (
    <section className={`rounded-xl border border-[#E5E7E7] bg-background ${className}`}>
      {/* Header */}
      {hasReviews && saleItem ? (
        <>
          {/* Attached item */}
          <div className="flex flex-row items-center gap-3 px-4 py-3">
            <div className="size-9 rounded-lg bg-[#F1F3F3] shrink-0 flex items-center justify-center">
              <Image
                src="/icons/shopping_cart_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                width={20}
                height={20}
                alt=""
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{saleItem.name}</p>
              <p className="text-xs text-[#1DBDC5]">
                Price: {saleItem.price} | Sold: {saleItem.sold}
              </p>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex flex-row border-b border-[#E5E7E7]">
            <TabButton active={tab === "comments"} onClick={() => setTab("comments")}>
              {count} Comments
            </TabButton>
            <TabButton active={tab === "reviews"} onClick={() => setTab("reviews")}>
              {reviews.length} Reviews
            </TabButton>
          </div>
        </>
      ) : (
        <>
          {trending && (
            <div className="px-4 py-3">
              <p className="text-sm font-medium">Everyone is searching for:</p>
              <p className="text-sm text-[#1DBDC5]">{trending}</p>
            </div>
          )}
          <div className="border-b-2 border-[#1DBDC5] px-4 pb-3 pt-1 text-center">
            <h2 className="text-base font-medium">{count} Comments</h2>
          </div>
        </>
      )}

      {/* Sort pills */}
      <div className="flex flex-row items-center gap-2 px-4 py-3">
        <SortPill active={sort === "top"} onClick={() => setSort("top")} showCheck>
          Top
        </SortPill>
        <SortPill active={sort === "new"} onClick={() => setSort("new")}>
          New
        </SortPill>
      </div>

      {/* Body */}
      {tab === "reviews" ? (
        <ul className="px-4 pb-2">
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </ul>
      ) : (
        <ul className="px-4 pb-2">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </ul>
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
      className={`flex-1 px-4 py-3 text-sm font-medium cursor-pointer border-b-2 -mb-px transition-colors ${
        active ? "border-[#1DBDC5] text-foreground" : "border-transparent text-[#6F7979]"
      }`}
    >
      {children}
    </button>
  );
}

function SortPill({
  active,
  onClick,
  showCheck = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  showCheck?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-row items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium cursor-pointer border transition-colors ${
        active
          ? "bg-primary border-primary text-primary-foreground"
          : "border-[#E5E7E7] text-foreground"
      }`}
    >
      {active && showCheck && (
        <Image
          src="/icons/check_circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"
          width={16}
          height={16}
          alt=""
        />
      )}
      {children}
    </button>
  );
}

function Avatar({ src }: { src: string }) {
  return (
    <div className="size-9 rounded-full border border-foreground shrink-0 flex items-center justify-center">
      <Image
        src={src}
        width={34}
        height={34}
        alt="profile image"
        className="size-8.5 rounded-full"
      />
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex flex-row items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 -960 960 960"
          width={16}
          height={16}
          className={i < rating ? "fill-[#1DBDC5]" : "fill-[#D5DBDB]"}
        >
          <path d="M480-269 314-169q-11 7-23 6t-21-8q-9-7-14-17.5t-2-23.5l44-189-147-127q-10-9-12.5-20.5T140-571q4-11 12-18t22-9l194-17 75-178q5-12 15.5-18t21.5-6q11 0 21.5 6t15.5 18l75 178 194 17q14 2 22 9t12 18q4 11 1.5 22.5T809-528L662-401l44 189q3 13-2 23.5T690-171q-9 7-21 8t-23-6L480-269Z" />
        </svg>
      ))}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  ariaLabel,
}: {
  icon: string;
  label?: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="flex flex-row items-center gap-1.5 text-xs text-[#6F7979] hover:text-foreground cursor-pointer"
    >
      <Image src={icon} width={18} height={18} alt="" />
      {label}
    </button>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <li className="flex flex-row gap-3 py-3">
      <Avatar src={comment.profileSrc} />
      <div className="min-w-0 flex-1">
        <span className="text-xs text-[#6F7979]">{comment.author}</span>
        <p className="mt-0.5 text-sm font-medium leading-snug">{comment.text}</p>
        <p className="mt-1 text-xs text-[#6F7979]">
          {comment.postedAt} • {comment.location}
        </p>
        <div className="mt-2 flex flex-row items-center gap-5">
          <ActionButton
            icon="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            label={comment.likes}
            ariaLabel="like comment"
          />
          <ActionButton
            icon="/icons/heart_broken_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            ariaLabel="dislike comment"
          />
          <ActionButton
            icon="/icons/reply_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            ariaLabel="reply to comment"
          />
          <ActionButton
            icon="/icons/share_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            ariaLabel="share comment"
          />
        </div>
        {comment.replies !== "0" && (
          <button
            type="button"
            className="mt-2 flex flex-row items-center gap-2 text-xs text-[#6F7979] cursor-pointer hover:text-foreground"
          >
            <span className="h-px w-6 bg-[#D5DBDB]" />
            Expand {comment.replies} replies
            <Image
              src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
              width={16}
              height={16}
              alt=""
              className="rotate-90"
            />
          </button>
        )}
      </div>
    </li>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <li className="flex flex-row gap-3 py-3">
      <Avatar src={review.profileSrc} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-row items-start justify-between gap-2">
          <span className="text-xs text-[#6F7979]">{review.author}</span>
          <Image
            src="/icons/more_vert_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={20}
            height={20}
            alt="more options"
            className="shrink-0 cursor-pointer"
          />
        </div>
        <p className="mt-0.5 text-xs text-[#6F7979]">{review.variant}</p>
        <div className="mt-1.5">
          <Stars rating={review.rating} />
        </div>
        <p className="mt-1.5 text-sm font-medium leading-snug">
          {review.text}{" "}
          <button type="button" className="align-baseline text-xs text-[#1DBDC5] cursor-pointer">
            more
          </button>
        </p>
        {review.images.length > 0 && (
          <div className="mt-2 flex flex-row items-center gap-2">
            {review.images.slice(0, 3).map((src, i) => (
              <Image
                key={i}
                src={src}
                width={88}
                height={88}
                alt="review photo"
                className="size-22 rounded-lg object-cover"
              />
            ))}
            <button type="button" className="text-xs text-[#1DBDC5] cursor-pointer">
              more
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-[#6F7979]">
          {review.postedAt} • {review.location}
        </p>
        <div className="mt-2 flex flex-row items-center gap-5">
          <ActionButton
            icon="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            label={review.likes}
            ariaLabel="like review"
          />
          <ActionButton
            icon="/icons/heart_broken_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            ariaLabel="dislike review"
          />
          <ActionButton
            icon="/icons/share_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            ariaLabel="share review"
          />
        </div>
        {review.verified && (
          <div className="mt-2 flex flex-row items-center gap-2 text-xs text-[#6F7979]">
            <span className="h-px w-6 bg-[#D5DBDB]" />
            Verified Purchase
            <Image
              src="/icons/check_circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"
              width={16}
              height={16}
              alt=""
            />
          </div>
        )}
      </div>
    </li>
  );
}
