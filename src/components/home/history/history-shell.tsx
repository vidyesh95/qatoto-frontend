// TRANSPORT: server-fetch — reads page one of `?mode=watched` with the caller's cookie
// forwarded, then hands it to the client island as a seed.
//
// THE 401 BRANCH IS THE POINT OF THIS FILE. `/history` is the one surface where a signed-out
// reader must be offered a sign-in control rather than an error: the backend refuses to serve
// watch history to an anonymous viewer, because it identifies them by a fingerprint that is
// shared by everyone behind the same NAT. Every other feed read answers anonymous callers a
// real page, so this branch exists nowhere else except `feed-shell.tsx`'s copy of it.

import { FeedErrorPanel, FeedSignInRequiredPanel } from "@/components/home/feed/feed-status-panel";
import { describeFeedError } from "@/components/home/feed/feed-status-panel";
import ClearWatchHistoryControl from "@/components/home/history/clear-watch-history-control";
import HistoryList from "@/components/home/history/history-list";
import { listFeedVideos } from "@/lib/feed/api";
import type { FeedVideoPage } from "@/lib/feed/schemas";
import { isUnauthorized, type ActionResponse } from "@/lib/http";
import { callerRequestOptions } from "@/lib/server-http";

/** The backend's own default, restated so the seed and every later page agree on it. */
const HISTORY_PAGE_LIMIT = 24;

/**
 * No `loading` variant, matching `@/lib/view-state`: this is a server component that awaits its
 * data before rendering at all, so loading is the `<Suspense>` boundary above it.
 */
type HistoryViewState =
  | { readonly status: "sign_in_required"; readonly message: string }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly page: FeedVideoPage };

function toHistoryViewState(result: ActionResponse<FeedVideoPage>): HistoryViewState {
  if (result.success) return { status: "ready", page: result.data };
  // UNGATED ON MODE, unlike `feed-shell.tsx` — every read this component makes IS
  // `mode=watched`, so there is no other request a 401 could be about.
  if (isUnauthorized(result.error)) {
    return { status: "sign_in_required", message: "Sign in to see what you've watched." };
  }
  return { status: "error", message: describeFeedError(result.error) };
}

export default async function HistoryShell() {
  const requestOptions = await callerRequestOptions();
  const historyState = toHistoryViewState(
    await listFeedVideos({ mode: "watched", limit: HISTORY_PAGE_LIMIT }, requestOptions),
  );

  const heading = (
    <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-8 lg:px-6">
      <h1 className="text-xl font-medium">Watch history</h1>
      {/*
        STATED, NOT IMPLIED. The backend deletes view sessions at 90 days, so a page that lets
        a reader believe this list is permanent is telling them something false about their own
        data — and they only find out when a video they were looking for is not here.
      */}
      <p className="text-xs text-[#6F7979]">Kept for 90 days.</p>
    </div>
  );

  // Exhaustive switch with a `never` default (CLAUDE.md Pattern 1).
  switch (historyState.status) {
    case "sign_in_required":
      return (
        <>
          {heading}
          <section className="py-8">
            <FeedSignInRequiredPanel message={historyState.message} />
          </section>
        </>
      );
    case "error":
      return (
        <>
          {heading}
          <section className="py-8">
            <FeedErrorPanel message={historyState.message} />
          </section>
        </>
      );
    case "ready":
      return (
        <>
          {heading}
          {/*
            Rendered only on the ready branch: there is nothing to clear behind a sign-in wall,
            and offering the control next to an error panel invites a destructive click against
            a list the reader cannot currently see.
          */}
          {historyState.page.data.length > 0 && (
            <div className="px-4 pt-4 lg:px-6">
              <ClearWatchHistoryControl />
            </div>
          )}
          <section className="pb-8">
            <HistoryList initialPage={historyState.page} limit={HISTORY_PAGE_LIMIT} />
          </section>
        </>
      );
    default: {
      const exhaustiveCheck: never = historyState;
      return exhaustiveCheck;
    }
  }
}
