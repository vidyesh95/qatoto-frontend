// TRANSPORT: props-only — the thread arrives from `listShowcaseComments` on the detail page.
//
// A SERVER COMPONENT WITH NO CONTROLS AT ALL. Not one element here is a `<button>`, an `<input>` or
// a `<Link>`: no composer, no reply affordance, no vote arrow. That is the same refusal
// `ShowcaseVoteBox` and `BlueprintStatReadout` state at length — there is no blueprints content
// table, every engagement table in the backend is hard-FK'd to `video.id` or `product.id`, and every
// route param is `z.uuid()`-gated so a kebab slug 422s before a query runs. A reply box here would
// collect text with nowhere to send it, which is worse than not offering one.
//
// ⚠️ ONE LEVEL OF NESTING, AND A DEEPER TREE IS NOT A MISSING FEATURE. Hacker News nests without
// limit; the backend this will eventually read from does not — `video-comment-thread.tsx:132`
// records it as "One level only — the backend 409s a reply on a reply". Building the deep renderer
// now would produce a component the real endpoint cannot feed, which is precisely the `/anime`
// mistake CLAUDE.md documents. `BlueprintComment` therefore carries no `depth` field and this file
// has no recursion in it.
//
// ⚠️ THE TOMBSTONE RENDERS AHEAD OF THE DELETE ROUTE THAT WILL CREATE ONE, deliberately. `body` and
// `author` are both `null` on a deleted comment and the row SURVIVES so its replies keep their
// anchor; that layout is the one thing the eventual backend cannot change its mind about, because
// dropping the node would orphan replies the server still returns. The fixtures carry one so the
// shape is exercised rather than assumed. There is no composer and no delete control here, so
// nothing on this page can produce a tombstone — it arrives in the data or not at all.
//
// THE COUNT IS NOT RENDERED HERE. `showcase.commentCount` renders in the launch byline, as a link to
// this section's `#discussion` anchor; a second copy over the thread would be two numbers that could
// disagree.

import Image from "next/image";

import LinkedPlainText from "@/components/home/shared/linked-plain-text";
import RelativeTime from "@/components/home/shared/relative-time";
import type { BlueprintComment } from "@/lib/blueprints/schemas";
import { formatCompactCountLabel } from "@/lib/feed/format";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";

interface CommentThreadGroup {
  readonly topLevelComment: BlueprintComment;
  readonly replies: readonly BlueprintComment[];
}

/**
 * Bucket the flat ordered list into one group per top-level comment.
 *
 * `listShowcaseComments` emits a parent immediately followed by its own replies, so this is a single
 * pass rather than an index. A reply whose `parentCommentId` does not match the group it lands in is
 * DROPPED rather than attached — showing an answer under the wrong question is worse than showing
 * one comment fewer, and the getter already discards orphans for the same reason.
 */
function groupIntoThreads(comments: readonly BlueprintComment[]): CommentThreadGroup[] {
  const groups: { topLevelComment: BlueprintComment; replies: BlueprintComment[] }[] = [];

  for (const comment of comments) {
    if (comment.parentCommentId === null) {
      groups.push({ topLevelComment: comment, replies: [] });
      continue;
    }

    const openGroup = groups.at(-1);
    if (
      openGroup === undefined ||
      openGroup.topLevelComment.commentId !== comment.parentCommentId
    ) {
      continue;
    }
    openGroup.replies.push(comment);
  }

  return groups;
}

/**
 * One comment. `isReply` only shrinks the avatar — the row is otherwise identical, because a reply
 * is the same kind of thing as the comment above it and the indent already says where it sits.
 */
function BlueprintCommentRow({
  comment,
  isReply = false,
}: {
  readonly comment: BlueprintComment;
  readonly isReply?: boolean;
}) {
  const avatarSizePx = isReply ? 20 : 24;

  // A TOMBSTONE. The row survives so its replies keep their anchor — that is the entire reason a
  // backend tombstones instead of deleting, and a renderer that dropped the node here would orphan
  // replies the server still returns. It renders as one grey line and NOTHING else: no avatar, no
  // byline, no like count. Attributing a comment nobody is allowed to read is worse than silence,
  // and a like count on it is a number about text that is gone. This matches
  // `video-comment-thread.tsx:224`, which is the same decision against a real backend.
  if (comment.body === null || comment.author === null) {
    return (
      <p className={`${isReply ? "text-[11px]" : "text-xs"} text-[#6F7979] italic`}>[deleted]</p>
    );
  }

  return (
    <div className="flex gap-2.5">
      <Image
        src={comment.author.avatarUrl}
        alt=""
        width={avatarSizePx}
        height={avatarSizePx}
        className={`${isReply ? "size-5" : "size-6"} mt-0.5 shrink-0 rounded-full object-cover`}
      />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#6F7979]">
          <span className="font-medium text-[#00696E]">@{comment.author.handle}</span>
          {/* The byline pattern this page already uses: relative in the text, the absolute instant
              in the tooltip. */}
          <span title={formatIsoInstantLabel(comment.createdAt)}>
            <RelativeTime isoInstant={comment.createdAt} />
          </span>
          <span aria-hidden="true">·</span>
          {/* Display only, like every other count on this surface. A `<span>`, never a button — see
              the file header. Compact when visible, exact for a screen reader, the split
              `BlueprintStatReadout` uses. */}
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Image
              src="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={12}
              height={12}
              className="size-3 shrink-0 opacity-55"
            />
            <span aria-hidden="true">{formatCompactCountLabel(comment.likeCount)}</span>
            <span className="sr-only">{formatCountLabel(comment.likeCount)} likes</span>
          </span>
        </p>
        {/* Through the tokeniser, so a bare URL is clickable and an @handle reads as a person. The
            @mention is how a reply-to-a-reply is written on a one-level thread: the row is still a
            reply to the PARENT, and the handle says who it is answering. */}
        <p className="mt-1 text-sm leading-6 text-foreground">
          <LinkedPlainText text={comment.body} />
        </p>
      </div>
    </div>
  );
}

export default function BlueprintCommentThread({
  comments,
}: {
  readonly comments: readonly BlueprintComment[];
}) {
  const threadGroups = groupIntoThreads(comments);

  return (
    // `scroll-mt-20` keeps the heading clear of the 56px sticky navbar when the byline link jumps here.
    // NO TOP MARGIN: the page decides the gap above the thread, because what sits above it (the
    // reading column, or the rail on a narrow screen) changes with the layout.
    <section id="discussion" className="scroll-mt-20 border-t border-[#CAC4D0]/60 pt-6">
      <h2 className="text-sm font-medium text-foreground">Discussion</h2>
      {/* Without this line a thread with no composer reads as broken rather than as unbuilt, and a
          reader cannot tell which. It is the same disclosure the studio's `inert` dropzone makes. */}
      <p className="mt-1 text-[11px] text-[#6F7979]">
        Read-only for now. Commenting opens when blueprints are published for real.
      </p>

      {threadGroups.length === 0 ? (
        // An absence renders NOTHING but a line. A bordered empty box is the surface's stated
        // anti-pattern — the same reason a teardown with no `walkthroughVideo` renders no section.
        <p className="mt-4 text-sm text-[#6F7979]">No comments on this launch yet.</p>
      ) : (
        <ul className="mt-5 space-y-6">
          {threadGroups.map((group) => (
            <li key={group.topLevelComment.commentId}>
              <BlueprintCommentRow comment={group.topLevelComment} />
              {group.replies.length === 0 ? null : (
                // The one-level indent, matching `video-comment-thread.tsx:420` and
                // `research-post-item.tsx:296` — the repo's only two precedents for it.
                <ul className="mt-3 ml-3 space-y-4 border-l border-[#CAC4D0]/60 pl-4">
                  {group.replies.map((reply) => (
                    <li key={reply.commentId}>
                      <BlueprintCommentRow comment={reply} isReply />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
