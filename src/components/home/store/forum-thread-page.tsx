// TRANSPORT: server-fetch — awaits `getForumThread` and branches on the result.
//
// `/store/forum/:threadSlug`. One question, its replies, and the accepted answer pinned if there is
// one.
//
// THREE THINGS THE RENDER IS DELIBERATE ABOUT:
//
//  1. THE ACCEPTED REPLY IS PINNED AND ALSO LEFT IN PLACE. Hoisting it out of the sequence would
//     break the conversation — most accepted answers are replies to something, and reading them
//     first makes the thread incoherent. So it appears at the top as a summary and again in order,
//     marked in both places.
//  2. THE CONVERSATION IS A CLIENT ISLAND AND THIS FILE IS NOT. Replying, endorsing, accepting an
//     answer and reporting are all session-scoped writes, so they live in
//     `forum/forum-thread-conversation.tsx`. The question itself stays a server render, because it
//     is public text a signed-out visitor should get without shipping a mutation bundle to read it.
//  3. A 404 IS A 404. A thread awaiting moderation answers 404 to everyone but its author, so this
//     page must never render "awaiting moderation" from a failed read — that would tell a stranger
//     the thread exists.

import Link from "next/link";
import { notFound } from "next/navigation";

import ForumThreadConversation from "@/components/home/store/forum/forum-thread-conversation";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import { formatIsoInstantLabel } from "@/lib/store/format";
import {
  FORUM_BOARD_LABELS,
  type ForumReply,
  type ForumThreadDetail,
} from "@/lib/store/forum.schemas";
import { getForumThread } from "@/lib/store/forum.api";

type ForumThreadViewState =
  | { status: "error"; message: string }
  | { status: "ready"; detail: ForumThreadDetail };

export default async function ForumThreadPage({ threadSlug }: { threadSlug: string }) {
  const result = await getForumThread(threadSlug);

  if (!result.success && result.error.code === "404") notFound();

  const viewState: ForumThreadViewState = result.success
    ? { status: "ready", detail: result.data }
    : { status: "error", message: result.error.message };

  return <div className="pb-10">{renderForumThread(viewState)}</div>;
}

function renderForumThread(viewState: ForumThreadViewState) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "ready":
      return <ForumThreadBody detail={viewState.detail} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function ForumThreadBody({ detail }: { detail: ForumThreadDetail }) {
  const { thread, replies } = detail;
  // A HIDDEN REPLY IS NEVER PINNED, even if it is the accepted one. Moderation and acceptance are
  // independent acts and can disagree — a moderator hides an answer the author had already
  // marked — and the pinned card is the one place a hidden body would be reproduced in full.
  const acceptedReply =
    thread.acceptedReplyId === null
      ? null
      : (replies.items.find(
          (reply) => reply.id === thread.acceptedReplyId && reply.visibilityState === "visible",
        ) ?? null);

  return (
    <article className="mx-auto w-full max-w-3xl">
      <header className="px-4 pt-4 lg:px-6">
        <nav className="pb-2 text-xs leading-4 text-[#6F7979]" aria-label="Breadcrumb">
          <Link href="/store/forum" className="hover:underline">
            Business forum
          </Link>
          <span aria-hidden="true"> / </span>
          <Link href={`/store/forum?board=${thread.board}`} className="hover:underline">
            {FORUM_BOARD_LABELS[thread.board]}
          </Link>
        </nav>

        <h1 className="font-serif text-xl font-semibold text-[#191C1C] md:text-2xl">
          {thread.title}
        </h1>

        <p className="mt-1 text-xs leading-4 text-[#6F7979]">
          {thread.authorDisplayName}
          {thread.authorOrganizationName === null
            ? " · posting as an individual"
            : ` · ${thread.authorOrganizationName}`}
          {" · asked "}
          {formatIsoInstantLabel(detail.createdAt)}
        </p>

        {thread.state === "locked" && (
          <p className="mt-2 rounded-lg bg-[#E0E3E3] px-3 py-2 text-xs leading-4 text-[#4A6364]">
            This thread is locked. It stays readable; nobody can add to it.
          </p>
        )}

        {/* `whitespace-pre-line` renders the paragraph breaks the body carries. It is plain text on
            the wire, never HTML — a forum that renders member-supplied markup on a commerce domain
            is a stored-XSS surface, and the backend has no sanitiser to lean on. */}
        <p className="mt-3 text-sm leading-6 whitespace-pre-line text-[#191C1C]">{detail.body}</p>
      </header>

      {acceptedReply !== null && (
        <section className="px-4 pt-6 lg:px-6" aria-label="Accepted answer">
          <h2 className="pb-2 text-sm font-medium tracking-wide text-[#191C1C]">
            Answer accepted by the author
          </h2>
          <ReplyCard reply={acceptedReply} isAccepted />
        </section>
      )}

      {/* Replies, and every control over them, from here down. */}
      <ForumThreadConversation detail={detail} />
    </article>
  );
}

/**
 * The pinned copy of the accepted answer, rendered on the server.
 *
 * READ-ONLY ON PURPOSE. The interactive copy of this reply is in the conversation island below,
 * in its place in the sequence — pinning it here is a summary, and putting an endorse button in
 * two places for one reply would let a reader press the same toggle twice and watch it fight
 * itself.
 */
function ReplyCard({ reply, isAccepted }: { reply: ForumReply; isAccepted: boolean }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        isAccepted ? "border-[#00696E]/50 bg-[#00696E]/5" : "border-[#CAC4D0]/60"
      }`}
    >
      <p className="text-xs leading-4 text-[#6F7979]">
        {reply.authorDisplayName}
        {reply.authorOrganizationName === null
          ? " · posting as an individual"
          : ` · ${reply.authorOrganizationName}`}
        {" · "}
        {formatIsoInstantLabel(reply.createdAt)}
      </p>
      <p className="mt-1.5 text-sm leading-6 whitespace-pre-line text-[#191C1C]">{reply.body}</p>
    </div>
  );
}
