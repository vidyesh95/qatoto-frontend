import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

// Fallback to local Express port (e.g., http://localhost:8000) when running `pn dev`
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: projectDirectory,
  },
  reactCompiler: true,
  cacheComponents: true,
  // A `<Link>` prefetches ONE App Shell per route (the URL-independent static + cached part)
  // instead of one prefetch per visible link, so a grid of fifty cards into the same detail
  // route costs one prefetch, not fifty. Since 16.4, leaving this unset under `cacheComponents`
  // logs a warning on every `dev` and `build`, and Next 17 turns it on and removes the option.
  //
  // Adopted with no audit because there was nothing to audit: no `<Link prefetch={true}>` and
  // no `router.prefetch()` exists in `src/`, and those legacy full prefetches are the only thing
  // this changes the meaning of. Session reads (`src/lib/server-http.ts`) are `no-store`, and
  // uncached work never enters a prefetch with or without this flag.
  partialPrefetching: true,
  staticPageGenerationTimeout: 120,
  // Turbopack's filesystem cache for BOTH `next dev` and `next build` is ON BY DEFAULT as of
  // 16.3 (`experimental.turbopackFileSystemCacheForDev` / `...ForBuild`, see
  // node_modules/next/dist/server/config-shared.js). Setting them here would be a no-op —
  // do not "re-add" them thinking the cache is off.
  experimental: {
    // Runs the React Compiler inside Turbopack (Rust) instead of shelling out to Babel, which
    // avoids generating and reparsing code. Next REFUSES TO START without both `reactCompiler:
    // true` above and Turbopack — see the two throws in next/dist/server/config.js. We have no
    // Babel config of our own, so this is the full-gain path.
    //
    // EXPERIMENTAL. If a component starts misbehaving in a way that smells like bad memoization,
    // drop this flag first to fall back to the Babel compiler before hunting the component.
    turbopackRustReactCompiler: true,
    // Removes unreachable work from Turbopack's memory and its persistent cache, in both `dev`
    // and `build`. Without it the cache only grows: `.next/dev` measured 1.8 GB on 2026-10-08.
    // EXPERIMENTAL (16.4). If a build ever serves stale output, drop this before clearing `.next`.
    turbopackGc: true,
    // DEV ONLY — neither changes a production build. Compile a dynamic `import()` target when
    // the browser (or a server render) first reaches it, not at startup. This repo keeps its
    // heaviest code behind `import()` on purpose — pixi.js, the R3F teardown engine,
    // model-viewer, maplibre — so most dev sessions never need them compiled at all. A
    // compile error in one of those surfaces when it is first opened, not when `dev` starts.
    turbopackLazyDynamicImports: true,
    turbopackLazyDynamicImportsSSR: true,
  },
  /**
   * Permanent URL moves.
   *
   * ⚠️ THESE CANNOT BE PAGE SHIMS, and that is the whole reason they live here. A
   * `redirect()` inside a server component sits BELOW `research-and-development/loading.tsx`,
   * and a Suspense boundary commits its HTTP status before the dynamic hole resolves — so the
   * shim answers **200** and the browser only redirects after the stream lands. `todo.md`
   * records the same mechanism for `notFound()` and calls it working as designed, which it is
   * for a 404. For a permanent move it is a soft redirect: a crawler indexes the old URL as a
   * live page, and a reader with JS off never arrives.
   *
   * Declared here instead, the redirect happens at the routing layer before any boundary
   * exists, and answers a real 308.
   */
  async redirects() {
    return [
      {
        // THE ANIME VERTICAL WAS RETIRED and its hub became /blueprints. Every /anime child
        // was deleted, so unlike the import-intelligence entry below this one CAN take a
        // wildcard: there is no descendant left that must survive. Both land on the hub
        // rather than a mapped equivalent, because no /blueprints sub-page corresponds to
        // /anime/genre, /daily, /ranking or /favorite — sending a reader to a page that does
        // not answer their request is worse than sending them to the index.
        source: "/anime",
        destination: "/blueprints",
        permanent: true,
      },
      {
        source: "/anime/:path*",
        destination: "/blueprints",
        permanent: true,
      },
      {
        // ONE DOCUMENT, NOT A PREFIX. The retirement renamed this CMS post's slug, and it was a
        // real prerendered URL — `/blogs/[slug]` enumerates `getBlogs()` — so the old path 404s
        // for anyone holding a link, an RSS entry or a search result. No `:path*`: `/blogs` has
        // many other posts and the import-intelligence entry below is the standing warning
        // about what a careless wildcard does to sibling routes.
        source: "/blogs/anime-as-r-and-d-input",
        destination: "/blogs/teardowns-as-r-and-d-input",
        permanent: true,
      },
      {
        // The knowledge hub absorbed import substitution and became Market Research —
        // stage 02 of the pipeline was always called that.
        source: "/research-and-development/knowledge-hub",
        destination: "/research-and-development/market-research",
        permanent: true,
      },
      {
        source: "/research-and-development/knowledge-hub/insight/:insightId",
        destination: "/research-and-development/market-research/insight/:insightId",
        permanent: true,
      },
      {
        // ⚠️ THE INDEX ONLY. No `:path*` — `/import-intelligence/[hsCode]` did NOT move, it is
        // the target of the sitemap enumerator and of every commodity card, and a wildcard here
        // would redirect all 5,668 of them into a tab.
        source: "/research-and-development/import-intelligence",
        destination: "/research-and-development/market-research?tab=import-substitution",
        permanent: true,
      },
    ];
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
