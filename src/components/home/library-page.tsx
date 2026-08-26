// TRANSPORT: client-query — reads GET /playlists/mine and the three /users/me/* collections.
"use client";

// THE VIEWER'S OWN VIDEO COLLECTIONS. NOT A STORE SURFACE — the account menu links it beside
// History with a video-library icon, and it is about what you kept rather than what you bought.
//
// ALL FOUR TABS ARE REAL NOW. This page used to render playlists and a panel explaining that
// liked videos, watch later and subscriptions had NO ROUTES AT ALL — which was true and worth
// saying, because an empty "Liked videos" tab is indistinguishable from a viewer who has liked
// nothing. `GET /users/me/liked-videos`, `/saved-videos` and `/subscriptions` shipped, so the
// panel came down with them.
//
// THE THREE NEW TABS ARE KEYSET, THE PLAYLIST TAB IS NOT. Playlists are offset-paginated because
// that is what `/playlists/mine` answers; the other three hand back an opaque cursor. Nothing
// here constructs a token either way.
//
// NO COUNT IS RENDERED BESIDE "LIKED" OR "WATCH LATER", deliberately. The server drops rows whose
// video went private — the like survives, the card does not — so the number of rows on screen is
// NOT the number of things you liked, and there is no total on the wire to print instead. A count
// derived from `rows.length` would be quietly wrong for every viewer who ever liked a video that
// was later unpublished.

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import LoadMoreControl from "@/components/home/shared/load-more-control";
import StatusPanel from "@/components/home/shared/status-panel";
import { useLikedVideosQuery, useSavedVideosQuery, useSubscriptionsQuery } from "@/hooks/library";
import { useMyPlaylistsQuery } from "@/hooks/playlists";
import { formatCompactCountLabel, formatDurationLabel } from "@/lib/feed/format";
import type { LibraryVideoRow, SubscribedCreatorRow } from "@/lib/library/schemas";
import type { PlaylistListRow } from "@/lib/playlists/schemas";

const LIBRARY_TABS = [
  { id: "playlists", label: "Playlists" },
  { id: "liked", label: "Liked" },
  { id: "saved", label: "Watch later" },
  { id: "subscriptions", label: "Subscriptions" },
] as const;

type LibraryTabId = (typeof LIBRARY_TABS)[number]["id"];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTabId>("playlists");

  // EVERY TAB'S QUERY IS MOUNTED, not just the visible one. React Query dedupes and caches, so
  // switching tabs shows what is already in hand instead of a spinner per switch — and these are
  // four small session-scoped reads, not a feed.
  const playlistsQuery = useMyPlaylistsQuery();
  const likedVideosList = useLikedVideosQuery();
  const savedVideosList = useSavedVideosQuery();
  const subscriptionsList = useSubscriptionsQuery();

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">Library</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Everything you kept.{" "}
          <Link href="/history" className="underline">
            Watch history
          </Link>{" "}
          has its own page.
        </p>
      </header>

      <div className="mt-3 border-b border-border px-4 lg:px-6">
        <div className="flex scrollbar-none gap-1 overflow-x-auto" role="tablist">
          {LIBRARY_TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`relative cursor-pointer px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-t-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section
        aria-label={LIBRARY_TABS.find((tab) => tab.id === activeTab)?.label}
        className="mt-4 px-4 lg:px-6"
      >
        {activeTab === "playlists" && renderPlaylists(playlistsQuery)}
        {activeTab === "liked" && (
          <VideoCollection
            list={likedVideosList}
            emptyMessage="Nothing liked yet. The heart on any video puts it here."
            loadMoreLabel="Load more liked videos"
          />
        )}
        {activeTab === "saved" && (
          <VideoCollection
            list={savedVideosList}
            emptyMessage="Nothing saved yet. Save a video to watch it later."
            loadMoreLabel="Load more saved videos"
          />
        )}
        {activeTab === "subscriptions" && <SubscriptionCollection list={subscriptionsList} />}
      </section>
    </div>
  );
}

function renderPlaylists(playlistsQuery: ReturnType<typeof useMyPlaylistsQuery>) {
  if (playlistsQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading your playlists…</p>;
  }
  if (playlistsQuery.isError) {
    return (
      <StatusPanel
        message="Couldn't load your playlists."
        className="border border-border px-6 py-16"
      />
    );
  }

  const rows = playlistsQuery.data?.rows ?? [];
  if (rows.length === 0) {
    return (
      <StatusPanel
        message="No playlists yet. You can build one from any video."
        className="border border-border px-6 py-16"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((playlist) => (
        <PlaylistRow key={playlist.id} playlist={playlist} />
      ))}
    </ul>
  );
}

function PlaylistRow({ playlist }: { playlist: PlaylistListRow }) {
  return (
    <li className="rounded-xl border border-border px-4 py-3">
      <Link href={`/studio/playlists/${playlist.id}`} className="block hover:underline">
        <p className="text-sm font-medium text-foreground">{playlist.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {playlist.videoCount} {playlist.videoCount === 1 ? "video" : "videos"} ·{" "}
          {playlist.visibility}
        </p>
      </Link>
    </li>
  );
}

/**
 * The liked and watch-later tabs, which are the same list one route apart.
 *
 * `isLoadingFirstPage` IS NOT `rows.length === 0`. The shared hook keeps them separate on
 * purpose: "still loading" and "loaded, and there is genuinely nothing" are different facts, and
 * rendering the empty state while the request is open tells the reader something untrue about
 * their own account.
 */
function VideoCollection({
  list,
  emptyMessage,
  loadMoreLabel,
}: {
  readonly list: ReturnType<typeof useLikedVideosQuery>;
  readonly emptyMessage: string;
  readonly loadMoreLabel: string;
}) {
  if (list.isLoadingFirstPage) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (list.firstPageErrorMessage !== null) {
    return (
      <StatusPanel
        message={list.firstPageErrorMessage}
        className="border border-border px-6 py-16"
      />
    );
  }
  if (list.rows.length === 0) {
    return <StatusPanel message={emptyMessage} className="border border-border px-6 py-16" />;
  }

  return (
    <>
      <ul className="space-y-2">
        {list.rows.map((row) => (
          <LibraryVideoCard key={row.videoId} row={row} />
        ))}
      </ul>
      <LoadMoreControl
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        errorMessage={list.loadMoreErrorMessage}
        onLoadNextPage={list.loadNextPage}
        label={loadMoreLabel}
      />
    </>
  );
}

function LibraryVideoCard({ row }: { row: LibraryVideoRow }) {
  const durationLabel = formatDurationLabel(row.durationSeconds);

  return (
    <li className="rounded-xl border border-border">
      <Link
        href={`/watch?v=${encodeURIComponent(row.videoId)}`}
        className="flex gap-3 p-3 hover:underline"
      >
        <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
          {row.thumbnailUrl !== null && (
            <Image src={row.thumbnailUrl} alt="" fill sizes="128px" className="object-cover" />
          )}
          {/* Absent rather than zero: a null duration means the backend has not measured it yet. */}
          {durationLabel !== null && (
            <span className="absolute right-1 bottom-1 rounded bg-black/75 px-1 text-[11px] font-medium text-white">
              {durationLabel}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium text-foreground">{row.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{row.creatorName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatCompactCountLabel(row.viewCount)} views
          </p>
        </div>
      </Link>
    </li>
  );
}

function SubscriptionCollection({
  list,
}: {
  readonly list: ReturnType<typeof useSubscriptionsQuery>;
}) {
  if (list.isLoadingFirstPage) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (list.firstPageErrorMessage !== null) {
    return (
      <StatusPanel
        message={list.firstPageErrorMessage}
        className="border border-border px-6 py-16"
      />
    );
  }
  if (list.rows.length === 0) {
    return (
      <StatusPanel
        message="You aren't following any channels yet."
        className="border border-border px-6 py-16"
      />
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {list.rows.map((creator) => (
          <SubscribedCreatorCard key={creator.creatorId} creator={creator} />
        ))}
      </ul>
      <LoadMoreControl
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        errorMessage={list.loadMoreErrorMessage}
        onLoadNextPage={list.loadNextPage}
        label="Load more channels"
      />
    </>
  );
}

/**
 * A channel row, and it links NOWHERE. That is not an omission.
 *
 * THERE IS NO CHANNEL PAGE ON THIS FRONTEND. `find src/app -name "*channel*"` returns nothing —
 * a creator has a handle on the wire and no route that renders one, and the muted-creators list
 * in `feed-preferences-panel.tsx` already reached the same conclusion and prints `@handle` as
 * text. Linking to `/channel/:handle` would be a 404 on every row, which is worse than a row you
 * cannot click.
 *
 * `handle` and `imageUrl` are both nullable because an account with neither is a real account,
 * so each is branched on rather than interpolated.
 */
function SubscribedCreatorCard({ creator }: { creator: SubscribedCreatorRow }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border p-3">
      {creator.imageUrl === null ? (
        <span aria-hidden="true" className="size-10 shrink-0 rounded-full bg-muted-foreground/20" />
      ) : (
        <Image
          src={creator.imageUrl}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-full object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{creator.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {creator.handle === null
            ? `${formatCompactCountLabel(creator.subscriberCount)} subscribers`
            : `@${creator.handle} · ${formatCompactCountLabel(creator.subscriberCount)} subscribers`}
        </p>
      </div>
    </li>
  );
}
