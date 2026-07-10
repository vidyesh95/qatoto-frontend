"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import type { ImmortalInformalPost } from "@/types/research-and-development";

const VIEWER_AVATAR_SRC = "/dummy/profile_image_09.avif";

type ProjectImmortalInformalPostsProps = {
  initialPosts: ImmortalInformalPost[];
};

// The informal track: research ideas written like blog posts, with no proofs or
// citations required. Publishing prepends to the local list — nothing persists.
export default function ProjectImmortalInformalPosts({
  initialPosts,
}: ProjectImmortalInformalPostsProps) {
  const [posts, setPosts] = useState<ImmortalInformalPost[]>(initialPosts);
  const [draftPostTitle, setDraftPostTitle] = useState("");
  const [draftPostBodyText, setDraftPostBodyText] = useState("");

  const handleInformalPostFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPostTitle = draftPostTitle.trim();
    const trimmedPostBodyText = draftPostBodyText.trim();
    if (!trimmedPostTitle || !trimmedPostBodyText) return;

    setPosts((currentPosts) => [
      {
        id: `informal-${Date.now()}`,
        title: trimmedPostTitle,
        authorName: "You",
        authorAvatarSrc: VIEWER_AVATAR_SRC,
        postedAtLabel: "Just now",
        bodyText: trimmedPostBodyText,
        reactionCountLabel: "0",
        replyCountLabel: "0",
        isPostedByViewer: true,
      },
      ...currentPosts,
    ]);
    setDraftPostTitle("");
    setDraftPostBodyText("");
  };

  return (
    <div className="max-w-3xl space-y-4 px-4 lg:px-6">
      <p className="text-sm text-muted-foreground">
        Blog-style research ideas — no proofs or citations needed. Half-formed thinking is welcome
        here; the formal library is upstairs.
      </p>

      <form
        onSubmit={handleInformalPostFormSubmit}
        className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4"
      >
        <input
          type="text"
          value={draftPostTitle}
          onChange={(event) => setDraftPostTitle(event.target.value)}
          placeholder="Give your idea a title"
          aria-label="Informal paper title"
          className="w-full rounded-xl border border-[#6F7979] px-3 py-2 text-sm outline-none focus-visible:border-[#00696E] focus-visible:ring-2 focus-visible:ring-[#00696E]"
        />
        <textarea
          rows={3}
          value={draftPostBodyText}
          onChange={(event) => setDraftPostBodyText(event.target.value)}
          placeholder="Share your thinking — hunches and half-formed ideas welcome"
          aria-label="Informal paper body"
          className="w-full rounded-xl border border-[#6F7979] px-3 py-2 text-sm outline-none focus-visible:border-[#00696E] focus-visible:ring-2 focus-visible:ring-[#00696E]"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C]"
          >
            Publish informal paper
          </button>
        </div>
      </form>

      <ul className="space-y-3">
        {posts.map((post) => (
          <li key={post.id} className="rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
            <div className="flex items-center gap-2">
              <Image
                src={post.authorAvatarSrc}
                width={32}
                height={32}
                alt={post.authorName}
                className="size-8 rounded-full object-cover"
              />
              <p className="text-xs font-medium">{post.authorName}</p>
              {post.isPostedByViewer && (
                <span className="rounded-full bg-[#00696E]/10 px-2 py-0.5 text-[10px] text-[#00696E]">
                  You
                </span>
              )}
              <p className="text-xs text-muted-foreground">· {post.postedAtLabel}</p>
            </div>
            <p className="mt-2 text-sm font-medium">{post.title}</p>
            <p className="mt-1 line-clamp-3 text-sm leading-snug text-muted-foreground">
              {post.bodyText}
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <button
                type="button"
                aria-label={`React to ${post.title}`}
                className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Image
                  src="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  width={16}
                  height={16}
                  alt=""
                />
                {post.reactionCountLabel}
              </button>
              <button
                type="button"
                aria-label={`Reply to ${post.title}`}
                className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Image
                  src="/icons/forum_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  width={16}
                  height={16}
                  alt=""
                />
                {post.replyCountLabel}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
