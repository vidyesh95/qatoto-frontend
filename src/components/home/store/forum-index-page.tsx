// TRANSPORT: server-fetch — awaits `listForumThreads` and branches on the result.
//
// `/store/forum`. The business forum: six boards, one list, filtered server-side through the URL.
//
// WHAT THIS PAGE IS CAREFUL NOT TO SAY:
//
//  · A thread with `acceptedReplyId: null` IS NOT "unanswered". It means nobody pressed the accept
//    button, and plenty of threads with a dozen useful replies never get one. The row shows the
//    reply count and an "Answered" marker only when an accepted reply genuinely exists.
//  · An author with `authorOrganizationName: null` posts as an individual, and the row says so
//    rather than inventing a company. A reader weighing an answer about customs wants to know
//    whether it came from a broker.
//  · Nothing here is Qatoto's advice. The banner says it once, at the top, rather than repeating a
//    disclaimer on every row.

import Link from "next/link";

import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import CursorPageControl from "@/components/home/store/shared/cursor-page-control";
import {
  StoreEmptyFilteredPanel,
  StoreEmptyPanel,
  StoreErrorPanel,
} from "@/components/home/store/shared/store-status-panel";
import {
  buildFilterHref,
  readEnumParam,
  readSingleParam,
  type RawSearchParams,
} from "@/lib/filter-href";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";
import { FORUM_BOARD_LABELS, FORUM_BOARDS, type ForumThreadCard } from "@/lib/store/forum.schemas";
import { listForumThreads } from "@/lib/store/forum.api";

type ForumIndexViewState =
  | { status: "error"; message: string }
  | { status: "empty"; appliedFilterCount: number }
  | {
      status: "ready";
      threads: ForumThreadCard[];
      nextCursor: string | null;
      hasMore: boolean;
    };

export default async function ForumIndexPage({ searchParams }: { searchParams: RawSearchParams }) {
  const board = readEnumParam(searchParams, "board", FORUM_BOARDS);
  const requestedCursor = readSingleParam(searchParams, "cursor");

  const result = await listForumThreads({ board, cursor: requestedCursor });
  const appliedFilterCount = board === undefined ? 0 : 1;

  const viewState: ForumIndexViewState = !result.success
    ? { status: "error", message: result.error.message }
    : result.data.items.length === 0
      ? { status: "empty", appliedFilterCount }
      : {
          status: "ready",
          threads: result.data.items,
          nextCursor: result.data.page.nextCursor,
          hasMore: result.data.page.hasMore,
        };

  const boardOptions: FilterChipOption[] = [
    {
      label: "All boards",
      href: buildFilterHref(searchParams, { board: undefined }),
      isSelected: board === undefined,
    },
    ...FORUM_BOARDS.map((boardValue) => ({
      label: FORUM_BOARD_LABELS[boardValue],
      href: buildFilterHref(searchParams, { board: boardValue }),
      isSelected: board === boardValue,
    })),
  ];

  return (
    <div className="pb-8">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">
          Business forum
        </h1>
        <p className="mt-1 text-sm leading-5 text-[#6F7979]">
          Sourcing, customs, compliance, payments and manufacturing — asked and answered by people
          who have already shipped it.
        </p>
        {/* SAID ONCE, AT THE TOP. Replies here are other businesses talking, not Qatoto advising,
            and a platform that stayed silent about that would be implying the opposite. */}
        <p className="mt-2 rounded-lg bg-[#F2F4F4] px-3 py-2 text-xs leading-4 text-[#6F7979]">
          Answers come from other members. Qatoto does not verify them and none of this is legal,
          customs or financial advice.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 lg:px-6">
        <Link
          href="/store/forum/new"
          className="shrink-0 rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Ask a question
        </Link>
      </div>

      <div className="px-4 pt-3 lg:px-6">
        <FilterChipRow options={boardOptions} ariaLabel="Filter threads by board" />
      </div>

      {renderForumIndex(viewState, searchParams)}
    </div>
  );
}

function renderForumIndex(viewState: ForumIndexViewState, searchParams: RawSearchParams) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "empty":
      return (
        <div className="px-4 pt-6 lg:px-6">
          {viewState.appliedFilterCount > 0 ? (
            <StoreEmptyFilteredPanel
              appliedFilterCount={viewState.appliedFilterCount}
              clearFiltersHref="/store/forum"
            />
          ) : (
            <StoreEmptyPanel message="No threads have been published yet." />
          )}
        </div>
      );
    case "ready":
      return (
        <>
          <ul className="mt-4 space-y-3 px-4 lg:px-6">
            {viewState.threads.map((thread) => (
              <li key={thread.id}>
                <ForumThreadRow thread={thread} />
              </li>
            ))}
          </ul>
          <CursorPageControl
            nextCursor={viewState.nextCursor}
            hasMore={viewState.hasMore}
            buildCursorHref={(cursor) => buildFilterHref(searchParams, { cursor })}
            label="Show more threads"
          />
        </>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function ForumThreadRow({ thread }: { thread: ForumThreadCard }) {
  return (
    <Link
      href={`/store/forum/${thread.slug}`}
      className="block rounded-xl border border-[#CAC4D0]/60 px-4 py-3 transition-colors hover:border-[#2A76FD]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#D6E3FF] px-2 py-0.5 text-[11px] leading-4 font-medium text-[#00696E]">
          {FORUM_BOARD_LABELS[thread.board]}
        </span>
        {/* Only a thread with a real accepted reply is marked answered. `acceptedReplyId === null`
            renders nothing at all — not "unanswered", which would tell readers to skip the replies
            that are there. */}
        {thread.acceptedReplyId !== null && (
          <span className="rounded-full bg-[#00696E]/10 px-2 py-0.5 text-[11px] leading-4 font-medium text-[#00696E]">
            Answered
          </span>
        )}
        {thread.state === "locked" && (
          <span className="rounded-full bg-[#E0E3E3] px-2 py-0.5 text-[11px] leading-4 font-medium text-[#4A6364]">
            Locked
          </span>
        )}
      </div>

      <p className="mt-1.5 text-sm leading-5 font-medium text-[#191C1C]">{thread.title}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-4 text-[#6F7979]">{thread.excerpt}</p>

      <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
        {thread.authorDisplayName}
        {/* Null is a real answer here: this person posted as themselves, not on behalf of a company. */}
        {thread.authorOrganizationName === null
          ? " · posting as an individual"
          : ` · ${thread.authorOrganizationName}`}
        {" · "}
        {thread.replyCount === 0
          ? "no replies yet"
          : `${formatCountLabel(thread.replyCount)} ${thread.replyCount === 1 ? "reply" : "replies"}`}
        {" · last activity "}
        {formatIsoInstantLabel(thread.lastActivityAt)}
      </p>
    </Link>
  );
}
