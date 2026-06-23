"use client";

import { useEffect, useRef } from "react";

import Image from "next/image";

import Comments from "@/components/home/watch/comments";

import type { Comment, Review, SaleItem } from "@/types/video";

// Mock comment thread for the product page (UI-only phase, no fetch).
const MOCK_COMMENTS: Comment[] = [
  {
    id: "c1",
    profileSrc: "/dummy/profile_image_01.avif",
    author: "Aarav Mehta",
    postedAt: "2 days ago",
    location: "Mumbai, IN",
    text: "Ordered a set of 12 for our café. Folds flat exactly as shown, no wobble on tile.",
    likes: "212",
    replies: "2",
    replyList: [
      {
        id: "c1r1",
        profileSrc: "/dummy/profile_image_02.avif",
        author: "Guangdong Puda",
        replyingTo: "Aarav Mehta",
        postedAt: "1 day ago",
        location: "Guangdong, CN",
        text: "Thanks for the order! Glad the stacking worked out for your space.",
        likes: "18",
      },
    ],
  },
  {
    id: "c2",
    profileSrc: "/dummy/profile_image_03.avif",
    author: "Lena Hoffmann",
    postedAt: "5 days ago",
    location: "Berlin, DE",
    text: "Frame feels solid for the price. Comfortable enough for a full day at the desk.",
    likes: "97",
    replies: "0",
  },
  {
    id: "c3",
    profileSrc: "/dummy/profile_image_04.avif",
    author: "Diego Santos",
    postedAt: "1 week ago",
    location: "São Paulo, BR",
    text: "Is the seat height adjustable? Otherwise great build quality.",
    likes: "41",
    replies: "1",
    replyList: [
      {
        id: "c3r1",
        profileSrc: "/dummy/profile_image_05.avif",
        author: "Guangdong Puda",
        replyingTo: "Diego Santos",
        postedAt: "6 days ago",
        location: "Guangdong, CN",
        text: "This model is a fixed 45 cm seat height. An adjustable variant is coming soon.",
        likes: "12",
      },
    ],
  },
];

// Attached product — presence unlocks the Reviews tab in <Comments />.
const SALE_ITEM: SaleItem = {
  name: "Louis Vuitton Folding Metal Living Room Chair",
  price: "$1230.79",
  sold: "2,432",
};

const MOCK_REVIEWS: Review[] = [
  {
    id: "r1",
    profileSrc: "/dummy/profile_image_06.avif",
    author: "Priya Nair",
    variant: "Raspberry red",
    rating: 5,
    text: "Stacks a dozen into a single trolley footprint. Cleared our banquet hall in minutes.",
    images: ["/dummy/chair_raspberry_red.avif", "/dummy/chair_raspberry_red02.avif"],
    postedAt: "3 days ago",
    location: "Pune, IN",
    likes: "156",
    verified: true,
    replyList: [
      {
        id: "r1r1",
        profileSrc: "/dummy/profile_image_02.avif",
        author: "Guangdong Puda",
        replyingTo: "Priya Nair",
        postedAt: "2 days ago",
        location: "Guangdong, CN",
        text: "Appreciate the review! The flat-fold geometry is built exactly for that.",
        likes: "9",
      },
    ],
  },
  {
    id: "r2",
    profileSrc: "/dummy/profile_image_07.avif",
    author: "Marcus Lee",
    variant: "Sea blue",
    rating: 4,
    text: "Powder coat finish held up after months of daily café use. No rust, no wobble.",
    images: ["/dummy/chair_sea_blue.avif"],
    postedAt: "1 week ago",
    location: "Singapore, SG",
    likes: "88",
    verified: true,
  },
];

// Comment thread surface. Bottom sheet on mobile, centered modal on desktop —
// mirrors the ShareSheet shell on the watch screen. Dismiss on backdrop tap,
// Escape, or the X. Body scrolls; background scroll is locked while open.
export default function CommentSheet({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close comments"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40"
      />

      <div
        ref={panelRef}
        aria-label="Comments"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 flex-row items-center gap-4 px-4 py-3">
          <h2 className="flex-1 text-base font-medium">Comments</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Comments
            count="1.1k"
            comments={MOCK_COMMENTS}
            saleItem={SALE_ITEM}
            reviews={MOCK_REVIEWS}
            className="rounded-none border-0"
          />
        </div>
      </div>
    </>
  );
}
