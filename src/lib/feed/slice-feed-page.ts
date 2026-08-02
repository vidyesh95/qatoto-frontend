// TRANSPORT: props-only — pure slicing, no network.
//
// "Recommended" and "Explore" are ONE backend stream (HOME_BACKEND §0 Rule 3). There is no
// `recommended` field and no second request; the split is a presentation decision this file
// owns, and it owns it so that the boundary exists in exactly one place.
//
// The alternative — `videos.slice(0, 12)` inline in one component and `videos.slice(12)` in
// another — is two magic numbers that agree only until somebody changes the page size, at
// which point the feed silently drops or duplicates a row and nothing errors.

import type { FeedVideo } from "@/lib/feed/schemas";

/**
 * How many of the page's rows the Recommended grid takes.
 *
 * Half of the default `limit=24`, so a first page fills both sections. If the page comes back
 * short — a young catalog, or the diversity permutation trimming a filtered read — Recommended
 * takes what there is and Explore starts empty, which is correct: a half-full first section
 * beats a full one built by borrowing from the second.
 */
export const RECOMMENDED_SLICE_LENGTH = 12;

export interface SplitFeedPage {
  readonly recommendedVideos: FeedVideo[];
  readonly exploreVideos: FeedVideo[];
}

/** Splits one ranked page into the two sections the homepage renders. */
export function splitFeedPage(feedVideos: readonly FeedVideo[]): SplitFeedPage {
  return {
    recommendedVideos: feedVideos.slice(0, RECOMMENDED_SLICE_LENGTH),
    exploreVideos: feedVideos.slice(RECOMMENDED_SLICE_LENGTH),
  };
}
