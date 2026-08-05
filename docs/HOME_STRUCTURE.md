# Home — Structure

The frontend doc for `/` — Qatoto's homepage feed. Four things live here: the **filter chip row**,
the **"What's on your mind?"** category tiles, the 3-video **Spotlight**, and the personalized
video stream the page splits into **Recommended** (top) and **Explore** (bottom, infinite).

**Read alongside:**

- [HOME_BACKEND_STRUCTURE.md](HOME_BACKEND_STRUCTURE.md) — the API contract this surface consumes.
  All three backend phases are **built**. Section references below like "backend §4" point there.
- [STUDIO_BACKEND_STRUCTURE.md](STUDIO_BACKEND_STRUCTURE.md) — the creator side. Videos reach this
  page from `/studio`, and its Appendix A is why every video is a YouTube link.
- [CLAUDE.md](CLAUDE.md) — thin-client invariant, Patterns 1–3, naming and wire-casing rules.

> **Phase note: this surface is WIRED, end to end.** Frontend phases 4–8 have shipped. The
> homepage, the watch page (player, beacon, engagement, comments) and the studio (videos, series,
> playlists) all read and write the Express backend. `src/state/studio-videos-context.tsx` and
> `src/lib/videos.ts` — the two mock stores — are **deleted**, and with them `QATOTO_VIDEO_API_URL`
> and `MOCK_VIDEOS`.
>
> **Nine placeholders across seven files remain deliberately mock, each marked `TRANSPORT: mock`.**
> They are listed individually in §10. `grep -rn "TRANSPORT: mock" src/` returns those and only
> those — that grep is the check, and unlike a table it cannot drift.

---

## 0. Where this doc was wrong about the backend

Everything below was found by reading the backend SOURCE while wiring, not the backend doc. Each
one changed code, and each is written down because the shape it corrects is the shape a reader
would otherwise re-derive from the old text.

| #   | This doc used to say                                                                   | The backend actually does                                                                                                                                                           | Source                                      |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | `/feed/categories` → `[{slug,label,imageUrl,sortOrder}]`, one list for chips and tiles | Also returns `id` and **`isTile: boolean`**; **`imageUrl` is nullable**. Chips = every active row; tiles = `isTile && imageUrl !== null`                                            | `content-categories.service.ts:31-38`       |
| 2   | Filter state read with `useSearchParams`, written with `router.replace`                | The repo has **no such pattern**. Filters are read by server components from `searchParams` and written by `<Link href={buildFilterHref(...)}>`                                     | `src/lib/filter-href.ts`, `talent-page.tsx` |
| 3   | Beacon flush via `navigator.sendBeacon`                                                | `sendBeacon` + `application/json` is **not CORS-safelisted** → needs a preflight it cannot issue → returns `true`, request never arrives. Must be `fetch(..., { keepalive: true })` | `src/app.ts:54-59`                          |
| 4   | Comment idempotency key "minted per attempt" (R&D sends it in the **body**)            | Comment create reads the **`Idempotency-Key` HTTP header**, 8–200 chars                                                                                                             | `src/middleware/idempotency.ts:41`          |
| 5   | 401 is the refusal to handle                                                           | Authed writes answer **403** via `requireIdentifiedUser`. `anonymous()` mints real sessions, so those callers sail past a 401-only check                                            | `require-identified-user.ts:90-94`          |
| 6   | "the feed mapper always sets `isChannelLive` false"                                    | The **backend sends the literal `false`** on the wire                                                                                                                               | `feed.service.ts:528`                       |
| 7   | `isChannelLive` read by `watch-content`, `anime/favorite-page`, `anime/genre-page`     | Only `watch-content.tsx` and the (now deleted) `all-content.tsx` ever set it. Neither anime page mentions it                                                                        | grep                                        |
| 8   | One list envelope                                                                      | **Three**: `ApiResponse` (categories), `PaginatedResponse & { rankSeed }` (feed videos, **offset**), `ApiResponse & { nextCursor }` (comments, **keyset**)                          | `types/index.ts:6-33`                       |
| 9   | `publishedAt` is ISO on every route                                                    | `/feed/videos` served the **Postgres text form** `'2026-08-02 17:36:54.105'` — no `T`, no zone — while `/feed/watch/:id` served proper ISO for the **same column**. Now fixed       | `feed.service.ts`, `lib/sql-time.ts`        |

Two further traps with no previous counterpart, both now guarded in code:

- **`pagination.total` is counted under the candidate filter, BEFORE the diversity permutation
  and the page slice.** `data.length` can be `< limit` while `totalPages` still promises more, so
  infinite scroll stops on an empty page **and** on `page >= totalPages`
  (`src/hooks/feed/queries.ts`).
- **202 responses omit `data` entirely** — key absent, not `null`. The beacon and playback-error
  schemas are `z.undefined()`; a `z.object({})` there fails every call.

### Why row 9 happened — `db.execute<T>` is a CLAIM, not a parse instruction

Worth the space, because the mechanism is not obvious and there is more than one site.

`drizzle-orm/node-postgres/session.js` builds **every** prepared query with its own
`types.getTypeParser`, which returns `(val) => val` for TIMESTAMP, TIMESTAMPTZ, DATE and INTERVAL.
That override wins over `pgTypes.setTypeParser`, so the global UTC parser registered in the
backend's `src/db/index.ts` **never reaches a drizzle query** — its doc comment claimed otherwise
for months.

The query BUILDER is unharmed: drizzle re-parses with the column's own codec
(`PgTimestamp.mapFromDriver` appends `'+0000'`), which is the same UTC convention. `db.execute` has
no column to map to, so nothing recovers, and the raw string is handed on under whatever `Date`
annotation the call site wrote. `/feed/videos` reads through `db.execute`; `/feed/watch/:id` reads
through the builder. Same column, two formats.

What the wrong format cost: with no `T` and no zone, `Date.parse` reads the string as **local**
time, so every "posted X ago" on the homepage was off by the viewer's UTC offset (−5.5 h on the
machine that found it), and `<time dateTime="2026-08-02 17:36:54.105">` is not a valid `datetime`
attribute either.

The fix is `utcDateFromRow` in the backend's `src/lib/sql-time.ts` — the read-side twin of the
`utcTimestamp` write-side helper that was already there for the same class of bug. **Two sites
needed it**, not one: `feed.service.ts` (`FeedRow.published_at`) and `middleware/rate-limit-store.ts`
(`expires_at`, returned as `resetTime`, which `express-rate-limit` reads as a `Date`). Prefer the
query builder wherever the choice exists — `latestSnapshotAsOf` in `feed.service.ts` documents that
call and is the model to copy.

---

## 1. What exists today

| Piece                 | File                              | Transport                                        |
| --------------------- | --------------------------------- | ------------------------------------------------ |
| Route shell           | `src/app/(home)/page.tsx`         | — passes `searchParams` **unawaited**            |
| Composition           | `feed/home.tsx`                   | `props-only`, two independent `<Suspense>`       |
| Promo carousel        | `feed/promo-carousel-section.tsx` | `server-fetch`                                   |
| **Feed orchestrator** | `feed/feed-shell.tsx`             | `server-fetch` — three parallel reads            |
| Filter chip row       | `feed/filter.tsx`                 | `client-query` — real categories, `<Link>` chips |
| Recommended           | `feed/recommended-section.tsx`    | `props-only` (LCP)                               |
| Category tiles        | `feed/category-tiles-section.tsx` | `props-only`                                     |
| Spotlight             | `feed/spotlight-section.tsx`      | `props-only`                                     |
| Explore               | `feed/explore-section.tsx`        | `client-query` — offset infinite scroll          |
| Filtered grid         | `feed/filtered-feed.tsx`          | `client-query`                                   |
| Video card            | `shared/video-card.tsx`           | `props-only` — `videoId`, `publishedAt`          |
| Relative time         | `shared/relative-time.tsx`        | `props-only`, **client-only by design**          |
| Watch page            | `watch/watch-page.tsx`            | `server-fetch` — payload + comments + rail       |
| Player                | `watch/video-player.tsx`          | `client-query` — YouTube IFrame + beacon         |
| Comments              | `watch/video-comment-thread.tsx`  | `client-query` — keyset, real composer           |
| Studio                | `studio/**`, `admin/review/**`    | `client-query`                                   |

Deleted: `feed/all-content.tsx`, `src/lib/videos.ts`, `src/state/studio-videos-context.tsx`.

---

## 2. Modules

```text
src/lib/feed/
  schemas.ts            Zod .strip() boundary + wire enums + toVideoCardProps()
  api.ts                one function per route, optional RequestOptions
  chips.ts              FeedChip union + buildFeedChips() + toChipHrefPatch()
  format.ts             view/duration/subscriber labels — pure, no Date
  slice-feed-page.ts    splitFeedPage() — the Recommended/Explore boundary
  feed-search-params.ts readFeedMode / readCategorySlug / isDefaultFeedSelection

src/hooks/feed/
  keys.ts                        feedKeys
  queries.ts                     categories, OFFSET infinite feed, keyset comments
  mutations.ts                   like / save / subscribe / share / comments
  use-watch-progress-beacon.ts   15s heartbeat + keepalive flush

src/lib/{videos,series,playlists}/{api,schemas}.ts   studio write surface
src/lib/videos/studio-view.ts                        UploadDraft <-> wire mappers
src/hooks/{videos,series,playlists,admin-review}.ts
```

### 2.1 Four modules were lifted out of `rnd/`

They are not R&D-specific and the feed needs them. Moved, no shims:

| From                               | To                                                 |
| ---------------------------------- | -------------------------------------------------- |
| `src/hooks/rnd/keyset-list.ts`     | `src/hooks/keyset-list.ts`                         |
| `src/lib/rnd/view-state.ts`        | `src/lib/view-state.ts`                            |
| `src/lib/rnd/filter-href.ts`       | `src/lib/filter-href.ts`                           |
| `src/lib/rnd/idempotency.ts`       | `src/lib/idempotency.ts`                           |
| `…/sections/load-more-control.tsx` | `src/components/home/shared/load-more-control.tsx` |

### 2.2 Two additions to `src/lib/http.ts`

- **`getEnvelope`** — parses the WHOLE envelope, not `envelope.data`. `GET /feed/videos` carries
  three top-level siblings (`data`, `pagination`, `rankSeed`) and `getPaginated` reads two of them,
  silently dropping the seed. A dropped seed means page 2 ranks against a freshly minted one, the
  exploration term reshuffles, and the reader meets a video they already scrolled past.
- **`isForbidden`** — beside `isUnauthorized`. See correction 5.
- `RequestOptions` gained **`keepalive`**, for the beacon's final flush only. See correction 3.

### 2.3 Wire casing, applied

| Thing              | Casing           | Example                                        |
| ------------------ | ---------------- | ---------------------------------------------- |
| Category slugs     | kebab            | `?category=quantum-computing`                  |
| URL filter keys    | short + readable | `?mode=`, `?category=`                         |
| Backend query keys | camelCase        | `?categorySlug=…&rankSeed=…`                   |
| Enum values        | **snake_case**   | `?mode=new_to_you`, `visibility=investor_only` |

`?category=` in the address bar and `?categorySlug=` on the wire are **both correct**: the short
one is what a person reads and shares, the long one is what the backend's `.strict()` schema
declares. `feed-search-params.ts` is the single place that translates.

**The studio's enum values changed spelling.** `studio-videos-context.tsx` wrote
`anime-episode`, `investor-only`, `creative-commons`, `video-and-audio`. Those are `pgEnum`
labels, so all four are now snake_case. The mock never noticed because nothing was ever sent.

### 2.4 A failed read must say WHICH failure it was

`src/lib/http.ts` returns three kinds of failure and they used to be indistinguishable on screen:
`NETWORK` (nothing answered), `PARSE` (the contract broke), and an HTTP status. Every one rendered
"Couldn't load the feed. Please try again."

Worse, **`safeParse`'s error was thrown away** at seven call sites. A single mismatched field on
one row of a 24-row page failed the whole page, and nothing anywhere named the field.

- `toParseError(path, error)` now carries the Zod issue paths on `fieldErrors.contract` and
  `console.error`s the full list **server-side only** — it lands in the `pnpm dev` terminal, which
  is where whoever can fix it is looking. It is not printed in the browser: a visitor cannot act
  on our schema's shape.
- `describeFeedError` (`feed-status-panel.tsx`) branches the copy. `NETWORK` says _"Can't reach the
  server. Is the backend running?"_, which in development is almost always the true and
  five-second-fixable answer.
- **A failed `/feed/categories` is no longer silently "no categories".** It used to go through
  `rowsOrEmpty`, which meant an outage rendered five mode chips and no tile grid — identical to a
  database with no taxonomy seeded, a state this project is in often. The failure now says so.
- The `mode=watched` sign-in prompt is gated on the mode. An expired cookie on `mode=all` used to
  produce a message about a mode the reader never selected.

**Wire timestamps on this surface are `z.iso.datetime()`, not `z.string()`.** A loose `z.string()`
is exactly what let §0 row 9 render: it accepted `'2026-08-02 17:36:54.105'` silently, and the
5.5-hour error surfaced as a plausible-looking label rather than as a failure. A `PARSE` panel
naming `data.0.publishedAt` in the dev terminal is the outcome we want from a malformed instant —
it is loud, and it is fixable in the minute it appears.

Applied to `src/lib/{feed,videos,series,playlists}/schemas.ts` and
`src/lib/videos/admin-review.api.ts`. **Three fields are deliberately still `z.string()`** because
they are not instants and `datetime()` would reject every value they hold:

| Field                 | Column    | Shape          |
| --------------------- | --------- | -------------- |
| `recordingDate`       | `date(…)` | `"YYYY-MM-DD"` |
| `releaseScheduleDay`  | `text(…)` | a weekday name |
| `releaseScheduleTime` | `text(…)` | a clock time   |

**Not swept:** `src/lib/rnd/**` and `src/lib/products/**` hold ~20 more `z.string()` timestamps on
routes nobody has probed. Tightening those blind risks turning a working surface into a `PARSE`
panel over a format that was never checked. That is a separate pass, and it should probe each route
first — the same order this one followed.

> **The order is load-bearing.** Tighten the frontend schema BEFORE the backend emits the right
> format and the homepage becomes a full-page error, because `toParseError` fails the **whole**
> payload — one bad field on one of 24 rows takes the page. Backend first, always.

### 2.5 Remote image hosts — `next.config.ts`

`next/image` **throws** on a host not in `images.remotePatterns`. It is not a soft failure; it is
a runtime error that takes the whole page down, which is how a published video crashed My Videos.

| Host                                                         | Produced by                                                                       |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `**.ytimg.com`, `**.youtube.com`                             | `video.thumbnailUrl`, `daily_log.youtubeThumbnailUrl`                             |
| `res.cloudinary.com`                                         | custom thumbnails, promo slides, category tiles, project covers, uploaded avatars |
| `lh3.googleusercontent.com`, `avatars.githubusercontent.com` | OAuth avatars                                                                     |

**The YouTube entries are WILDCARDS and must stay that way.** The backend does not normalise the
thumbnail to one host — it validates against a SUFFIX allowlist
(`YOUTUBE_THUMBNAIL_HOSTNAME_SUFFIXES = [".ytimg.com", ".youtube.com"]` in its `src/lib/youtube.ts`)
and stores whatever oEmbed returned, verbatim. YouTube serves `i.ytimg.com` today and may serve
`i9.ytimg.com` tomorrow, so pinning the one host that happened to appear re-opens the crash.

### 2.6 `splitFeedPage` — why the boundary is a named function

Recommended and Explore are **one backend stream** (backend §0 Rule 3). The split is ours, and it
lives in one place so `videos.slice(0, 8)` in one component and `videos.slice(8)` in another
cannot disagree the first time anyone changes the page size.

---

## 3. The relative-time trap

Computing `"12 hours ago"` during a server render is **wrong under `cacheComponents`**: the render
is cached, the label freezes at whatever it said when the entry was written, and the client
disagrees on hydrate. The bug is invisible in development, where nothing is cached long enough.

`src/components/home/shared/relative-time.tsx`:

- The API returns `publishedAt` as an **ISO string**, never a pre-formatted label.
- First paint is an **absolute** `<time dateTime={…}>` — server-safe, cache-safe, correct forever.
- An effect swaps in the relative label, with `suppressHydrationWarning` **on that node only**.
- The absolute label is `toISOString().slice(0,10)`, not `toLocaleDateString` — the latter reads
  the SERVER's locale during a server render and mismatches on top of the mismatch we manage.

`VideoCardProps.postedAt` survives for the mock surfaces that hand-author it; feed cards pass `""`
and set `publishedAt`. `formatViewCountLabel` has no such problem and runs anywhere.

**Why this component could not catch §0 row 9.** `formatRelativeTimeLabel` returns `""` on a `NaN`
parse and the component then renders `null`. That is right for its job — one unreadable timestamp
should not take out a card — but it means a malformed instant degrades to a blank space, invisible,
with no console line and no failing render. And a _shifted_ instant is worse still: it parses fine
and prints a confident, wrong number. Neither is detectable here. That is the whole argument for
catching it at the schema boundary instead (§2.4), where it fails loudly and names the field.

---

## 4. Filter state lives in the URL — via `<Link>`, not `router.replace`

`?mode=trending` · `?category=robotics`, read by the SERVER component from `searchParams` and
written by `<Link href={buildFilterHref(searchParams, patch)} scroll={false}>`.

This is correction 2, and it is the established pattern in this repo (`src/lib/filter-href.ts`,
every R&D filter page). It buys three things `router.replace` does not: real back-button history,
middle-click and open-in-new-tab, and a server render that already knows the filter — so a shared
link arrives with the right feed in the first HTML response rather than after a client round trip.

`filter.tsx` stays `"use client"` for its interaction layer, which survived the rewrite verbatim:
roving tabindex (WAI-ARIA toolbar), drag-scroll with a 5px threshold, chevrons that appear only
when there is hidden content. Only the data source and the activation mechanism changed. The
drag-suppression handler is **more** load-bearing now: an unsuppressed post-drag click on an
anchor navigates.

### 4.1 The chip model

```ts
export type FeedChip =
    | { kind: "mode"; mode: FeedMode; label: string }
    | { kind: "topic"; categorySlug: string; label: string };
```

Today's chips are two different kinds of thing wearing one shape — a flat `string[]` cannot
express that, which is Pattern 1's illegal-state problem in miniature. Clicking a chip sets
**either** `mode` **or** `category`, never both: `toChipHrefPatch` always clears the other key.

**`Live` is gone.** No stream domain exists (backend §5.3); a chip that always returns nothing
teaches people the filters are broken. `VideoCardProps.isChannelLive` stays in the type, and the
**backend sends the literal `false`** (correction 6). **`Minimalist`, `Retro`, `Precision`,
`Upcoming` are gone too** — they describe an aesthetic, not a subject.

---

## 5. The component tree

```text
src/app/(home)/page.tsx                                (server, searchParams UNAWAITED)
└─ feed/home.tsx                             props-only
   ├─ <Suspense> promo-carousel-section.tsx  server-fetch
   └─ <Suspense> feed-shell.tsx              server-fetch   ← awaits searchParams HERE
      │                                        • GET /feed/categories
      │                                        • GET /feed/videos?mode=trending&limit=3
      │                                        • GET /feed/videos?limit=24&…
      ├─ filter.tsx                          client-query   categories as initialData
      ├─ recommended-section.tsx             props-only     slice 0–11 → LCP
      ├─ category-tiles-section.tsx          props-only     isTile && imageUrl !== null
      ├─ spotlight-section.tsx               props-only     trending 1–3
      ├─ explore-section.tsx                 client-query   page-1 tail, then infinite
      └─ filtered-feed.tsx                   client-query   replaces the four when filtered
```

**`searchParams` is threaded down as a PROMISE and awaited inside `feed-shell`.** Awaiting it in
`page.tsx` makes the whole route dynamic under `cacheComponents` — including the promo carousel,
which has nothing to do with the filter — and the build fails outright with _"Uncached data was
accessed outside of `<Suspense>`"_. Two boundaries rather than one, so a slow promotional read
never holds back the video grid.

### 5.1 One grid when a chip is active

Spotlight means "the three trending videos" and has no meaning inside a category filter; a
"Recommended for you" heading over a `recently_uploaded` list is a lie about what was asked for;
and the tile grid is a way IN to a filter, not something to show once you are inside one. So any
active facet collapses the page to a single titled grid.

`feed-shell` also **skips the trending read entirely** when a filter is active — paying for a
ranking nobody will see is the kind of waste that only shows up under load.

### 5.2 Per-section state, Pattern 1

Each section owns a discriminated union rendered by an exhaustive `switch` with a
`const exhaustiveCheck: never` default. Each read is lifted separately so one failure does not
blank the others: a `/feed/categories` outage still leaves a working video grid, and a feed
outage still leaves a working chip row (`buildFeedChips([])` returns the five mode chips).

`mode=watched` returns **401 when signed out** (backend §4.8) → `isUnauthorized` → a sign-in
prompt, not an error panel.

---

## 6. Watch page and the beacon

`watch/video-player.tsx` branches on `videoSource`, which is on the wire:

- **`youtube`** — the IFrame API loaded **once behind a module-level promise**
  (`src/lib/youtube-iframe-api.ts`). The API signals readiness through a single global
  `window.onYouTubeIframeAPIReady`, so two players mounting in one tick would each overwrite it
  and one would wait forever for a call that already happened. `enablejsapi: 1` and
  `origin: window.location.origin` are both required; the latter is the thing most often missing
  when a player silently refuses to report state. There are no official types, so the surface we
  touch is hand-declared rather than `any`.
- **`hosted`** — the native `<video>`, kept for Appendix A. No rows use it today.

`use-watch-progress-beacon.ts`:

| Event                           | Action                                                                    |
| ------------------------------- | ------------------------------------------------------------------------- |
| `onStateChange` → playing       | start a 15s interval                                                      |
| interval tick                   | read `getCurrentTime()` / `getDuration()`, POST `/videos/:id/view-beacon` |
| → paused / ended                | stop the interval, flush once                                             |
| → **buffering**                 | **nothing** — a stall is not the end of a session                         |
| `onError`                       | POST the code, narrowed to `{2,5,100,101,150}`; anything else is DROPPED  |
| `visibilitychange` / `pagehide` | flush via **`fetch(..., { keepalive: true })`**                           |
| unmount                         | clear interval, flush, destroy player                                     |

**Not `navigator.sendBeacon`** (correction 3). Backgrounding a tab is the COMMON exit from a
video, not the rare one, so a silently-failing flush would lose most watch time on the platform.

The player reports `0` for both position and duration until metadata lands; the hook refuses to
send then, because `reportedDurationSeconds >= 1` is required and a guaranteed 422 on the
platform's tightest limiter (60/min AND 200/hr) is pure waste.

This is **best-effort by construction**. The beacon is a claim, not a measurement — the server
clamps it against wall-clock elapsed and pins the duration on the first beacon (backend §3.3).
Nothing here needs to be trusted, and nothing here is written as though it is.

---

## 7. Engagement UI

- **Viewer state arrives with the payload.** Both `/feed/videos` and `/feed/watch/:videoId` embed
  `viewerState`, so twenty-four cards do not become twenty-five requests and the first paint
  already shows the right icon fill.
- **Like, save and comment-like are optimistic.** Each has a per-user unique key server-side, so a
  double-tap is idempotent by construction rather than a second like. They settle on the server's
  returned count rather than keeping the guess.
- **Subscribe, share, and every comment write are not.** A subscription is a relationship; a
  comment is a piece of writing that must not appear to have posted when it did not; and
  `shareCount` moves only for a signed-in sharer — it feeds the ranker's engagement rate — so
  incrementing it locally would show a number the server never agreed to.

**Comment create sends `Idempotency-Key` as an HTTP HEADER** (correction 4), 8–200 chars, minted
once per attempt with `useState(newIdempotencyKey)` — passed **uncalled** — and regenerated only
after a success. The R&D surface sends `idempotencyKey` in the BODY because those routes do not
run the same middleware; both are correct in their own place.

**403 is handled separately from 401** everywhere (correction 5). `describeEngagementError` in
`src/hooks/feed/mutations.ts` is the single place that decides: 401 → "sign in", 403 → the
backend's own "finish signing up" message, anything else → the backend's message verbatim.

Three spellings of the same idea are **deliberately not unified**, because renaming at the
boundary would make the schema stop describing the wire: `viewerState.isSubscribedToCreator` on
reads, `isSubscribed` on the toggle response, `hasLiked` / `hasSaved` on both.

The comment thread's **sort pills are gone**. `GET /videos/:id/comments` takes no `sort` param —
the backend fixes newest-first for the thread and oldest-first for replies — and the old pills set
local state that sorted nothing.

**Replies are one level deep and fetched on expand.** They are their own keyset list served in the
opposite order to the thread, so they cannot be sliced out of the parent page and there is nothing
to seed from the server render. `parentCommentId` is part of the query key, so two expanded threads
never share a cache entry. The reply composer appears on top-level comments only — **replying to a
reply is a 409**, and offering a control the server refuses is worse than not offering it.

**Edit is inline**, and carries no idempotency key: an edit is naturally idempotent and the route
does not run the idempotency middleware. Only create does. Edit and Delete are shown to every
signed-in viewer because the **backend** authorises them, answering 403 to anyone who is neither
the author nor the video's creator — a client-side ownership check would need the viewer's own id
on the wire and would still be advisory.

A **tombstone** (`isDeleted`, `body: null`, `author: null`) renders as `[deleted]` rather than
being dropped, and **keeps rendering its replies** — that is the entire reason the backend
tombstones instead of deleting.

---

## 8. Studio, and the two legacy paths that died

`src/lib/videos/`, `src/lib/series/`, `src/lib/playlists/` + matching hooks. Every studio route is
`requireAuth`, owner-scoped, and answers **404 rather than 403** on an ownership failure so ids
cannot be enumerated by watching status codes.

Four shape changes fell out of replacing the context, and all four are visible in the UI:

1. **Mutations are async and can fail.** The context's `addVideo` pushed onto a `useState` array,
   so the upload modal closed on a save that had not happened. It now shows pending, and on
   failure stays open with the backend's own message — a 422 here names the field to fix.
2. **The server owns ids and status.** No more `crypto.randomUUID()` and no local
   `resolveVideoStatus`; whether an anime episode needs review is the backend's call, and
   `derivedStatus` is computed there from four status columns.
3. **Playlists are keyed by id, not title.** `updatePlaylist(previousTitle, …)` merged two
   playlists the moment a creator reused a name.
4. **Counts come from the server.** Playlist `videoCount` and the review queue's tab counts are
   `pagination.total`, not a filter over whatever the browser happened to hold.

### 8.1 Publishing — the step that makes a video exist to viewers

**Saving is not publishing.** `POST /videos` writes `publishStatus: "draft"` and `publishedAt:
NULL`, and the feed's candidate pool requires `published` with a non-null `publishedAt`. A studio
with no publish control therefore uploads videos that can never appear — which is exactly what
shipped, and exactly why an uploaded video was invisible.

Two controls, both wired to `POST /videos/:id/publish`:

- **`videos-list.tsx` row** — Publish / Unpublish / Delete beside Edit.
- **`upload-modal.tsx` step 4** — `Save` and `Save & publish`.

**Publishing does NOT make a private video visible.** `publishVideo` writes `publishStatus` and
never touches `visibility` (`videos.service.ts:1687-1706`), so a private video publishes with a
200 and stays out of the feed. Both controls therefore refuse before sending —
`describePublishBlock` in `src/lib/videos/publish-refusal.ts` — with the reason inline, not just
in a tooltip. A disabled button with a hover-only explanation is invisible on touch.

Four refusals, and they are not interchangeable (`describePublishRefusal`):

| Backend                          | Meaning                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **409** `SOURCE_NOT_VERIFIED`    | YouTube confirmation still in flight. **Retryable** — nothing to fix, which is why the backend made it a 409 and not a 422        |
| **422** `INCOMPLETE_FOR_PUBLISH` | `errors.missing` names fields. `isMadeForKids` is the one that actually happens: create defaults `hasAgeRestriction` but not this |
| **422** gating                   | a YouTube-hosted video cannot be `investor_only` or NDA-gated                                                                     |
| **422** `NOT_READY`              | unreachable for YouTube rows, which are born `ready`                                                                              |

**An anime episode does not publish.** The backend moves it to `reviewStatus: "pending"` and
leaves `publishStatus: "draft"`, so the copy says "submitted for review". Saying "published"
would send the creator looking for it on the homepage.

**`publishStatus: "scheduled"` is a dead end and this frontend cannot fix it.** No cron flips it
to `published` — the backend says so itself at `videos.service.ts:272-277` — so a scheduled video
stays invisible while its badge reads "Scheduled". Both controls warn; the fix is a backend job.

### 8.2 Three things save on their own routes

`POST /videos` is `.strict()` and accepts none of them, so the modal fires them **sequentially**
after the video exists, against the returned id:

```
PUT  /videos/:id/chapters    when the chapters editor has rows
PUT  /videos/:id/playlists   when the playlist picker has a selection
POST /videos/:id/thumbnail   when a custom image was chosen (multipart, field `image`)
```

Before this, all three editors were fully interactive and **discarded their input on save** —
`parseTimestampLabelToSeconds` had zero call sites. The video is saved even when a follow-up
fails, so the message names the step rather than implying the whole save was lost, and `SaveOutcome`
is **returned** rather than read back off state (the error state set in the same tick is stale).

Chapters have list-level rules the editor only hints at: 0 is fine, **1–2 is a 422**, the first
must start at 0, they must ascend, and consecutive starts must be ≥10s apart. The backend's
message already names the offending chapter and is passed through untouched.

### 8.3 Other specifics

- **Category is a multi-select, max 3**, fed by `GET /feed/categories`, sending `categoryIds`. It
  replaced a single select over six hardcoded strings writing to the deprecated free-text
  `video.category` column. This control decides which chip and which tile a video appears under.
- **The thumbnail picker replaced a dead box** reading "Change in mobile app". It previews
  YouTube's own thumbnail by default — every video here is a YouTube link, so there is always a
  real image and a creator happy with it uploads nothing. Custom uploads mirror
  `slide-image-picker.tsx`, including `image/heic` being deliberately absent (the server's libheif
  has no HEVC decoder).
- **Playlist detail** (`/studio/playlists/[playlistId]`) is the only place order can be set —
  `PUT /playlists/:id/videos` takes position from array index, while `PUT /videos/:id/playlists`
  only appends.
- **Both dynamic studio routes prerender a sentinel.** `generateStaticParams` cannot return `[]`
  under `cacheComponents`, and both lists are `requireAuth` so a build machine has nothing real to
  enumerate. The series route previously prerendered two fixture ids from the deleted mock context.
- **`isSourceVerified` badge** — `videos-list.tsx` shows "Verifying…" while a YouTube row is
  unconfirmed, because **publish is refused with a 409** until it is. Without it, an oEmbed outage
  looks like a publish button that silently does nothing. The list row does not carry the flag
  (thirteen fields, and that is not one), so the badge keys on `uploadStatus`.
- **Series reordering is two `PATCH` calls** that swap two `position` integers. There is no bulk
  reorder route.
- **The episode editor's "attach uploaded video" select is gone.** The episode schema has no
  `videoId` — the link is made from the VIDEO side, by uploading with an `anime` block naming the
  series and season. One direction, so it cannot end up half-made. Episodes still SHOW whether a
  video is attached; `videoId` is nullable by design, because a season can be planned before any
  of its episodes exists.
- **The admin review player is real.** It used to show a placeholder MP4; a reviewer now watches
  the actual video they are approving, which is the one thing that screen exists for. The creator
  shows as an ID — the queue row carries `creatorId` and no profile join — because the hardcoded
  `MOCK_CREATOR_NAME` it replaced showed the same name for every submission.

Deleted, not migrated: **`src/lib/videos.ts`** (with `QATOTO_VIDEO_API_URL`, `MOCK_VIDEOS`,
`ANIME_SEASONS`) and **`src/state/studio-videos-context.tsx`** (477 lines, zero `fetch`), plus its
two provider mounts. The store page's comment sheet got its own copy of the old mock thread
(`store/sheets/product-comment-thread.tsx`) rather than being pointed at the video thread — a
product's comments are not a video's comments, and there is no product-comment route.

---

## 9. Phase order

| #   | Scope                                                                           | State |
| --- | ------------------------------------------------------------------------------- | ----- |
| 0   | Lift `keyset-list` / `view-state` / `filter-href` / `idempotency` out of `rnd/` | ✅    |
| 4   | `src/lib/feed/*` + `src/hooks/feed/*`; `filter.tsx` on real categories          | ✅    |
| 5   | `all-content.tsx` → four sections + `feed-shell` + `splitFeedPage`              | ✅    |
| 6   | Explore infinite scroll + `filtered-feed.tsx`                                   | ✅    |
| 7   | Watch page YouTube branch + beacon + engagement + real comments                 | ✅    |
| 8   | Studio writes (videos, series, playlists); legacy paths deleted                 | ✅    |

Numbering continues from the backend phases (backend §9). **Phase 7 is what makes ranking
non-trivial**: until real watch sessions exist, the backend's quality score runs on likes and
velocity with the completion component ramped near zero (backend §4.2). That is expected during
rollout, not a bug.

---

## 10. The `TRANSPORT: mock` placeholders — a decision, not a regression

The R&D surface holds an invariant that `grep -rn "TRANSPORT: mock" src/` returns nothing. **This
surface deliberately breaks it.** Nine UI areas across seven files have no backend counterpart and
were kept rather than deleted; each carries an explicit banner naming the missing field and
pointing here.

| File                                      | What is mock                                  | Why there is no wire field                                                                                                                                                                                                                                                                                    |
| ----------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home/watch/watch-content.tsx`            | `transcript`, `transcriptTitle`               | No transcript table, no ASR job, no column. Kept because the chapter list beside it IS real, and removing it would take the chapter navigator with it. Held **empty**, not invented                                                                                                                           |
| `home/watch/watch-content.tsx`            | `seasons`                                     | `videoType: "anime_episode"` is on the wire and `/series` is a real API, but the PUBLIC watch payload carries no series reference. Held empty, so an anime video renders without its episode grid rather than with a fabricated one                                                                           |
| `home/watch/watch-content.tsx`            | `isPremium`                                   | No premium tier, no entitlement table, no paywall anywhere. Hard-gated to `false` so it can never render over a video the viewer is entitled to watch                                                                                                                                                         |
| `home/watch/comments.tsx`                 | `saleItem`, `reviews`, `trending`             | `/products` exists but nothing joins a product to a video, there is no product-review table, and no search-term aggregation. Held empty, so the Reviews tab collapses rather than showing invented reviews                                                                                                    |
| `home/watch/share-sheet.tsx`              | Download / Report / Not Interested            | No download route (the bytes are on youtube.com), no reporting flow (comment moderation is a deliberate v1 gap, backend §8.4), no "not interested" ranking signal                                                                                                                                             |
| `studio/series/series-editor-modal.tsx`   | poster picker                                 | `posterUrl` is a plain URL on the wire; the only multipart route on the studio surface is the video thumbnail                                                                                                                                                                                                 |
| `lib/videos/studio-view.ts`               | `attachedPitchTitle`, `attachedDocumentNames` | `POST /videos` has neither field and is `.strict()`, so sending either is a 422. **`PublicVideo` returns a read-only `documents` array but nothing writes it — there is no upload route.** A creator who fills these in loses the value on save; the honest fix is a backend field, not a frontend workaround |
| `store/sheets/product-comment-thread.tsx` | the whole thread                              | No product-comment or product-review route exists                                                                                                                                                                                                                                                             |

Every one of these is **empty or inert rather than fabricated**. Nothing on this surface invents a
value the server could have returned; the placeholders keep a layout, not a lie. Delete one only
when its field ships on the wire.

---

## 11. Verification

```bash
pnpm fmt:check && pnpm lint && pnpm build     # all three exit 0
```

Plus the audit CLAUDE.md requires — an uncalled hook is unverified code. It must print nothing.
Note `--no-filename`: without it `rg` prefixes every hook name with its path and the loop reports
every hook as uncalled.

```bash
for h in $(rg --no-filename -o 'export function (use\w+)' -r '$1' src/hooks/ | sort -u); do
  rg -q "\b$h\b" src/components src/app || echo "UNCALLED $h"
done
```

> **THE FIRST THING TO CHECK WHEN A VIDEO IS "MISSING" FROM THE HOMEPAGE.**
>
> Read the panel — the empty state and the error state are different sentences and mean different
> things:
>
> - **"Nothing to recommend yet…"** → the request SUCCEEDED and the backend returned `data: []`.
>   The row is being excluded by the candidate pool. Go to the checklist below.
> - **"Can't reach the server…" / "…can't read" / "Too many requests" / "The server had a
>   problem"** → the request failed, and the copy says how. A contract break also prints the
>   failing field path in the `pnpm dev` terminal.
>
> For an empty result, the decisive test is one anonymous request — no cookie means no creator
> self-exclusion:
>
> ```bash
> curl -s 'localhost:8000/feed/videos?limit=24' | jq '{n:(.data|length), total:.pagination.total}'
> ```
>
> **`n` > 0 while signed-in shows nothing means you are the only creator in the catalog.** That
> used to be a blank homepage. It no longer is — read on.
>
> `feed.service.ts` adds `v.creator_id <> viewerUserId` for every SIGNED-IN viewer, on every mode,
> because otherwise the highest-affinity creator for any creator is themselves. Anonymous viewers
> have no such exclusion. This is correct behaviour and it is the single most confusing thing on
> the surface.
>
> **It is now the LAST rung of the relaxation ladder rather than an absolute.** When the page is
> under-filled and nothing else can fill it, stage 3 drops the self-exclusion and a solo creator
> sees their own catalogue instead of an empty grid. So:
>
> - **Seeing your own videos on `/` means the ladder reached stage 3** — i.e. the catalogue could
>   not fill a page any other way. It is a signal about the catalogue, not a bug.
> - **Not seeing them means it did not need to**, which is the normal, healthy path and what
>   happens at any real catalogue size.
>
> The stage is in the structured log and NEVER in the response body — look for
> `relaxationStage: 3, relaxationReason: "creator self-exclusion dropped"` in the backend terminal
> for that request. If you see stage 3 on a catalogue that should be large, the relaxation is
> masking a different filter problem; work the checklist below rather than trusting the page.
>
> If `n` is 0, this SQL says which condition excluded it:
>
> ```sql
> SELECT id, title, publish_status, visibility, review_status,
>        is_source_verified, published_at, is_made_for_kids
> FROM video ORDER BY created_at DESC LIMIT 3;
> ```
>
> | Reads                          | Meaning                                                        |
> | ------------------------------ | -------------------------------------------------------------- |
> | `publish_status = 'draft'`     | never published — use the Publish button (§8.1)                |
> | `visibility = 'private'`       | publish succeeds and changes nothing visible                   |
> | `is_made_for_kids IS NULL`     | publish 422s with `missing: ["isMadeForKids"]`                 |
> | `is_source_verified = false`   | `verify-youtube-video` has not run — needs `pnpm start:worker` |
> | `publish_status = 'scheduled'` | **permanently invisible**; no cron promotes it                 |
> | `review_status = 'pending'`    | an anime episode awaiting a moderator                          |

`pnpm build` is the load-bearing one — `cacheComponents` is where a relative-time label or a
`searchParams` read outside `<Suspense>` blows up, and step 0's module moves are proved complete
only by a clean TypeScript pass. `/` builds as **Partial Prerender**: promo static, feed streamed.

By hand, with the backend running:

- `curl -s localhost:8000/feed/categories | jq` → rows carrying `id`, `isTile`, nullable
  `imageUrl`. Confirms correction 1 before any UI depends on it.
- `curl -s 'localhost:8000/feed/videos?limit=24' | jq '{n:(.data|length), pagination, rankSeed}'`
  → `rankSeed` is a **top-level sibling**, 32 hex chars.
- Load `/` signed out → a popularity feed, not an error panel.
- Click a category chip → the URL gains `?category=…`, the four sections collapse to one grid,
  **the back button restores the default page** (this is what `<Link>` buys over `router.replace`).
- Scroll Explore → page 2 appends **without reshuffling page 1**. Check the network tab: page 2's
  request must carry the same `rankSeed` page 1 answered with.
- Play a YouTube video, watch >15s → `POST /videos/:id/view-beacon` returns **202**; confirm
  `videoStats.total_watched_seconds` moved.
- **Background the tab mid-play → the flush lands.** This is the `sendBeacon` trap; verify it is
  not silently CORS-blocked.
- Like a video → the count moves optimistically and survives a reload. Post a comment twice fast →
  **one** comment; the replay carries `Idempotency-Replayed: true`.
- Watch page → expand replies, post a reply, edit your own comment. Delete a comment that has
  replies → it renders `[deleted]` **and still shows them**.
- Sign in with an anonymous session and try to like → **403** copy ("finish signing up"), not the
  401 sign-in prompt.
- `/studio` → upload a YouTube link with 3 categories, 3 chapters, a playlist and a custom
  thumbnail, set **visibility Public**, answer **made for kids**, then **Save & publish**. Publish
  is refused with "we are still confirming this video with YouTube" until `isSourceVerified` flips.
- `GET /videos/:id` → `publishStatus: "published"`, `publishedAt` non-null, 3 chapters,
  `hasCustomThumbnail: true`, `playlistIds` non-empty. If chapters are missing, the follow-up call
  failed and the modal said so.
- Save a video with **2** chapters → 422 naming the chapter (the backend wants 0 or 3+).
- Set visibility back to Private → the row's Publish button is disabled with the reason inline.
- `/studio/playlists/<id>` → reorder two videos, reload → the order persists.
- Open an embedding-disabled video in three browsers → it drops out of the feed (backend §8.2).
- `grep -rn "TRANSPORT:" src/components/home/feed/` lists every file.
- `grep -rn "TRANSPORT: mock" src/` returns **exactly** the files in §10 — no more, no fewer.

Per [CLAUDE.md](CLAUDE.md), **no tests are written unless you ask for them.**
