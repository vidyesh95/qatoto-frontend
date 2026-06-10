"use client";

import { useState } from "react";

import Image from "next/image";

export type Reply = {
  id: string;
  profileSrc: string;
  author: string;
  /** Author this reply is directed at — shows the "▶ name" badge. */
  replyingTo?: string;
  postedAt: string;
  location: string;
  text: string;
  likes: string;
};

export type Comment = {
  id: string;
  profileSrc: string;
  author: string;
  postedAt: string;
  location: string;
  text: string;
  likes: string;
  /** Count badge fallback; prefer replyList.length when replies are attached. */
  replies: string;
  replyList?: Reply[];
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
  /** Buyer Q&A under the review — viewers ask, reviewer replies. */
  replyList?: Reply[];
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
            <div className="size-7 rounded-[2px] bg-[#00696E] shrink-0 flex items-center justify-center">
              <Image
                src="/icons/shopping_cart_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
                width={16}
                height={16}
                alt=""
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium truncate">{saleItem.name}</p>
              <p className="text-[11px] text-[#1DBDC5]">
                Price: {saleItem.price} | Sold: {saleItem.sold}
              </p>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex flex-row border-b border-[#DAE4E5]">
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
        active ? "border-[#00696E] text-[#191C1C]" : "border-transparent text-[#3F4949]"
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
        active ? "bg-[#CCE8E9] border-[#CCE8E9] text-[#041F21]" : "border-[#6F7979] text-[#3F4949]"
      }`}
    >
      {active && showCheck && (
        <svg viewBox="0 -960 960 960" width={18} height={18} className="fill-[#041F21]">
          <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
        </svg>
      )}
      {children}
    </button>
  );
}

function Avatar({ src }: { src: string }) {
  return (
    <div className="size-8 shrink-0">
      <Image
        src={src}
        width={32}
        height={32}
        alt="profile image"
        className="object-cover rounded-full size-8"
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
          width={20}
          height={20}
          className={i < rating ? "fill-[#00696E]" : "fill-[#E0E3E3]"}
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
      className="flex flex-row items-center gap-1.5 text-[11px] text-foreground hover:text-[#6F7979] cursor-pointer"
    >
      <Image src={icon} width={14} height={14} alt="" />
      {label}
    </button>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const [expanded, setExpanded] = useState(false);
  const replyList = comment.replyList ?? [];
  const replyCount = replyList.length > 0 ? String(replyList.length) : comment.replies;
  const hasReplies = replyCount !== "0";

  return (
    <li className="flex flex-row gap-3 py-3">
      <Avatar src={comment.profileSrc} />
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-medium text-foreground">{comment.author}</span>
        <p className="mt-1 text-xs font-medium leading-snug">{comment.text}</p>
        <p className="mt-1 text-[11px] font-medium text-foreground">
          {comment.postedAt} · {comment.location}
        </p>
        <div className="flex flex-row items-center gap-5 mt-2">
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

        {expanded && replyList.length > 0 && (
          <ul className="mt-2 space-y-1">
            {replyList.map((reply) => (
              <ReplyItem key={reply.id} reply={reply} />
            ))}
          </ul>
        )}

        {hasReplies && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-2 flex flex-row items-center gap-2 text-xs text-[#6F7979] cursor-pointer hover:text-foreground"
          >
            <span className="h-px w-6 bg-[#D5DBDB]" />
            {expanded ? "Collapse" : `Expand ${replyCount} replies`}
            <Image
              src={
                expanded
                  ? "/icons/keyboard_control_key_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  : "/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              }
              width={16}
              height={16}
              alt=""
            />
          </button>
        )}
      </div>
    </li>
  );
}

function ReplyItem({ reply }: { reply: Reply }) {
  return (
    <li className="flex flex-row gap-2 py-2">
      <div className="size-7 shrink-0">
        <Image
          src={reply.profileSrc}
          width={28}
          height={28}
          alt="profile image"
          className="object-cover rounded-full size-7"
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="flex flex-row flex-wrap items-center gap-1 text-[11px] font-medium text-foreground">
          {reply.author}
          {reply.replyingTo && (
            <span className="flex flex-row items-center gap-1 text-[#6F7979]">
              <Image
                src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                width={12}
                height={12}
                alt=""
              />
              {reply.replyingTo}
            </span>
          )}
        </span>
        <p className="mt-1 text-xs font-medium leading-snug">{reply.text}</p>
        <p className="mt-1 text-[11px] font-medium text-foreground">
          {reply.postedAt} · {reply.location}
        </p>
        <div className="flex flex-row items-center gap-5 mt-2">
          <ActionButton
            icon="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            label={reply.likes}
            ariaLabel="like reply"
          />
          <ActionButton
            icon="/icons/heart_broken_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            ariaLabel="dislike reply"
          />
          <ActionButton
            icon="/icons/reply_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            ariaLabel="reply"
          />
        </div>
      </div>
    </li>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const replyList = review.replyList ?? [];
  const hasReplies = replyList.length > 0;

  return (
    <li className="flex flex-row gap-3 py-3">
      <Avatar src={review.profileSrc} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-row items-start justify-between gap-2">
          <span className="text-[11px] font-medium text-foreground">{review.author}</span>
          <Image
            src="/icons/more_vert_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={14}
            height={14}
            alt="more options"
            className="cursor-pointer shrink-0"
          />
        </div>
        <p className="mt-1 text-xs font-medium text-[#A9ACAC]">{review.variant}</p>
        <div className="mt-1.5">
          <Stars rating={review.rating} />
        </div>
        <p className="mt-1.5 text-xs font-medium leading-snug">{review.text}</p>
        <button
          type="button"
          className="mt-0.5 block w-full text-right text-xs font-medium text-[#2A76FD] cursor-pointer"
        >
          more
        </button>
        {review.images.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-1 mt-2 w-max">
              {review.images.map((src, i) => (
                <Image
                  key={i}
                  src={src}
                  width={72}
                  height={72}
                  alt="review photo"
                  className="size-18 rounded-[3px] object-cover"
                />
              ))}
            </div>
            <button
              type="button"
              className="mt-0.5 block w-full text-right text-xs font-medium text-[#2A76FD] cursor-pointer"
            >
              more
            </button>
          </>
        )}
        <p className="mt-2 text-[11px] font-medium text-foreground">
          {review.postedAt} • {review.location}
        </p>
        <div className="flex flex-row items-center gap-5 mt-2">
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
          {review.verified && (
            <div className="flex flex-row items-center gap-1.5 text-[11px] font-medium text-[#6F7979]">
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

        {expanded && hasReplies && (
          <ul className="mt-2 space-y-1">
            {replyList.map((reply) => (
              <ReplyItem key={reply.id} reply={reply} />
            ))}
          </ul>
        )}

        {hasReplies && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-2 flex flex-row items-center gap-2 text-xs text-[#6F7979] cursor-pointer hover:text-foreground"
          >
            <span className="h-px w-6 bg-[#D5DBDB]" />
            {expanded ? "Collapse" : `Expand ${replyList.length} replies`}
            <Image
              src={
                expanded
                  ? "/icons/keyboard_control_key_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  : "/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              }
              width={16}
              height={16}
              alt=""
            />
          </button>
        )}
      </div>
    </li>
  );
}
