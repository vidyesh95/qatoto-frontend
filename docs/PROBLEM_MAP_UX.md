# Problem Map: UX & UI Design Brief

> **Surface**: `/research-and-development/problem-map`, its cluster detail route, and the
> `ReportProblemSheet` that files into it.
> **Register**: `product` (`docs/PRODUCT.md`). `(home)` chrome rules apply in full.
> **Status**: Design brief. Nothing here is built. The work items are `todo.md` §19.
> **Benchmark**: [thetraffic.in](https://www.thetraffic.in) — `/signals` for the map shell,
> `/grievances` for the board and the Place picker.

---

## 1. Feature summary

Civic Pulse's public face. A founder arrives to find out which reported infrastructure
failures have enough people behind them to be worth building for; a reporter arrives to file
one. Today both jobs are served by a document-scroll page with a 3fr/2fr map-beside-list
block in the middle of it, and neither job is finished: the map does not pan, the list is not
what the map is showing, and a reporter cannot say where the problem is except in prose.

Three things change. The page becomes a **map-first instrument** that fills the viewport.
The reads become **viewport-scoped**, using the bounding-box parameters the backend already
declares. And the report sheet gains an **optional coarse pin**, which is the one thing
`todo.md` §19.1 calls "the one thing blocking a better cluster".

## 2. Primary user action

**Find the cluster that matters and open its record.** Everything else on the surface is in
service of that, including filing a report, which is how tomorrow's cluster gets made.

The report flow's own primary action is narrower and worth naming separately: **say what is
broken and where, in under a minute, on a phone, standing next to it.**

## 3. Design direction

### Colour strategy: Restrained

Tinted neutrals plus `Primary Imprint` (`oklch(0.4736 0.0805 200.55)`) for committed actions
and selected state. `Surface Wash` for the active filter chip. The four opportunity bands
(`red-500` / `amber-500` / `#00696E` / `#CAC4D0`) already exist in `problem-map-pins.ts` and
carry the documented exemption from the One Hue Rule. They stay, unchanged, and they stay
**never colour-alone**: `PIN_SIZE_CLASS` carries the same band by diameter, and the card badge
carries it as a word.

A basemap is a large field of somebody else's colour. OpenFreeMap `liberty` is a pale grey
and buff, which is why the pins read at all. Nothing else on this surface may compete with
them: the panel is `Surface` on a hairline, the chips are the repo's chips, and there is no
new accent anywhere.

### Theme: light

The scene sentence: _a founder in Nairobi, at a desk in ordinary daylight, comparing twelve
reported water failures within a hundred kilometres of them to decide which one has enough
people behind it; and a reporter standing in the sun at the broken thing, phone in one hand,
trying to file it before their bus arrives._ Both halves are outdoors-bright or
office-bright. Neither is a 2am incident console.

⚠️ **This is a deliberate divergence from the benchmark, and it is the second-order
reflex check.** thetraffic is a dark terminal in orange mono, and "civic data map → dark
with an orange accent" is exactly the aesthetic a model reaches for once it has been told
not to make a SaaS landing page. It is also not available to us: `browser-preferences.ts`
records that the appearance preference was removed and "took the whole theme system with
it", so nothing writes `.dark` onto `<html>` today. A dark map inside a light app is a map
that disagrees with its own page, which `civic-pulse-map.ts` already refuses by reading the
class rather than the media query. Light basemap, and `resolveMapStyleUrl` keeps working for
free on the day appearance returns.

### Anchor references

1. **thetraffic.in `/signals`** — the shape being borrowed. Full-bleed map; a floating
   panel holding search, filter chips, a `579 shown` count and a scrolling list; a legend
   strip pinned bottom-right; map controls bottom-right. The panel and the map are one
   instrument, not two sections.
2. **thetraffic.in `/grievance`, the Place block** — the shape the picker is borrowing.
   Search field beside a "Use my location" button, a map you tap, and a readout strip under
   it reading `12.97207, 77.59401 · a junction on file · Kasturba Road × Vittal Mallya Road ·
osm · Clear`. A coordinate, a named place, a provenance token, and an undo, on one line.
3. **Apple Maps' iOS sheet** — the mobile model. Three detents over a live map, the map
   interactive at every one of them, and a drag handle that is a real control rather than a
   decoration.

Explicitly **not** an anchor: any dashboard whose map is a widget in a grid of widgets. The
map is the page.

## 4. Scope

|                   |                                                                                  |
| ----------------- | -------------------------------------------------------------------------------- |
| **Fidelity**      | Production-ready. This is shipped chrome on a live surface, not an exploration.  |
| **Breadth**       | Three routes: the map index, `cluster/[clusterId]`, and `ReportProblemSheet`.    |
| **Interactivity** | Shipped-quality. Real pan, real zoom, real refetch, real pin drop.               |
| **Time intent**   | Polish until it ships. The surface is already live and already wrong on a phone. |

## 5. Layout strategy

### The shell it sits inside

`(home)/layout.tsx` gives us a `sticky top-0 z-50` navbar at **56px**, a sidebar that is
`sticky top-14 h-[calc(100dvh-56px)]` and 320px / 80px, and a `fixed inset-x-0 bottom-0`
mobile bottom nav under `md`, for which `<main>` already reserves
`pb-[calc(5rem+env(safe-area-inset-bottom))]`.

The map region is therefore **`h-[calc(100dvh-56px)]`**, which is byte-identical to the
sidebar's own height expression. It is deliberately the same number rather than a better one.

⚠️ **`AlphaBanner` is in normal flow above the flex row and is NOT accounted for by either
expression.** It is roughly 37px (`py-2`, `text-sm`), so the sidebar is already that much too
tall today and the map region will inherit the same error. **Do not fix it here with a second
measurement system**; one surface computing its height differently from the sidebar beside it
is worse than both being consistently off. It is filed as its own item (`todo.md` §19.9) and
fixes both in one place.

### Desktop, `lg` and up

```
┌──────────────────────────────────────────────────────────────┐
│ navbar (sticky, 56px)                                        │
├────────────┬─────────────────────────────────────────────────┤
│  sidebar   │  ┌─────────────┐                                │
│  320 / 80  │  │ PROBLEM MAP │        M A P                   │
│            │  │ ⌕ search    │           ●   ●                │
│            │  │ [chips]     │      ●                         │
│            │  │ 12 shown ⌄  │              ●        ●        │
│            │  │ ─────────── │                                │
│            │  │ ▸ cluster   │   ●                            │
│            │  │ ▸ cluster   │            ●                   │
│            │  │ ▸ cluster   │                         [+][−] │
│            │  │ [Report]    │  legend ·············· [⌖]     │
│            │  └─────────────┘                                │
└────────────┴─────────────────────────────────────────────────┘
```

- The panel is **360px**, docked left **inside** the map region, `Surface` ground, 1px
  hairline, `rounded-2xl`, `shadow-lg`. Shadow is permitted here and only here: the panel
  genuinely floats above the canvas, which is §4's stated exception to the Hairline-First
  Rule. **It is opaque.** No blur, no glass, no translucency over the tiles.
- Panel internals, top to bottom: the eyebrow `PROBLEM MAP` and the one-line standing note
  ("Each pin is a cluster of reports from separate people"); the category and region chip
  rows; the count readout and the sort control; a hairline; the scrolling cluster list;
  a `Report a problem` button pinned to the panel's bottom edge, outside the scroll.
- The map owns the rest. Zoom and locate controls bottom-right, MapLibre's own. The ODbL
  attribution is MapLibre's and stays compact where it is.
- The legend is a single bottom-left line in `label` type, not a box:
  `High ●  ·  Medium ●  ·  Low ●  ·  Not scored yet ●`, each glyph at its real pin diameter
  so the size channel is legible rather than asserted.
- **The page does not scroll.** `<main>` gets `overflow-hidden` on this route only; the
  panel list is the one scrolling region.

### Tablet, `md` to `lg`

The sidebar is present at 80px, so horizontal room is the constraint. The panel **docks left
at 320px and collapses to a 44px vertical tab** carrying the count and a chevron, so a
reader who wants the whole map can have it without losing where the filters went. Collapsed
state is a `useState` in the client island, not a URL param and not storage: it is a glance
preference, and `browser-preferences.ts` owns the one storage key this app is allowed.

### Mobile, under `md`

```
┌───────────────┐
│ navbar  56px  │
├───────────────┤
│               │
│   M A P       │   ← 55dvh, interactive at every detent
│      ●   ●    │
│  ●            │
├───────────────┤
│      ▃▃▃      │   ← drag handle, a real <button>
│ [chips ······]│   ← peek detent: chips + count + 1 row
│ 12 clusters   │
│ ▸ cluster     │
├───────────────┤
│  bottom nav   │   80px + safe area, untouched
└───────────────┘
```

- Three detents: **peek** (chips, count, one row), **half** (`50dvh`), **full** (map keeps a
  `25dvh` strip, never zero). The map stays interactive at all three.
- The sheet sits **above** the bottom nav and never under it. Its bottom padding is the same
  `env(safe-area-inset-bottom)` the nav uses.
- `Report a problem` is a full-width button in the peek detent, which is the one thing a
  reporter standing at the broken thing came for.
- ⚠️ **The sheet is not a modal and must not be built as one.** No scrim, no focus trap, no
  `inert` on the map. `docs/Design.md` §6 and the impeccable shared laws both ban modal-as-
  first-thought, and a modal here would make the map unreachable while the list is open,
  which is the opposite of the point.

### What moves off the page

The `h1`, the description and the two standing notes currently sit in document flow above
the map. In a non-scrolling page they cost 120px of the thing the reader came for. The
eyebrow and the cluster note move into the panel header; the `h1` stays as a visually-hidden
`<h1>` for the document outline and the accessible name. **`MyProblemReportsPanel` moves out
of this route entirely** — it is a personal, signed-in, polling list with no relationship to
what is on the map, and it belongs beside the report flow. Put it in the report sheet's
"filed" state and on the R&D account surface, not under a map that does not scroll.

## 6. Key states

Every one of these is a variant of one discriminated union rendered by an exhaustive
`switch` with a `never` default (CLAUDE.md Pattern 1). None is a boolean.

| State                                     | What the reader sees                                                                                                                                                                                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Loading, first paint**                  | Static SVG canvas with pins already on it (the server render, unchanged), panel rows as hairline skeletons. The pins are never missing: `getServerMapCanvasModeSnapshot` returns `static` for exactly this reason.                                                                                           |
| **Tiles loading**                         | `Loading map…` caption over the canvas, as today. Nothing else.                                                                                                                                                                                                                                              |
| **Tiles arrived**                         | Overlay renders nothing. An overlay saying "loaded" over a loaded map is the placeholder Principle 2 rules out.                                                                                                                                                                                              |
| **Tile host dead** (3 consecutive errors) | Hands back to the static SVG canvas with every pin intact. Never a message over a dead canvas.                                                                                                                                                                                                               |
| **No WebGL2**                             | Static SVG canvas. A map, approximate, with pins.                                                                                                                                                                                                                                                            |
| **`prefers-reduced-data`**                | Panel list only, full width, no canvas at all. The SVG is a 2000×857 image, which is the thing being avoided.                                                                                                                                                                                                |
| **Empty: nothing clustered yet**          | "No problems have been clustered yet." Plus the report button. This is the cold-start state and it is the only one that should recruit.                                                                                                                                                                      |
| **Empty: filters match nothing**          | "No clusters match these filters." Plus a `Clear filters` link that drops `?category` and `?region`.                                                                                                                                                                                                         |
| **Empty: viewport holds nothing**         | ⚠️ **A third message, and it must not be either of the two above.** "No clusters in this view. Zoom out to see more." The reader's filters are fine and the data is fine; they are just looking at the wrong ocean. Collapsing this into "no matches" tells them to change a filter that is not the problem. |
| **Read failed**                           | `RndErrorPanel`, "Couldn't load the problem map." The map region renders the basemap with no pins rather than a grey box.                                                                                                                                                                                    |
| **Cluster selected**                      | Pin takes `ring-[3px] ring-offset-2` and `aria-pressed="true"`; the list row takes the `Primary Imprint` border and ground; map `easeTo` the centroid; `?cluster=<id>` enters the URL; the row reveals `Open this cluster →`.                                                                                |
| **Cluster unscored**                      | Badge reads "Not scored yet", pin takes the grey ring at the smallest diameter. Never "Opportunity 0".                                                                                                                                                                                                       |
| **Cluster with `locationLabel: null`**    | "Location not resolved yet". Never a fabricated place name, never the raw coordinate standing in for one.                                                                                                                                                                                                    |
| **Cluster merged**                        | Detail page keeps its existing merged notice. On the map a merged cluster is not a pin; the getters already decide that.                                                                                                                                                                                     |

### Report sheet states

| State                                  | What the reporter sees                                                                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Place untouched**                    | Map at a sensible default, caption "Tap the map to mark the place. Optional." No marker, no coordinate, no readout strip.                                   |
| **Place marked**                       | Marker; readout strip below the map: `12.972, 77.594` in `code` type, the rounding note, and `Clear`.                                                       |
| **Geolocation asked**                  | Button reads "Locating…", disabled.                                                                                                                         |
| **Geolocation refused or unavailable** | One line: "We could not get your location. Tap the map instead, or just type where it is." Never a retry loop, never a permissions lecture.                 |
| **Place picker map unavailable**       | The Place block renders the free-text field and nothing else. A report with no pin is a valid report; that is what "optional" means.                        |
| **Submitting**                         | "Sending…", submit disabled.                                                                                                                                |
| **Filed (202)**                        | Existing `RndSheetConfirmation` copy, unchanged. It is already correct: the report is queued, it is not on the map, and where it lands is decided by a job. |

## 7. Interaction model

### The URL is the state

`?category=`, `?region=`, `?sort=`, `?cluster=`, and the viewport as `?lat=&lng=&z=`.
Defaults are written **out** of the URL, so the canonical path stays canonical — the
`?view=business` precedent in the blueprints surface. A founder sending "look at this" sends
a link that opens on the same map at the same zoom with the same pin selected, which is the
single highest-value thing this surface can do and it does not do it today.

### Pan and zoom drive the fetch

`moveend`, debounced, writes the viewport into the URL and refetches with the four bbox
microdegree parameters. This is `todo.md` §19.4 and it is the piece that makes the panel
list true: the list is **what is on screen**, so the count readout is an answer rather than
a coincidence.

⚠️ **All four bbox parameters or none.** `ListProblemClustersQuerySchema` rejects a partial
box with a 422. ⚠️ **This turns `problem-map-canvas` from `TRANSPORT: props-only` into
`client-query`** and needs a `useProblemClustersQuery` hook that does not exist. The
`TRANSPORT:` banner on the first line of the file is the check that this doc stays true, and
it must be updated in the same commit.

### Panel ordering stays the server's job

thetraffic sorts its list by distance from the map centre and re-sorts as you pan. **We do
not copy that yet, and the reason is the thin-client invariant rather than effort.**
`PROBLEM_CLUSTER_SORTS` is `opportunity | recent | reporters`; there is no `distance`, and
sorting a fetched page in the browser is the exact defect `problem-map-page.tsx` already
records against its own history ("Filtering used to happen in the canvas over an in-memory
array, which cannot survive pagination"). The panel gets a visible sort control bound to
`?sort=`, and distance ordering is a named backend ask (`todo.md` §19.8), not a client loop.

### Pin and row are one selection

Already true and it stays true: `ProblemMapCanvas` owns `selectedClusterId` and hands it to
whichever canvas is live, so the vector and static renderers cannot behave differently.
Hovering a row raises its pin's ring; clicking either selects both; clicking the selected one
again clears it.

⚠️ **Every pin stays a real `<button aria-pressed>` portalled into a MapLibre marker
container.** `tests/specs/rnd-backend.spec.ts` asserts on that selector, and the obvious
alternative — a GeoJSON symbol layer — draws pins into the WebGL canvas where they have no
DOM node, no focus and no accessible name.

### Motion

`transition-colors` at 200ms on rings, chips and rows, and nothing else. The map's own
`easeTo` on selection, which is MapLibre's camera and not a CSS animation. **No layout
property is animated** — the panel collapse is a discrete width change, not a transition, and
the sidebar's existing `transition-[width]` is named debt in `docs/Design.md`, not a pattern
to copy. The bottom sheet's detent change is a `transform: translate3d` on the sheet, which
is a compositor property and not layout.

### The report flow, end to end

1. `Report a problem` in the panel opens the existing `RndSheet`.
2. Title, Category (the existing creatable combobox, unchanged), **Place**, Description.
3. Place holds: the free-text field that exists today, a "Use my location" button, and a map.
4. Tapping the map drops one marker and reveals the readout strip. Tapping again moves it.
   `Clear` removes it and the report goes back to being text-only.
5. Submit. 202. The confirmation says what it says today.

## 8. The pin, and what it is allowed to claim

This is the part of the brief that is not layout, and it is the part most likely to be got
wrong.

### The reporter's pin: 3 decimals, rounded in the browser

⚠️ **The client rounds to 3 decimals (~110 m) BEFORE sending, and that is the whole
mechanism.** It is not a courtesy. `GEOLOCATION_PRIVACY.md`'s correction header says the
hazard is real and "the answer here is not to collect it, rather than to collect it and
defend it" — a server that never receives a precise point has no dual-storage split to
build, no `fuzzCoordinateForPublicMap` to write, no 90-day purge to promise and no
coordinate-erasure path to serve a DSR with. Every one of those is unnecessary rather than
unbuilt, and it stays that way only as long as the rounding happens in the browser.

- Wire fields: `approxLatitudeMicrodegrees` / `approxLongitudeMicrodegrees`, integer
  microdegrees, **both or neither**, mirroring the bbox rule. A frontend Zod refinement makes
  one-without-the-other unconstructible.
- ⚠️ **The server re-quantizes on receipt.** CLAUDE.md: the client is hostile and its rounding
  is a UX affordance, not a control. A client that posts 6 decimals must have them thrown
  away server-side, not trusted because our own code would not have done it.
- The pin is **optional**. `locationText` stays required and stays the label. A reporter who
  cannot read a map files the same report they file today.
- ⚠️ **No consent checkbox.** There is nothing to consent to that the one-line disclosure does
  not already say, and `GEOLOCATION_PRIVACY.md` §4's checkbox text contains a 90-day purge
  promise we cannot keep and a "stored privately" claim that is false once there is nothing
  precise to store. A tick-box asserting two untrue things is worse than a sentence asserting
  one true one.
- Disclosure copy, once, under the map: **"Rounded to about 110 m before it leaves your
  browser. We never receive a more precise point than this."**
- `navigator.geolocation` rounds in the success callback, before the value reaches state.
  The raw reading is never held in a variable that outlives the callback.

⚠️ **`report-problem-sheet.tsx:36-39` currently says "There is no place picker here because
there must not be one." That comment becomes false the day this ships and must be rewritten
in the same commit, not left to contradict the code beneath it.** The rule it was protecting
did not change; what changed is that rounding-before-send satisfies it.

### The public map's pin: a centroid, and it says so

⚠️ **A cluster pin is not an incident location and no part of this design may imply that it
is.** `geocode-and-cluster-submission.ts` matches within a **25 km radius**, and the centroid
published on the wire is quantized. So the pin marks the middle of a catchment that may be
50 km across.

- The selected cluster's readout prints the centroid in `code` type at 3 decimals, beside the
  word `Centroid`, never beside the word "Location".
- The standing note in the panel header stays: each pin is a cluster of reports from separate
  people.
- ⚠️ **Do not draw a radius ring yet.** A 25 km circle would be the most honest possible
  rendering of what a pin means, and it is the right eventual answer — but the radius is a
  backend constant the frontend would have to hardcode, and a hardcoded circle silently
  becomes a lie the day the backend tunes it. It ships when the radius ships on the wire
  (`todo.md` §19.8).
- ⚠️ **Do not render a precision or accuracy figure anywhere on the public map.** thetraffic
  prints `±3911 m` on a device-located grievance because it has a device accuracy reading to
  print. We have no such field and inventing one would be the unattributed number PRODUCT.md
  bans.

## 9. Content requirements

All UI copy. Sentence case for buttons and nav. Uppercase eyebrows, two to four words. No em
dashes, no exclamation marks, no urgency.

| Slot              | Copy                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Panel eyebrow     | `PROBLEM MAP`                                                                                                                                    |
| Standing note     | "Each pin is a cluster of reports from separate people. Opportunity scores are recomputed on a schedule, so a new cluster may not have one yet." |
| Count readout     | "12 clusters in view" · "1 cluster in view" · nothing at zero (the empty state speaks instead)                                                   |
| Sort control      | "Opportunity" · "Most recent" · "Most reporters"                                                                                                 |
| Empty, cold start | "No problems have been clustered yet."                                                                                                           |
| Empty, filtered   | "No clusters match these filters." + "Clear filters"                                                                                             |
| Empty, viewport   | "No clusters in this view. Zoom out to see more."                                                                                                |
| Read failed       | "Couldn't load the problem map."                                                                                                                 |
| Legend            | "High · Medium · Low · Not scored yet"                                                                                                           |
| Cluster badge     | `Opportunity 84` · "Not scored yet"                                                                                                              |
| Cluster meta      | "342 reporters" · "342 reporters · 401 submissions" (the second clause only when they differ)                                                    |
| Unresolved place  | "Location not resolved yet"                                                                                                                      |
| Open control      | "Open this cluster →"                                                                                                                            |
| Report button     | "Report a problem"                                                                                                                               |
| Place section     | label "Where is it?", caption "Tap the map to mark the place. Optional."                                                                         |
| Place readout     | `12.972, 77.594` · "Rounded to about 110 m before it leaves your browser. We never receive a more precise point than this." · "Clear"            |
| Locate button     | "Use my location" / "Locating…"                                                                                                                  |
| Locate failed     | "We could not get your location. Tap the map instead, or just type where it is."                                                                 |
| Submit            | "Send my report" / "Sending…"                                                                                                                    |

**Realistic ranges.** Clusters in view: 0 at most zooms, 1 to 8 typical, up to the page limit
of 50 at world zoom. `distinctReporterCount`: 1 to a few hundred. `locationLabel`: null is
ordinary. `opportunityScorePoints`: null until the nightly job has run, which for a new
cluster is the normal state rather than an edge case. `description`: nullable on a cluster,
20 to 5,000 characters on a submission.

## 10. Accessibility

WCAG 2.2 AA as a merge gate, per PRODUCT.md.

- The **panel list is the keyboard and screen-reader path for the map**, and it is why the
  list is not optional at any breakpoint. Every pin has a row; every row reaches the same
  record.
- The map container keeps `role="application"` with an accessible name and MapLibre's
  `keyboard: true`, so pan and zoom work without a pointer. `cooperativeGestures` stays on:
  without it a two-finger scroll over a full-height map eats the page.
- Pins stay real buttons with `aria-pressed` and an accessible name of
  `"<title> — <locationLabel or 'location not resolved'>"`.
- The bottom sheet's drag handle is a `<button>` with `aria-expanded` and `aria-controls`;
  the detents are reachable by Enter and by arrow keys, not by drag alone.
- The panel collapse tab on tablet is a `<button>` with `aria-expanded`.
- Opportunity band is never colour-alone: size on the pin, a word on the badge, a word in the
  legend.
- Focus rings are never removed. New controls take
  `focus-visible:outline-2 focus-visible:outline-offset-2` on top of the field recipe's
  border shift, which `docs/Design.md` §5 records as too thin on its own.
- The legend glyphs are decorative and take `aria-hidden="true"`; the words carry the meaning.

## 11. Existing defects this work must fix

Found while reading the surface. Each is small, each is in scope, and each is currently
shipped.

1. ⚠️ **Serif Boundary violation, two files.** `problem-map-page.tsx:126` and
   `cluster-detail-page.tsx:79` both render `font-serif` on an `h1` inside `(home)`.
   `docs/Design.md` §3: "A serif heading inside `(home)`, `(studio)` or `(admin)` is a bug."
2. **The cluster detail's four-panel `dl` is an identical card grid** (four bordered boxes,
   each a label over a figure) and the third of them is the hero-metric shape. Both are named
   bans. Replace with a hairline definition row, figures in `code` type, no boxes.
3. **`ProblemClusterList` renders its own empty state** ("No clusters match these filters")
   while the server page renders a different one for the same condition. Two components
   answering the same question in two voices; the list's copy should go.
4. **Hardcoded hex throughout** — `#00696E`, `#CAC4D0`, `bg-[#00696E]/5`. New work uses the
   tokens; converting the existing lines is its own change with its own dark check, per
   `docs/Design.md` §6. Do not bundle it.
5. **`tests/specs/rnd-backend.spec.ts:126` is flaky with the flag on** and asserts the static
   canvas's alt text, which races the post-hydration upgrade. Known, recorded in `todo.md`
   §19, and **not to be touched without being asked** — tests are not modified unasked.

## 12. Recommended references during implementation

- `docs/Design.md` §2 (Container Rule, One Hue), §3 (Serif Boundary, Two-Size Rule),
  §4 (Hairline-First, Nested Panel Prohibition), §6 (the full don't list).
- `docs/PRODUCT.md` Principles 1, 2 and 4.
- `docs/GEOLOCATION_PRIVACY.md` **correction header only**. The body below it is superseded
  and the fuzzing function in §3 is wrong as written (it jitters latitude and returns
  longitude unjittered). It is not a function to port.
- `docs/MAP_TILE_FALLBACK.md` for the degradation ladder already built.
- `todo.md` §19, items 1 and 4, which this brief is the design for.

## 13. Open questions for the implementer

1. **Does the viewport belong in the URL on every `moveend`, or only on selection?** Writing
   it on every pan gives a linkable view and a browser-history entry per drag. Recommend
   `router.replace` rather than `push`, debounced, so the back button leaves the surface
   rather than replaying a pan.
2. **What is the default viewport for a first-time visitor?** Today `fitBounds` opens on the
   clusters that exist, which is right for 12 fixtures and wrong for 12,000 rows. Probably
   stays `fitBounds` until there is enough data for it to be silly.
3. **Does the sort control belong in the panel or on the map?** Brief says panel. It is a
   property of the list, not of the geography.
4. **Does the tablet panel remember its collapsed state across navigations?** Brief says no
   (component state). If it should, it folds into the browser-preferences blob and nowhere
   else.
