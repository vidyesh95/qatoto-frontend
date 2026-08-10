// TRANSPORT: client-query — reads `/community/forum/threads/mine`.
"use client";

// `/store/forum/mine`. The author's own threads, INCLUDING the ones nobody else can see.
//
// WHY THIS PAGE EXISTS AT ALL, because it looks like a convenience and is not. A new thread comes
// back `pending_review` and appears in no public read. Without this page the create response is
// the last thing an author ever sees of their own question — and a REJECTION is invisible too,
// because a rejected thread STAYS `pending_review`. It just gains a moderation timestamp and a
// note. §17.3 calls `/mine` non-optional for exactly that reason.
//
// THE ONE THING THIS PAGE MUST GET RIGHT is telling those two apart:
//
//   · `pending_review` + `moderatedAt: null`   → still queued, nobody has looked
//   · `pending_review` + `moderatedAt` set     → NOT PUBLISHED, and the note says why
//
// Collapsing them into "waiting for review" tells somebody their thread is coming when it never
// will. `describeOwnForumThreadState` is the single place that pairing becomes words, so no
// component reimplements it and gets it backwards.

import Link from "next/link";

import {
  StoreEmptyPanel,
  StoreErrorPanel,
  StoreSignInRequiredPanel,
} from "@/components/home/store/shared/store-status-panel";
import WorkQueueSkeleton from "@/components/home/store/skeletons/work-queue-skeleton";
import { useOwnForumThreadsQuery } from "@/hooks/store/forum";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";
import {
  describeOwnForumThreadState,
  FORUM_BOARD_LABELS,
  type OwnForumThread,
} from "@/lib/store/forum.schemas";

type OwnThreadsViewState =
  | { status: "loading" }
  | { status: "signInRequired"; message: string }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; threads: OwnForumThread[] };

export default function OwnForumThreadsPage() {
  const ownThreadsQuery = useOwnForumThreadsQuery();

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <nav className="pb-2 text-xs leading-4 text-[#6F7979]" aria-label="Breadcrumb">
          <Link href="/store/forum" className="hover:underline">
            Business forum
          </Link>
        </nav>
        <h1 className="font-serif text-xl font-semibold text-[#191C1C] md:text-2xl">
          Your threads
        </h1>
        <p className="mt-1 text-sm leading-5 text-[#6F7979]">
          Everything you have asked, including what is still waiting for review.
        </p>
      </header>

      <div className="px-4 pt-6 lg:px-6">{renderOwnThreads(toOwnThreadsViewState())}</div>
    </div>
  );

  function toOwnThreadsViewState(): OwnThreadsViewState {
    if (ownThreadsQuery.isPending) return { status: "loading" };
    // A thrown error is a transport that never resolved — distinct from a `success: false` payload.
    if (ownThreadsQuery.isError) {
      return { status: "error", message: "Your threads could not be loaded." };
    }
    const result = ownThreadsQuery.data;
    if (result === undefined) return { status: "loading" };
    if (!result.success) {
      // A 401 is the only code that earns a sign-in prompt. A 404 must never render one — the
      // backend answers 404 for "no such thing" and "not visible to you" with one code.
      if (result.error.code === "401") {
        return { status: "signInRequired", message: result.error.message };
      }
      return { status: "error", message: result.error.message };
    }
    if (result.data.items.length === 0) return { status: "empty" };
    return { status: "ready", threads: result.data.items };
  }
}

function renderOwnThreads(viewState: OwnThreadsViewState) {
  switch (viewState.status) {
    case "loading":
      return <WorkQueueSkeleton />;
    case "signInRequired":
      return <StoreSignInRequiredPanel message={viewState.message} />;
    case "error":
      return <StoreErrorPanel message={viewState.message} />;
    case "empty":
      return (
        <StoreEmptyPanel message="You have not asked anything yet. Start a thread from the forum index." />
      );
    case "ready":
      return (
        <ul className="space-y-3">
          {viewState.threads.map((thread) => (
            <li key={thread.id}>
              <OwnThreadCard thread={thread} />
            </li>
          ))}
        </ul>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function OwnThreadCard({ thread }: { thread: OwnForumThread }) {
  // A thread nobody else can read has nowhere to link to. `pending_review` answers 404 on the
  // public detail route even for its author, so linking would send them to a 404 page.
  const isPubliclyReadable = thread.state !== "pending_review";
  const wasNotPublished = thread.state === "pending_review" && thread.moderatedAt !== null;

  return (
    <article className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
      <p className="text-xs leading-4 text-[#6F7979]">
        {FORUM_BOARD_LABELS[thread.board]}
        {" · "}
        {describeOwnForumThreadState(thread)}
        {" · asked "}
        {formatIsoInstantLabel(thread.createdAt)}
      </p>

      <h2 className="mt-1 text-sm leading-5 font-medium text-[#191C1C]">
        {isPubliclyReadable ? (
          <Link href={`/store/forum/${thread.slug}`} className="hover:underline">
            {thread.title}
          </Link>
        ) : (
          thread.title
        )}
      </h2>

      <p className="mt-1 text-sm leading-5 text-[#6F7979]">{thread.excerpt}</p>

      {wasNotPublished &&
        thread.moderationNote !== null && (
          // NOT styled as an error. The author did nothing wrong by asking; a moderator decided the
          // board would not carry it, and the note is the actionable part.
          <div className="mt-2 rounded-lg bg-[#E0E3E3] px-3 py-2">
            <p className="text-xs leading-4 font-medium text-[#191C1C]">
              This was not published. Here is why:
            </p>
            <p className="mt-1 text-xs leading-4 text-[#4A6364]">{thread.moderationNote}</p>
          </div>
        )}

      {isPubliclyReadable && (
        <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
          {formatCountLabel(thread.replyCount)}
          {thread.replyCount === 1 ? " reply" : " replies"}
          {/* `null` is NOT "nobody helped" — it means nobody pressed the button. */}
          {thread.acceptedReplyId === null ? "" : " · you marked an answer"}
          {" · last activity "}
          {formatIsoInstantLabel(thread.lastActivityAt)}
        </p>
      )}
    </article>
  );
}
