"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import type { ImmortalIdea, ImmortalIdeaReply } from "@/types/research-and-development";

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

function IdeaItem({ idea }: { idea: ImmortalIdea }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasReplies = idea.replies.length > 0;

  return (
    <li className="flex flex-row gap-3 py-3">
      <Image
        src={idea.authorAvatarSrc}
        width={32}
        height={32}
        alt={idea.authorName}
        className="size-8 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{idea.authorName}</p>
        <p className="mt-1 text-sm leading-snug">{idea.ideaText}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {idea.postedAtLabel} · {idea.authorLocation}
        </p>

        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <button
            type="button"
            aria-label={`Like this idea from ${idea.authorName}`}
            className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Image
              src="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={16}
              height={16}
              alt=""
            />
            {idea.likeCountLabel}
          </button>
          <button
            type="button"
            aria-label={`Reply to ${idea.authorName}`}
            className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Image
              src="/icons/reply_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              width={16}
              height={16}
              alt=""
            />
            Reply
          </button>
        </div>

        {hasReplies && isExpanded && (
          <ul className="mt-2 pl-4">
            {idea.replies.map((reply) => (
              <IdeaReplyItem key={reply.id} reply={reply} />
            ))}
          </ul>
        )}

        {hasReplies && (
          <button
            type="button"
            onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
            aria-expanded={isExpanded}
            className="mt-2 flex cursor-pointer flex-row items-center gap-2 text-xs text-[#6F7979] hover:text-foreground"
          >
            <span className="h-px w-6 bg-[#D5DBDB]" />
            {isExpanded ? "Collapse" : `Expand ${idea.replies.length} replies`}
            <Image
              src={
                isExpanded
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

function IdeaReplyItem({ reply }: { reply: ImmortalIdeaReply }) {
  return (
    <li className="flex flex-row gap-3 py-2">
      <Image
        src={reply.authorAvatarSrc}
        width={28}
        height={28}
        alt={reply.authorName}
        className="size-7 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{reply.authorName}</p>
        <p className="mt-1 text-sm leading-snug">{reply.replyText}</p>
        <p className="mt-1 text-xs text-muted-foreground">{reply.postedAtLabel}</p>
        <button
          type="button"
          aria-label={`Like this reply from ${reply.authorName}`}
          className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Image
            src="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={14}
            height={14}
            alt=""
          />
          {reply.likeCountLabel}
        </button>
      </div>
    </li>
  );
}
