// TRANSPORT: client-query — reads GET /playlists/mine.
"use client";

// THE VIEWER'S OWN VIDEO COLLECTIONS. NOT A STORE SURFACE — the account menu links it beside
// History with a video-library icon, and it is about playlists rather than purchases.
//
// ONE OF FOUR THINGS A LIBRARY USUALLY HAS IS BUILDABLE, and the page says so rather than shipping
// three dead tabs. `GET /playlists/mine` and `GET /playlists/:playlistId` exist. Liked videos,
// watch later, and subscriptions have NO ROUTES MOUNTED AT ALL — `src/app.ts` mounts `/videos`,
// `/playlists` and the engagement router, and nothing under them lists a viewer's likes or the
// channels they follow. History is a sibling route with its own page.
//
// NAMING THE ABSENCE RATHER THAN FAKING IT is the whole point. A "Liked videos" tab that rendered an
// empty state would be indistinguishable from a viewer who has liked nothing, and the difference is
// the entire question a reader has when the tab is empty.

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { useMyPlaylistsQuery } from "@/hooks/playlists";
import type { PlaylistListRow } from "@/lib/playlists/schemas";

export default function LibraryPage() {
  const playlistsQuery = useMyPlaylistsQuery();

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">Library</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Your playlists.</p>
      </header>

      <section aria-label="Your playlists" className="mt-3 px-4 lg:px-6">
        {renderPlaylists(playlistsQuery)}
      </section>

      {/* Stated, not mocked — see the header. */}
      <section aria-label="Not available yet" className="mt-6 px-4 lg:px-6">
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-sm font-medium text-foreground">Not here yet</p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Liked videos, watch later and subscriptions do not have anywhere to read them from yet —
            there is no route that lists them. They will appear here when there is.{" "}
            <Link href="/history" className="underline">
              Watch history
            </Link>{" "}
            has its own page.
          </p>
        </div>
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
