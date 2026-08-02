# Home — Structure

The frontend doc for `/` — Qatoto's homepage feed. Four things live here: the **filter chip row**,
the **"What's on your mind?"** category tiles, the 3-video **Spotlight**, and the personalized
video stream the page splits into **Recommended** (top) and **Explore** (bottom, infinite).

**Read alongside:**

- [HOME_BACKEND_STRUCTURE.md](HOME_BACKEND_STRUCTURE.md) — the API contract this surface consumes.
  **None of it is built yet.** Section references below like "backend §4" point there.
- [STUDIO_BACKEND_STRUCTURE.md](STUDIO_BACKEND_STRUCTURE.md) — the creator side. Videos reach this
  page from `/studio`, and its Appendix A is why every video is a YouTube link.
- [CLAUDE.md](CLAUDE.md) — thin-client invariant, Patterns 1–3, naming and wire-casing rules.

> **Phase note: this surface is 100% fabricated today.** Every video, category and chip on `/` is a
> hardcoded array. `all-content.tsx` holds four of them (`SPOTLIGHT_VIDEOS` 3, `RECOMMENDED_VIDEOS`
> 8, `EXPLORE_VIDEOS` 12, `VIDEO_CATEGORIES` 12) and `filter.tsx:7-30` holds 22 chip labels whose
> selection is local `useState` and filters nothing. Not one of these files carries a `TRANSPORT:`
> banner — they predate the convention. The homepage is the last major surface still mock.

---

## 1. What exists today

| Piece | File | Transport | State |
| --- | --- | --- | --- |
| Route shell | `src/app/(home)/page.tsx` | — | ✅ thin, renders `<Home/>` |
| Layout (QueryProvider, Sidebar, Navbar) | `src/app/(home)/layout.tsx` | — | ✅ |
| Composition | `feed/home.tsx` | `props-only` | ✅ |
| Promo carousel | `feed/promo-carousel-section.tsx` | `server-fetch` | ✅ **the only wired thing on this page** |
| Filter chip row | `feed/filter.tsx` | *(no banner)* | ⚠️ real a11y, fake data, dead selection |
| The four sections | `feed/all-content.tsx` | *(no banner)* | 🚫 four mock arrays |
| Spotlight tile | `feed/spotlight-video-cards.tsx` | *(no banner)* | 🚫 image + alt only |
| Category tile | `feed/video-category-card.tsx` | *(no banner)* | 🚫 no slug, no href |
| Video card | `shared/video-card.tsx` | *(no banner)* | ⚠️ display-strings only, no video id |
| Watch player | `watch/video-player.tsx` | — | 🚫 native `<video>`, **cannot play a YouTube row** |
| Studio upload | `studio/upload/upload-modal.tsx` | — | 🚫 saves to an in-memory context, no fetch |

Two things are worth keeping as they are:

- **`filter.tsx`'s interaction layer is good.** Roving tabindex (WAI-ARIA toolbar pattern),
  drag-scroll with a 5px threshold, chevrons that appear only when there is hidden content. All of
  it survives the rewrite verbatim — only the data source and the click handler change.
- **`promo-carousel-section.tsx` is the template.** Async server component, three-state
  discriminated union (`unavailable | empty | ready`), `{ cache: "no-store" }`. Every new section
  on this page copies its shape.

---

## 2. Modules to build

```text
src/lib/feed/
  schemas.ts          Zod .strip() boundary + view-model types + toVideoCardProps()
  api.ts              one function per route, optional RequestOptions (server + client)
  chips.ts            FeedChip discriminated union + buildFeedChips()
  format.ts           formatViewCountLabel() — pure, no Date
  slice-feed-page.ts  splitFeedPage() — the Recommended/Explore boundary, in one place

src/hooks/feed/
  keys.ts             query-key factory, prefixed "feed"
  queries.ts          useFeedCategoriesQuery, useFeedVideosInfiniteQuery
  mutations.ts        like / save / subscribe / comment
  use-watch-progress-beacon.ts
```

Nothing here invents transport. `src/lib/http.ts` already has `getJson`, `getPaginated`,
`sendJson`, `buildQueryString`, `unwrap`, `isUnauthorized` and the `ActionResponse<T>` tagged
result; `src/lib/server-http.ts` already has `callerRequestOptions()` which forwards the
better-auth cookies. `src/lib/feed/api.ts` carries the same banner as `src/lib/promo/api.ts` —
*server-fetch + client-query, callable from both sides via the optional `RequestOptions`* — and
does the same thing.

### 2.1 Wire casing, applied

Three casings meet on this page and none of them may be "corrected":

| Thing | Casing | Example |
| --- | --- | --- |
| Category slugs | kebab | `?category=quantum-computing` |
| Query keys and JSON fields | camelCase | `?categorySlug=…&rankSeed=…` |
| Feed mode values | **snake_case** | `?mode=new_to_you` |

`new_to_you` and `recently_uploaded` are `pgEnum` labels (backend §3.1). They are **data, not
identifiers**. `z.enum(FEED_MODES).safeParse("new-to-you")` fails, and `?mode=new-to-you` is a 422
from the backend's `.strict()` query schema. `FEED_MODES` in `schemas.ts` is the frontend's copy of
that tuple, byte-identical, exactly like `src/lib/products/schemas.ts` holds `home_kitchen`.

### 2.2 `splitFeedPage` — why the boundary is a named function

Recommended and Explore are **one backend stream** (backend §0 Rule 3). The split is ours:

```ts
// src/lib/feed/slice-feed-page.ts
export const RECOMMENDED_SLICE_LENGTH = 12;

export function splitFeedPage(feedVideos: readonly FeedVideo[]): {
  recommendedVideos: FeedVideo[];
  exploreVideos: FeedVideo[];
} { … }
```

One exported constant, one pure function. The alternative — `videos.slice(0, 12)` inline in JSX and
`videos.slice(12)` somewhere else — is two magic numbers that will disagree the first time anyone
changes the page size.

---

## 3. The relative-time trap

`VideoCardProps.postedAt` is the string `"12 hours ago"`. Computing that during a server render is
**wrong under `cacheComponents`**: the render is cached, the label freezes at whatever it said when
the cache was written, and the client disagrees with it on hydrate.

The rule for this surface:

- The API returns `publishedAt` as an **ISO string**. It never returns a pre-formatted label.
- A small client component renders an absolute `<time dateTime={publishedAt}>` on first paint —
  server-safe, cache-safe, correct forever — and swaps to the relative label in an effect, with
  `suppressHydrationWarning` on that node only.
- **Never compute relative time in a server component.**

`formatViewCountLabel` has no such problem: view counts are not a function of the current time, so
it stays a pure function and runs anywhere.

---

## 4. Filter state lives in the URL

`?mode=trending` · `?category=robotics`, read with `useSearchParams` and written with
`router.replace(url, { scroll: false })`.

Chosen over component state because a filtered feed should be **shareable and back-buttonable**,
and because the current implementation's local `useState` (`filter.tsx:51`) is precisely why the
chips filter nothing today. The URL is the single source of truth for what the page is showing;
the chip row reads it, the feed query key includes it.

### 4.1 The chip model

Today's 22 chips are two different kinds of thing wearing the same shape — `All`, `Trending`,
`New to you`, `Recently uploaded`, `Watched` are **modes**; `Robotics`, `AI`, `Gaming` are
**topics**. A single `string[]` cannot express that, which is Pattern 1's illegal-state problem in
miniature.

```ts
// src/lib/feed/chips.ts
export type FeedChip =
  | { kind: "mode"; mode: FeedMode; label: string }
  | { kind: "topic"; categorySlug: string; label: string };
```

`buildFeedChips(categories)` returns the mode chips followed by one topic chip per active
category, so the row still looks exactly like it does now. Clicking a chip sets **either** `mode`
**or** `category` in the URL — never both, because the union says they are alternatives.

**`Live` is gone.** No stream domain exists (backend §5.3). A chip that always returns nothing
teaches people the filters are broken, so it is removed rather than shipped empty.
`VideoCardProps.isChannelLive` stays in the type — `watch-content.tsx`, `anime/favorite-page.tsx`
and `anime/genre-page.tsx` all read it — and the feed mapper always sets it `false`.

**`Minimalist`, `Retro`, `Precision`, `Upcoming` are gone too** (backend §2.1). They describe an
aesthetic, not a subject; nothing can be tagged into them.

---

## 5. The component tree after the change

```text
src/app/(home)/page.tsx                                (server)
└─ feed/home.tsx                             props-only
   ├─ <Suspense> promo-carousel-section.tsx  server-fetch   (unchanged)
   ├─ feed-shell.tsx                         server-fetch   ← NEW. Three parallel calls:
   │  │                                                       • GET /feed/categories
   │  │                                                       • GET /feed/videos?mode=trending&limit=3
   │  │                                                       • GET /feed/videos?limit=24
   │  │                                                       then splitFeedPage() on the third.
   │  ├─ filter.tsx                          client-query   categories arrive as initialData
   │  ├─ recommended-section.tsx             props-only     slice 0–11, server-rendered → LCP
   │  ├─ category-tiles-section.tsx          props-only     "What's on your mind?"
   │  ├─ spotlight-section.tsx               props-only     trending ranks 1–3
   │  └─ explore-section.tsx                 client-query   slice 12–23 as initialData, then infinite
   └─ filtered-feed.tsx                      client-query   ← replaces the four sections when a chip is active
```

**Every file gets a `TRANSPORT:` banner on line 1.** The feed files have none today; after this
work `grep -rn "TRANSPORT:" src/components/home/feed/` lists all of them and
`grep -rn "TRANSPORT: mock" src/components/home/feed/` returns nothing. That grep is the check
that this doc is still true, and unlike a table it cannot drift.

### 5.1 How a server-rendered section coexists with a client filter

When `mode` is `all` and no `category` is set — the default, and the common case — the page is
mostly server-rendered: three sections are `props-only` off `feed-shell`'s fetch, which is what
keeps the LCP image in the first HTML response.

When any other chip is active, `filtered-feed.tsx` renders **one grid instead of**
recommended + tiles + spotlight + explore. Not four filtered sections — Spotlight is "the 3
trending videos" and has no meaning inside a category filter, and a "Recommended" heading over a
`recently_uploaded` list is a lie about what the user asked for.

### 5.2 Per-section state, Pattern 1

Each section owns a discriminated union and an exhaustive `switch` with a `never` default:

```ts
type ExploreSectionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; videos: FeedVideo[]; hasNextPage: boolean };
```

The chip row gets its own — a failed `/feed/categories` must render the mode chips alone rather
than an empty row, because the mode chips do not depend on that call.

`mode=watched` returns **401 when signed out** (backend §4.8). `isUnauthorized` already exists in
`src/lib/http.ts:397`; that branch renders a sign-in prompt, not an error.

---

## 6. Watch page and the beacon

`watch/video-player.tsx` is a native `<video>` element with no iframe branch. **It cannot play any
video in the system** — every row is a YouTube link. This is the single largest gap between the
shipped frontend and the backend contract.

It gains a branch on `videoSource`:

- Load `https://www.youtube.com/iframe_api` once, behind a module-level promise so N players on a
  page do not race the script tag.
- `new YT.Player(...)` with `enablejsapi: 1` and `origin: window.location.origin`.
- Reuse `buildYoutubeEmbedUrl` (`src/lib/youtube.ts:64`) — it already has the hostname allowlist
  and the 11-character id regex. Do not build an embed URL by hand anywhere.

`use-watch-progress-beacon.ts`:

| Event | Action |
| --- | --- |
| `onStateChange` → playing | start a 15s interval |
| interval tick | read `getCurrentTime()` / `getDuration()`, POST `/videos/:id/view-beacon` |
| `onStateChange` → paused/ended | stop the interval, flush once |
| `onError` | POST the code to `/videos/:id/playback-error` (backend §8.2) |
| `visibilitychange` / `pagehide` | flush via `navigator.sendBeacon` |
| unmount | clear interval, destroy player, remove listeners |

This is **best-effort by construction**. The beacon is a claim, not a measurement — the server
clamps it against wall-clock elapsed and pins the duration on the first beacon (backend §3.3).
Nothing on the client needs to be trusted, and nothing here should be written as though it is.

---

## 7. Engagement UI

Like, save, subscribe, comment. Two rules:

- **Viewer state arrives with the feed.** Every card in a `/feed/videos` response carries
  `viewerState: { hasLiked, hasSaved, isSubscribedToCreator }` (backend §5.1). Twenty-four cards
  must not become twenty-five requests, and there is no "hydrate my likes" follow-up call.
- **Like and save are optimistic; comment and subscribe are not.** A like is cheap, idempotent and
  visually instant — rolling it back on failure costs nothing. A comment is a piece of writing that
  must not appear to have posted when it did not, and subscribe is a relationship. Those two show a
  pending state and wait for the server.

Comment create sends an idempotency key minted once per attempt in component state — the same rule
the R&D write surface follows, for the same reason: a double-tapped submit must not post twice.

---

## 8. Studio, and the two legacy paths that die

**Studio must be wired before anything reaches this page.** `src/state/studio-videos-context.tsx`
is an in-memory store with no `fetch` anywhere in it; the backend `/videos` write API already
exists and is entirely unconsumed. Replace the context with `src/lib/videos/api.ts` +
`src/hooks/videos.ts` mutations, and swap the free-text category field for a multi-select fed by
`GET /feed/categories` (max 3, backend §2).

My Videos also needs an `isSourceVerified: false` badge — "verifying…" — so a creator understands
why publish is blocked during a YouTube oEmbed outage (backend §8.3) instead of seeing a button
that silently does nothing.

Two paths are deleted, not migrated:

- **`src/lib/videos.ts` and `QATOTO_VIDEO_API_URL`.** A second fetch layer, pointing at a
  different base URL than `NEXT_PUBLIC_API_URL`, with no Zod, returning `null` on every failure and
  falling back to a 330-line `MOCK_VIDEOS` array. The watch page reads `GET /feed/watch/:videoId`
  through `src/lib/server-http.ts` instead.
- **The four mock arrays in `all-content.tsx`**, and the file itself — it becomes the four section
  components of §5.

---

## 9. Phase order

| # | Scope | Done when |
| --- | --- | --- |
| 4 | `src/lib/feed/*` + `src/hooks/feed/*`; `filter.tsx` on real categories with URL params | Chips render from the backend; clicking one changes the URL |
| 5 | `all-content.tsx` → the four sections + `splitFeedPage` | Homepage renders real videos; the mock arrays are deleted |
| 6 | Explore infinite scroll + `filtered-feed.tsx` | Scrolling appends page 2; a chip swaps the page to one filtered grid |
| 7 | Watch page YouTube branch + beacon hook + engagement UI | Playing a video moves `watchedSeconds` server-side |
| 8 | Studio real writes; delete `src/lib/videos.ts`; `TRANSPORT:` banners everywhere | A creator's YouTube link reaches the homepage end to end |

Numbering continues from the backend phases (backend §9) — 1–3 are backend-only and show nothing
until 4 lands. **Phase 7 is what makes ranking non-trivial**: until real watch sessions exist, the
backend's quality score runs on likes and velocity with the completion component ramped near zero
(backend §4.2). That is expected during rollout, not a bug.

---

## 10. Verification

```bash
pnpm dev          # https via localhost.pem
pnpm lint         # oxlint
pnpm build        # cacheComponents is where a relative-time label blows up
```

By hand:

- Load `/` signed out → a popularity feed. Watch two robotics videos, reload → the session-scoped
  affinity shifts it (backend §4.4).
- Sign in, watch three more, wait for `recompute-user-affinities`, reload → robotics ranks higher.
- Click a category chip → the URL changes, the four sections collapse to one grid, back button
  restores the default page.
- Scroll Explore → page 2 appends without reshuffling page 1 (that is what `rankSeed` is for).
- Upload a YouTube link in `/studio` → it appears in the exploration quota within the hour.
- Open an embedding-disabled video in three browsers → it drops out of the feed (backend §8.2).
- `grep -rn "TRANSPORT:" src/components/home/feed/` lists every file; no `mock` values.

Per [CLAUDE.md](CLAUDE.md), **no tests are written unless you ask for them.**
