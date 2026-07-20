import Image from "next/image";

import type { ImmortalIdeaReply } from "@/types/research-and-development";

export function IdeaReplyItem({ reply }: { reply: ImmortalIdeaReply }) {
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
