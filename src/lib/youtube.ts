// YouTube link parsing for the studio upload flow. Self-hosting video is
// expensive, so creators bring their own YouTube-hosted video for now — these
// helpers turn a pasted watch/share/shorts link into an embeddable id.

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const YOUTUBE_SHORT_HOSTNAMES = new Set(["youtu.be", "www.youtu.be"]);

// Path prefixes that carry the id as the segment right after them.
const YOUTUBE_PATH_PREFIXES = ["/embed/", "/shorts/", "/live/", "/v/"];

// Returns the 11-character video id, or null when the input isn't a YouTube
// video link the frontend can embed.
export function extractYoutubeVideoId(rawUrl: string): string | null {
  const trimmedUrl = rawUrl.trim();
  if (trimmedUrl === "") return null;

  // Accept bare ids and schemeless links alike.
  if (YOUTUBE_VIDEO_ID_PATTERN.test(trimmedUrl)) return trimmedUrl;

  const urlWithScheme = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlWithScheme);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (YOUTUBE_SHORT_HOSTNAMES.has(hostname)) {
    return toVideoId(parsedUrl.pathname.slice(1));
  }

  if (!YOUTUBE_HOSTNAMES.has(hostname)) return null;

  const watchVideoId = parsedUrl.searchParams.get("v");
  if (watchVideoId) return toVideoId(watchVideoId);

  const matchingPrefix = YOUTUBE_PATH_PREFIXES.find((pathPrefix) =>
    parsedUrl.pathname.startsWith(pathPrefix),
  );
  if (matchingPrefix) {
    return toVideoId(parsedUrl.pathname.slice(matchingPrefix.length));
  }

  return null;
}

export function isYoutubeVideoUrl(rawUrl: string): boolean {
  return extractYoutubeVideoId(rawUrl) !== null;
}

export function buildYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

function toVideoId(pathSegment: string): string | null {
  const firstSegment = pathSegment.split("/")[0] ?? "";
  return YOUTUBE_VIDEO_ID_PATTERN.test(firstSegment) ? firstSegment : null;
}
