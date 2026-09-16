# Home & Video Feed — Architecture & Reference Guide

> **Status: Fully Wired.** The homepage feed (`/`), watch page (`/watch`), video player, comments, and studio video management are 100% wired to the Express backend.

This document outlines the core architecture of the video vertical for new and existing developers.

---

## 1. High-Level Architecture

The video vertical consists of two primary visitor surfaces and the creator studio:
1. **Homepage (`/`):** Dynamic personalized video feed, category filter chips, promo carousel, spotlight rail, and infinite scroll.
2. **Watch Page (`/watch/[videoId]`):** YouTube embedded player, watch progress beacon, like/save engagement controls, and threaded comments.
3. **Creator Studio (`/studio`):** Video upload modal, chapter editor, playlists, and video listings.

---

## 2. Feed Architecture & Streaming

- **Partial Prerendering & Suspense:** `src/app/(home)/page.tsx` passes `searchParams` unawaited to `<FeedShell />`. This keeps the promo carousel and page shell statically cached while streaming the video feed dynamically.
- **URL-Driven Filters:** Active filter chips (`?mode=...` or `?category=...`) live in the URL and are navigated via `<Link href={buildFilterHref(...)} scroll={false}>` (`src/lib/filter-href.ts`). This provides native browser back/forward history and shareable URLs without client round trips.
- **Feed Composition (`feed-shell.tsx`):**
  - **Default View:** Displays the **Promo Carousel**, **Filter Chips**, **Category Tiles**, **Spotlight Rail** (admin-curated), **Recommended** (top slice), and **Explore** (infinite scroll).
  - **Filtered View:** When a category chip or mode is selected, the layout collapses into a single focused grid (`filtered-feed.tsx`).
- **Pagination & Rank Seed:** Initial feed requests fetch page 1 with a `rankSeed`. Subsequent pages send the same `rankSeed` so that infinite scrolling appends new videos without reshuffling previously viewed items.

---

## 3. Watch Page & Video Player

- **YouTube IFrame API (`video-player.tsx`):** All videos are hosted on YouTube. The player uses the YouTube IFrame API loaded via a module-level singleton promise (`src/lib/youtube-iframe-api.ts`).
- **Watch Progress Beacon (`use-watch-progress-beacon.ts`):**
  - While a video plays, a 15-second heartbeat interval posts progress to `POST /videos/:id/view-beacon`.
  - When the viewer pauses, ends, or backgrounds the tab (`visibilitychange` / `pagehide`), a final beacon is flushed using `fetch(..., { keepalive: true })`.
  - The server clamps watch time against wall-clock time to prevent artificial inflation.
- **Threaded Comments (`video-comment-thread.tsx`):**
  - Comments use keyset cursor pagination (`nextCursor`).
  - Comment creation requires a full account and sends an `Idempotency-Key` header.
  - Replies are 1 level deep (replying to a reply is rejected by the backend with 409).
  - Deleted comments with active replies are tombstoned as `[deleted]` to preserve reply context.

---

## 4. Video Publishing Flow

- Creating a video (`POST /videos`) creates a row with `publishStatus: "draft"`.
- Follow-up metadata saves sequentially:
  - `PUT /videos/:id/chapters` (chapters editor; requires 0 or ≥3 chapters).
  - `PUT /videos/:id/playlists` (playlist assignment).
  - `POST /videos/:id/thumbnail` (custom thumbnail upload, if provided).
- **Publishing (`POST /videos/:id/publish`):** Gated by backend checks. Videos must have a title, categories, `isMadeForKids` selection, and verified YouTube source (`isSourceVerified`).

---

## 10. The `TRANSPORT: mock` Placeholders

A strict codebase invariant is that mock data should not exist in production paths. However, four specific UI areas on the watch surface deliberately retain mock or empty placeholders because their corresponding backend services do not yet exist. Each is marked with `// TRANSPORT: mock`:

| Component | Placeholder Field | Reason & Backend Status |
| :--- | :--- | :--- |
| `home/watch/watch-content.tsx` | `transcript`, `transcriptTitle` | No backend speech-to-text (ASR) service or database table exists. Held empty to preserve the layout alongside the chapter navigator. |
| `home/watch/watch-content.tsx` | `isPremium` | No paid subscription tier, paywall, or entitlement engine exists. Hardcoded to `false` so viewers are never blocked. |
| `home/watch/comments.tsx` | `saleItem`, `reviews`, `trending` | No product-video review joins or search trending aggregations exist. Held empty so the reviews tab cleanly collapses. |
| `studio/series/series-editor-modal.tsx` | Poster image file picker | `posterUrl` is a plain string URL on the wire; no multipart poster upload endpoint exists yet. |

> **Rule:** These placeholders are kept empty or inert, never fabricated with fake data. They will be wired as their respective backend features ship.

---

## 11. Debugging: Why is my uploaded video missing from the homepage?

If you upload a video in local development and cannot see it on `/`, check the following:

1. **Creator Self-Exclusion:**
   - For signed-in users, the recommendation algorithm (`feed.service.ts`) intentionally filters out your own uploaded videos (`v.creator_id <> viewerUserId`) because a creator should discover other creators' content.
   - **How to verify:** Open an incognito/private tab (logged out) and visit `http://localhost:3000/`. If the video appears when logged out, the filter is working as designed.
   - When the database has very few videos, the backend relaxation ladder eventually drops self-exclusion (stage 3) to prevent an empty page.
2. **Publish Status:** Ensure the video was actually published (not left as Draft or Scheduled).
3. **Source Verification:** A YouTube link must be verified by the background worker (`verify-youtube-video`). Ensure the backend worker (`pnpm start:worker`) is running.
4. **Candidate Pool SQL Check:**
   ```sql
   SELECT id, title, publish_status, visibility, is_source_verified, is_made_for_kids
   FROM video ORDER BY created_at DESC LIMIT 5;
   ```
