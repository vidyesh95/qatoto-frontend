"use client";

import Image from "next/image";
import { useState } from "react";

import type { ImmortalIdea } from "@/types/research-and-development";

import { IdeaReplyItem } from "./idea-reply-item";

export function IdeaItem({ idea }: { idea: ImmortalIdea }) {
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
