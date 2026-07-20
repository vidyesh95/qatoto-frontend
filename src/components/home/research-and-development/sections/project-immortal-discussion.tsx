"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import type { ImmortalIdea } from "@/types/research-and-development";

import { IdeaItem } from "./idea-item";

const VIEWER_AVATAR_SRC = "/dummy/profile_image_09.avif";

type ProjectImmortalDiscussionProps = {
  initialIdeas: ImmortalIdea[];
};

// Open discussion where netizens post individual ideas for increasing human
// lifespan. Posting prepends locally; likes and replies are display-only.
export default function ProjectImmortalDiscussion({
  initialIdeas,
}: ProjectImmortalDiscussionProps) {
  const [ideas, setIdeas] = useState<ImmortalIdea[]>(initialIdeas);
  const [draftIdeaText, setDraftIdeaText] = useState("");

  const handleIdeaFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedIdeaText = draftIdeaText.trim();
    if (!trimmedIdeaText) return;

    setIdeas((currentIdeas) => [
      {
        id: `idea-${Date.now()}`,
        authorName: "You",
        authorAvatarSrc: VIEWER_AVATAR_SRC,
        authorLocation: "Qatoto netizen",
        postedAtLabel: "Just now",
        ideaText: trimmedIdeaText,
        likeCountLabel: "0",
        replies: [],
      },
      ...currentIdeas,
    ]);
    setDraftIdeaText("");
  };

  return (
    <div className="max-w-3xl space-y-4 px-4 lg:px-6">
      <p className="text-sm text-muted-foreground">
        {ideas.length} ideas from netizens on extending healthy human life
      </p>

      <form onSubmit={handleIdeaFormSubmit} className="flex items-center gap-3">
        <Image
          src={VIEWER_AVATAR_SRC}
          width={32}
          height={32}
          alt=""
          className="size-8 shrink-0 rounded-full object-cover"
        />
        <input
          type="text"
          value={draftIdeaText}
          onChange={(event) => setDraftIdeaText(event.target.value)}
          placeholder="Share your idea for increasing human lifespan…"
          aria-label="Your idea"
          className="min-w-0 flex-1 rounded-full border border-[#6F7979] px-4 py-2.5 text-sm outline-none focus-visible:border-[#00696E] focus-visible:ring-2 focus-visible:ring-[#00696E]"
        />
        <button
          type="submit"
          aria-label="Post idea"
          className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[#00696E] transition-colors hover:bg-[#00393C]"
        >
          <Image
            src="/icons/send_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
            width={20}
            height={20}
            alt=""
          />
        </button>
      </form>

      <ul>
        {ideas.map((idea) => (
          <IdeaItem key={idea.id} idea={idea} />
        ))}
      </ul>
    </div>
  );
}
