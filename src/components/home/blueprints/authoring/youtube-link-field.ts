// TRANSPORT: props-only — a pasted YouTube link, turned into the contract's video shape. No network.
//
// Shared by the teardown wizard (its walkthrough) and the launch form (its demo), which is why it
// lives in `blueprints/authoring/` beside the form fields rather than inside either form's folder.

import { extractYoutubeVideoId } from "@/lib/youtube";

/**
 * A pasted YouTube link becomes the video arm, or `null` when the field is empty.
 *
 * ⚠️ AN ID ON THE WIRE, NOT A URL: `extractYoutubeVideoId` at the boundary, exactly as
 * `create-studio-page.tsx` does, so a malformed link fails here rather than rendering as a blank box
 * later.
 *
 * ⚠️ THIS FUNCTION CANNOT REPORT A BAD LINK AND MUST NOT TRY. It returns `null` both for an empty
 * field and for text that does not parse, and the contract never sees the raw string, so a typo
 * would otherwise drop somebody's video silently. `isYoutubeLinkFieldUsable` below is what a form
 * checks before letting anyone move on; keeping the two apart is what lets this stay total.
 *
 * ⚠️ `durationSeconds: null`, ALWAYS, AND NO FORM ASKS. Neither side of the wire can measure it: the
 * backend's only outbound YouTube call is oEmbed, which returns no duration. A typed runtime would be
 * a guess rendered as a badge over a video of some other length. `posterUrl` is DERIVED from the id
 * with no network call, `hqdefault` because `maxresdefault` 404s on non-HD uploads.
 */
export function buildYoutubeBlueprintVideo(
  youtubeUrl: string,
): { source: "youtube"; youtubeVideoId: string; posterUrl: string; durationSeconds: null } | null {
  const youtubeVideoId = extractYoutubeVideoId(youtubeUrl);
  if (youtubeVideoId === null) return null;

  return {
    source: "youtube",
    youtubeVideoId,
    posterUrl: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
    durationSeconds: null,
  };
}

/**
 * Whether a YouTube link field is in a state the form can submit from.
 *
 * TRUE FOR EMPTY: the field is optional on both forms, and most teardowns have no walkthrough and
 * most launches no demo. FALSE only for text that is present and does not parse, which is the one
 * case a form must surface: silently dropping a link somebody pasted would lose their video with no
 * explanation.
 */
export function isYoutubeLinkFieldUsable(youtubeLinkText: string): boolean {
  return youtubeLinkText.trim() === "" || extractYoutubeVideoId(youtubeLinkText) !== null;
}
