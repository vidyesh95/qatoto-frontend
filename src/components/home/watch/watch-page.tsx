// TRANSPORT: server-fetch — reads `GET /feed/watch/:videoId` and the first page of comments
// with the caller's cookie forwarded.
//
// REPLACES `src/lib/videos.ts` ENTIRELY. That module was a second fetch layer pointing at a
// different base URL (`QATOTO_VIDEO_API_URL`) with no Zod, returning `null` on every failure
// and falling back to a 330-line mock array. Everything it served now comes from the real
// route through `src/lib/http.ts`.

import WatchContent from "@/components/home/watch/watch-content";
import { getWatchPayload, listFeedVideos, listVideoComments } from "@/lib/feed/api";
import type { FeedVideo, VideoComment, WatchPayload } from "@/lib/feed/schemas";
import { callerRequestOptions, hasCallerSession } from "@/lib/server-http";
import type { ActionResponse } from "@/lib/http";

export type WatchSearchParams = Promise<{ v?: string; t?: string }>;

/** The backend's `.max(50)` on the comment list. */
const COMMENTS_PAGE_LIMIT = 20;
/** One column of the recommended rail. */
const RECOMMENDED_RAIL_LIMIT = 8;

/**
 * `GET /feed/watch/:videoId` validates the param as a UUID and answers 422 before touching the
 * database, so a mangled `?v=` is checked here and never sent. Costs one regex and saves a
 * round trip on every crawler that guesses the query string.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function WatchPage({ searchParams }: { searchParams: WatchSearchParams }) {
  const { v: videoIdParam, t: startTimeParam } = await searchParams;

  const parsedStartTime = Number(startTimeParam);
  const startTimeSeconds =
    Number.isFinite(parsedStartTime) && parsedStartTime > 0 ? parsedStartTime : undefined;

  if (videoIdParam === undefined || !UUID_PATTERN.test(videoIdParam)) {
    return <WatchContent video={null} isViewerSignedIn={false} />;
  }

  const requestOptions = await callerRequestOptions();

  // Comments are fetched ALONGSIDE the payload, not after it. Waterfalling them behind the
  // video would add a full round trip to the one screen where the reader is already waiting on
  // a third-party player to load. A comment read for a video that turns out not to exist costs
  // one wasted query and answers an empty page — cheaper than the serial version.
  const [watchResult, commentsResult, recommendedResult, isViewerSignedIn] = await Promise.all([
    getWatchPayload(videoIdParam, requestOptions),
    listVideoComments(videoIdParam, { limit: COMMENTS_PAGE_LIMIT }, requestOptions),
    // The rail is REAL, not the four hardcoded cards it replaces. No `?exclude=` param exists,
    // so this video is filtered out client-side below — the candidate pool already drops the
    // viewer's own uploads and anything they recently watched, which covers the rest.
    listFeedVideos({ limit: RECOMMENDED_RAIL_LIMIT }, requestOptions),
    hasCallerSession(),
  ]);

  // A 404 here covers "no such video" AND "not public", deliberately, so ids cannot be probed.
  // The UI must not distinguish them either.
  const video: WatchPayload | null = watchResult.success ? watchResult.data : null;
  const comments = toCommentsPage(commentsResult);

  // A failed rail read degrades to no rail. It must never blank the player.
  const recommendedVideos: FeedVideo[] = recommendedResult.success
    ? recommendedResult.data.data.filter((candidate) => candidate.videoId !== videoIdParam)
    : [];

  return (
    <WatchContent
      video={video}
      initialComments={comments.rows}
      initialCommentsNextCursor={comments.nextCursor}
      recommendedVideos={recommendedVideos}
      isViewerSignedIn={isViewerSignedIn}
      startTimeSeconds={startTimeSeconds}
    />
  );
}

/** A failed comment read degrades to an empty thread; it must not blank the video. */
function toCommentsPage(
  result: ActionResponse<{ rows: VideoComment[]; nextCursor: string | null }>,
): { rows: VideoComment[]; nextCursor: string | null } {
  return result.success ? result.data : { rows: [], nextCursor: null };
}
