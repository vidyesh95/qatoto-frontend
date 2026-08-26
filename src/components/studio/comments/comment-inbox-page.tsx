// TRANSPORT: client-query — `GET /users/me/video-comments`.
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import StatusPanel from "@/components/home/shared/status-panel";
import RelativeTime from "@/components/home/shared/relative-time";
import { useCreatorInboxCommentsQuery } from "@/hooks/videos/creator-analytics";
import type { CreatorInboxComment } from "@/lib/videos/comment-inbox.schemas";

/**
 * Every comment across the creator's own videos, in one place.
 *
 * THIS ADDS NO POWER, ONLY SIGHT. Deleting a comment on your own video has always been permitted;
 * what did not exist was any way to find one without opening each video's thread in turn. So there
 * is no new control here and no new moderation state — deliberately. The platform has no
 * hold-and-approve queue, and pretending otherwise on this page would imply a workflow the backend
 * does not have.
 *
 * REPLIES ARE HERE TOO, and that is the reason the read needed its own database index: the public
 * thread's index covers top-level comments only, so an inbox built on it would have shown a
 * fraction of the comments and called it all of them.
 *
 * KEYSET PAGING, FORWARD ONLY. The server hands back a cursor or null; this never builds one. A
 * fabricated cursor is a 422 rather than a silent restart showing duplicates — which is why there
 * is no "previous" control, and a stack of seen cursors would be the honest way to add one later.
 */
export default function CommentInboxPage() {
  const [cursor, setCursor] = useState<string | null>(null);
  const inboxQuery = useCreatorInboxCommentsQuery(cursor);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">Comments</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every comment on your videos, newest first. Open one to reply or remove it — removing is
        done from the video&apos;s own thread, where the reader sees it.
      </p>

      {inboxQuery.isPending ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : inboxQuery.error !== null ? (
        <div className="mt-6">
          <StatusPanel message="Couldn't load your comments. Please try again." />
        </div>
      ) : inboxQuery.data.rows.length === 0 ? (
        // AN EMPTY INBOX IS NOT AN ERROR, and on a new channel it is the expected state.
        <p className="mt-6 text-sm text-muted-foreground">
          {cursor === null
            ? "No comments on your videos yet."
            : "No more comments — you have reached the end."}
        </p>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {inboxQuery.data.rows.map((comment) => (
              <InboxRow key={comment.commentId} comment={comment} />
            ))}
          </ul>

          {inboxQuery.data.nextCursor !== null && (
            <button
              type="button"
              onClick={() => {
                setCursor(inboxQuery.data.nextCursor);
              }}
              className="mt-4 cursor-pointer rounded-full border border-border px-4 py-1.5 text-xs"
            >
              Load older
            </button>
          )}
        </>
      )}
    </div>
  );
}

function InboxRow({ comment }: { readonly comment: CreatorInboxComment }) {
  return (
    <li className="rounded-2xl border border-border p-3">
      <div className="flex items-center gap-2">
        {/*
          A NULL AUTHOR IS A REAL ROW, not a broken one — the account was deleted and the comment
          outlived it. Naming that beats a blank space, and beats dropping the comment entirely
          from a creator's own inbox.
        */}
        {comment.author?.imageUrl != null ? (
          <Image
            src={comment.author.imageUrl}
            width={24}
            height={24}
            alt=""
            className="size-6 rounded-full"
          />
        ) : (
          <span className="size-6 rounded-full bg-muted" />
        )}
        <span className="text-sm font-medium text-foreground">
          {comment.author?.name ?? "Deleted account"}
        </span>
        {comment.parentCommentId !== null && (
          <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground">
            Reply
          </span>
        )}
        <RelativeTime isoInstant={comment.createdAt} className="text-xs text-muted-foreground" />
      </div>

      <p className="mt-2 text-sm whitespace-pre-wrap text-foreground">{comment.body}</p>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          {comment.likeCount} {comment.likeCount === 1 ? "like" : "likes"}
        </span>
        {comment.replyCount > 0 && (
          <span>
            {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
          </span>
        )}
        <Link
          href={`/watch?v=${encodeURIComponent(comment.video.videoId)}`}
          className="truncate text-foreground underline"
        >
          on {comment.video.title}
        </Link>
      </div>
    </li>
  );
}
