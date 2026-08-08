import type { NextConfig } from "next";

// Fallback to local Express port (e.g., http://localhost:8000) when running `pn dev`
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  // reactCompiler: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  // this is used to proxy api requests to the backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
  // Legacy `/store/{category…}` URLs → explicit `/store/category/{…}` (STORE_STRUCTURE §3).
  // Excludes reserved store segments so search/product/pathway routes are untouched.
  async redirects() {
    return [
      {
        source: "/store/:first((?!search|categories|category|product|organizations|pathway)[^/]+)",
        destination: "/store/category/:first",
        permanent: true,
      },
      {
        source:
          "/store/:first((?!search|categories|category|product|organizations|pathway)[^/]+)/:rest*",
        destination: "/store/category/:first/:rest*",
        permanent: true,
      },
    ];
  },
  images: {
    // Every remote image host the backend can hand us. `next/image` THROWS on an unlisted
    // host — it is not a soft failure, it is a runtime error that takes the whole page down.
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google OAuth avatars
      { protocol: "https", hostname: "avatars.githubusercontent.com" }, // GitHub OAuth avatars
      // Everything the backend uploads itself: avatars, promotional slides, content-category
      // tiles, project covers, and CUSTOM video thumbnails (`qatoto/video-thumbnails/…`).
      { protocol: "https", hostname: "res.cloudinary.com" },
      // ─────────────────────────────────────────────────────────────────────────────────
      // YouTube thumbnails — WILDCARDS ON PURPOSE, DO NOT NARROW TO `i.ytimg.com`.
      //
      // `video.thumbnailUrl` and `daily_log.youtubeThumbnailUrl` store whatever host YouTube's
      // oEmbed returned. The backend does not normalise it to one host: it validates against a
      // SUFFIX allowlist — `YOUTUBE_THUMBNAIL_HOSTNAME_SUFFIXES = [".ytimg.com", ".youtube.com"]`
      // in `src/lib/youtube.ts` — and stores the URL verbatim.
      //
      // So YouTube may hand back `i.ytimg.com` today and `i9.ytimg.com` tomorrow, and pinning
      // the one host that happened to appear leaves the same crash reachable. These two patterns
      // mirror that suffix list exactly; keep them in step if the backend's list changes.
      // ─────────────────────────────────────────────────────────────────────────────────
      { protocol: "https", hostname: "**.ytimg.com" },
      { protocol: "https", hostname: "**.youtube.com" },
    ],
  },
};

export default nextConfig;
