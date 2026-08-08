import type { Metadata } from "next";

import PlaylistDetailPage from "@/components/studio/playlists/playlist-detail-page";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * A dynamic route needs `generateStaticParams` under `cacheComponents`, and an EMPTY one fails
 * the build with `EmptyGenerateStaticParamsError`.
 *
 * There is nothing real to prerender here: `GET /playlists/mine` is `requireAuth` and
 * owner-scoped, so a build machine has no session and every playlist belongs to somebody. The
 * sentinel is the honest answer — one unresolvable param is prerendered, and every real id
 * renders on demand. The page resolves its own record and shows a not-found state, which is the
 * same path a typo takes.
 */
export function generateStaticParams() {
  return withSentinelValues([]).map((playlistId) => ({ playlistId }));
}

export const metadata: Metadata = {
  title: "Playlist details",
  description: "Playlist detail page for Qatoto Creator Studio",
};

export default async function Page({ params }: { params: Promise<{ playlistId: string }> }) {
  const { playlistId } = await params;
  return <PlaylistDetailPage playlistId={playlistId} />;
}
