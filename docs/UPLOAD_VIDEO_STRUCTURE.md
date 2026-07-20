# Upload Video — Flow & Structure

Spec for the video upload flow in Creator Studio (`/studio`). This is a **planning
doc** — tweak / delete any step you don't want, then we build only what's left.

> **Phase note:** UI + mock data only. No real upload, no backend, no fetch. Files
> live in React state; the "video list" is an in-memory / mock array. Backend wiring
> comes later.

---

## 1. What exists today

| Piece                | Location                                                                     | State                                                                                               |
| -------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Dropzone card        | [create-studio-page.tsx](src/components/studio/pages/create-studio-page.tsx) | ✅ built — drag/drop + file picker; first file opens the modal, the rest wait with **Edit details** |
| Studio landing route | [studio/page.tsx](<src/app/(studio)/studio/page.tsx>)                        | ✅ renders dropzone                                                                                 |
| My Videos route      | [studio/videos/page.tsx](<src/app/(studio)/studio/videos/page.tsx>)          | ✅ built — list of saved videos incl. anime review status + per-row **Edit**                        |
| Upload details modal | `src/components/studio/upload/upload-modal.tsx`                              | ✅ built — the 4-step wizard (create **and** edit modes)                                            |

**Built:** the YouTube-style modal (Details → Video elements → Checks → Visibility)
and the populated videos list now exist. The same modal is reused to **edit** a saved
video (see §3). Remaining phase note still holds: UI + mock data only, no backend.

---

## 2. Target flow (high level)

```mermaid
flowchart TD
    A([User on /studio]) --> B{How to add?}
    B -->|Drag & drop / Select files| C[File chosen]
    B -->|Go Live Stream| Z1[Live stream flow - separate, out of scope here]
    B -->|Create Store Listing| Z2[/studio/products - separate flow]

    C --> D[Open Upload Modal]
    D --> E[Step 1: Details]
    E --> F[Step 2: Video elements]
    F --> G[Step 3: Checks]
    G --> H[Step 4: Visibility]
    H --> I{Save}
    I -->|Save| J[Video added to My Videos list]
    J --> K([/studio/videos shows the video])

    I -->|Close X| L[Saved as private draft]
    L --> K
```

---

## 3. The Upload Modal — 4 steps

Modal opens as soon as a file is selected. Top has a **stepper** (Details ·
Video elements · Checks · Visibility). Left = form. Right = video preview card
(thumbnail, "Processing video…" then player, video link, filename). Bottom bar =
processing status + **Back / Next / Save**.

**Two modes** (same wizard component):

- **Create** — opened from the dropzone on file select. X / Escape saves the
  in-progress upload as a **private draft** (§2). Right-side preview runs the fake
  "Processing video…" → player.
- **Edit** — opened from a My Videos row's **Edit** button, pre-filled with the saved
  video's fields so anything skipped at upload can be completed later. X / Escape
  **discards** changes; only **Save** applies them. There's no `File` object on edit,
  so the preview shows a static "Preview available on the watch page" placeholder.

```mermaid
flowchart LR
    S1[Details] --> S2[Video elements] --> S3[Checks] --> S4[Visibility]
    S4 -.Save.-> DONE([Draft in list])
```

### Step 1 — Details

| Field                                | Notes                                                                                                                     | Keep? |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ----- |
| Title (required)                     | 0/100 counter                                                                                                             |       |
| Description                          | @-mention hint                                                                                                            |       |
| Video type                           | pitch / demo / update / AMA / **Anime episode** — shapes watch-page layout; Anime episode reveals the anime section below |       |
| Sector / industry tags               | B2B discovery (AI, fintech, health…) — replaces YouTube Category                                                          |       |
| Stage badge                          | idea / MVP / scaling / shipped — signals pipeline stage                                                                   |       |
| Thumbnail                            | screenshot shows "change in mobile app" — decide own behavior                                                             |       |
| Website URL                          | separate clickable CTA on watch page, not in description (see below)                                                      |       |
| Call-to-action button (custom)       | generic CTA — book demo, join waitlist, etc.                                                                              |       |
| Social / contact links               | LinkedIn, X, email — structured fields, not in description                                                                |       |
| Playlists                            | picker → see **Playlists picker** below                                                                                   |       |
| Audience — made for kids? (required) | Yes / No radio                                                                                                            |       |
| Age restriction (advanced)           | collapsible                                                                                                               |       |
| Show more                            | Paid promotion, AI use, etc. (below)                                                                                      |       |

#### Website URL & social links (Qatoto-specific)

Structured fields, **not** links dumped in the description. Each renders as its own
clickable element on the watch page.

- **Website URL** → "Visit website" CTA button. Show domain (not raw href).
- **Social / contact** → LinkedIn, X, email rows.
- Trust note (CLAUDE.md): validate/normalize URL **server-side**, render
  `rel="nofollow noopener"`, don't trust client-claimed verified status.

#### Playlists picker

Clicking the **Playlists** select opens a picker popover (not a plain dropdown):

- **Search** box — "Search for a playlist"
- **Checkbox list** of existing playlists (multi-select), e.g. Car music, java,
  Medatation, Ai and Maths, maths, health and fitness, Health, Watch today…
- **New playlist** button (bottom-left) → opens **Create a new playlist** modal
- **Done** button (bottom-right) closes the picker

**New / empty account:** playlist list is blank — show placeholder copy
_"Please create a playlist"_ with the **New playlist** button as the only action.

```mermaid
flowchart TD
    A[Click Playlists select] --> B{Any playlists?}
    B -->|Yes| C[Picker: search + checkbox list]
    B -->|No / new account| D["Empty state: 'Please create a playlist'"]
    C --> E[New playlist]
    D --> E[New playlist]
    C --> F[Done → selected playlists applied]
    E --> G[Create a new playlist modal]
    G --> H[Playlist created → back to picker, appears in list]
```

##### Create a new playlist modal

| Field                          | Notes                       | Keep? |
| ------------------------------ | --------------------------- | ----- |
| Title (required)               | "Add title"                 |       |
| Description                    | "Add description"           |       |
| Visibility                     | Public / Unlisted / Private |       |
| Default video order            | Date published (newest) / … |       |
| Language (title & description) | select                      |       |
| **Create** button              | disabled until Title filled |       |

### Step 1 (expanded) — "Show more"

| Field                            | Notes                                     | Keep? |
| -------------------------------- | ----------------------------------------- | ----- |
| Paid promotion                   | checkbox                                  |       |
| AI use disclosure                | Yes / No                                  |       |
| Tags                             | 0/500, comma-separated                    |       |
| Language + caption certification | two dropdowns                             |       |
| Recording date + location        |                                           |       |
| License                          | Standard / Creative Commons               |       |
| Allow embedding                  | checkbox                                  |       |
| Shorts remixing                  | video+audio / audio only                  |       |
| Category                         | dropdown                                  |       |
| Comments & ratings               | on/off, moderation, who-can-comment, sort |       |
| Show likes count                 | checkbox                                  |       |

### Step 1 (conditional) — Anime episode mode

Shown **only when `Video type = Anime episode`** (the field in Details). Anime is
curated content, so this branch adds series structure + a release schedule and
routes the upload into an **admin approval queue** instead of publishing straight to
the creator's channel. See `ADMIN_STRUCTURE.md` for the review side.

| Field                     | Notes                                        | Keep? |
| ------------------------- | -------------------------------------------- | ----- |
| Series                    | pick existing series or create new           |       |
| Season                    | number / name (e.g. Season 3)                |       |
| Episode number            | ordering within the season                   |       |
| Episode title             | per-episode title (separate from series)     |       |
| Release schedule          | weekly day + time — "new ep every Fri 18:00" |       |
| Premiere / simulcast date | when it goes live in `/anime`                |       |
| Sub / dub + language      | subbed / dubbed, language list               |       |
| Age rating                | anime rating (not the YouTube kids toggle)   |       |
| Genre tags                | reuse `/anime/genre` taxonomy                |       |

**Destination differs from normal videos:**

- Normal creator video → publishes to the creator's channel directly.
- **Anime episode → on Save, appears in the creator's My Videos (`/studio/videos`)
  with a `Pending` review badge** — not published to `/anime` yet. The modal just
  closes; status is tracked **inline in the My Videos list**. There is **no separate
  `/studio/queue` page** — it was merged into My Videos so anime doesn't get its own
  endpoint.
- From there a Qatoto admin reviews it (`/admin/review`). Shows in `/anime` **only
  after admin approves.** Approval is **server-side only** — client never
  self-approves (thin-client rule, CLAUDE.md).
- **Re-editing:** editing an anime episode (any status) and saving resets it to
  `Pending` — edited content must be re-reviewed.

Two surfaces — don't conflate:

- **My Videos (`/studio/videos`)** — creator's view. Anime rows show read-only status
  (Pending / Approved / Rejected + reason) inline alongside normal videos. No approve
  buttons.
- **`/admin/review`** — staff view. The actual approve/reject actions
  (see `ADMIN_STRUCTURE.md` §4.1).

```mermaid
flowchart TD
    A["Upload, Video type = Anime episode"] --> B[Fill series / season / episode / schedule]
    B --> C[Save → modal closes]
    C --> D["My Videos: row shows as Pending (creator side)"]
    D --> E["/admin/review: Qatoto staff reviews"]
    E --> F{Admin decision}
    F -->|Approve| G[Appears in /anime on premiere/release date]
    F -->|Reject| H["My Videos row shows Rejected + reason"]
    G --> I[Weekly schedule drives next-episode release]
```

Open decisions:

- **Who can upload anime?** any creator, or a gated "anime partner" role only?
- **Series ownership** — one series owned by one creator/studio, or shared?
- **Schedule engine** — does the weekly day auto-release queued episodes, or does
  admin release each manually? (Crunchyroll = scheduled auto-release after licensing.)

### Step 2 — Video elements

| Field                               | Notes                                                    | Keep? |
| ----------------------------------- | -------------------------------------------------------- | ----- |
| Add related video                   |                                                          |       |
| Attach store products               | shoppable — see **Store products picker** below          |       |
| Attach pitch / project              | link to a `/studio/pitches` project seeking funding/team |       |
| Funding / raise CTA                 | "Back this" / invest button → `/studio/funding`          |       |
| Recruit / open roles                | "Join team" — attach open roles, viewers apply           |       |
| Team members list                   | credit founders/team (idea → team step)                  |       |
| Collaborators / team credit         | extend Invite collaborator → show team on video          |       |
| Pitch deck / docs attach            | PDF deck, whitepaper — download under video              |       |
| Milestones / roadmap                | build → ship progress shown to viewers/backers           |       |
| Chapters (manual)                   | timestamp + label list — see **Chapters editor** below   |       |
| Add subtitles                       |                                                          |       |
| Collaboration / Invite collaborator | modal-in-modal                                           |       |

Qatoto-specific rows (pitch / funding / recruit / team) are the thesis
differentiators — idea → **team** → **fund** → build → ship. Prioritize these over
the YouTube-carryover rows below them.

Dropped from YouTube: ~~Automatic chapters~~, ~~Featured places~~,
~~Automatic concepts~~. Chapters kept but **manual only** (below).

#### Chapters editor (manual)

Creator defines chapters by hand — no AI auto-detect. Each chapter = a start
timestamp + a label. Renders as segments on the player scrubber; viewer clicks to
jump.

- **Add chapter** button → new row: `timestamp (mm:ss)` + `title` inputs
- List of chapter rows, reorderable / removable
- Rules (YouTube-compatible, enforce in UI + backend later):
    - First chapter **must** start at `00:00`
    - Minimum **3** chapters to show on player
    - Each chapter **≥ 10 seconds** long
    - Timestamps strictly ascending, none past video duration
- Empty state: "No chapters yet — add one to let viewers jump around"

```mermaid
flowchart TD
    A[Click Add chapter] --> B[Row: timestamp + title]
    B --> C{Valid?}
    C -->|First=00:00, ascending, ≥10s apart, ≤ duration| D[Chapter saved]
    C -->|Invalid| E[Inline error, block save]
    D --> F[≥3 chapters? → segments show on scrubber]
```

| Field per chapter | Notes                      | Keep? |
| ----------------- | -------------------------- | ----- |
| Timestamp         | `mm:ss` / `hh:mm:ss` input |       |
| Title             | short label, e.g. "Demo"   |       |
| Reorder / remove  | drag handle + delete       |       |

#### Store products picker

Attach items from the Qatoto Store (`/store` · `/studio/products`) so viewers can
**buy the product shown in the video**. Products render as shoppable cards / a
"Shop" tab on the watch page.

- **Attach products** button → opens picker popover
- **Search** box — "Search your store products"
- **Checkbox list** of the creator's own store listings (thumbnail · title · price)
- Selected products show as removable chips under the video
- **New / empty store:** blank list, placeholder _"No products yet"_ +
  **Create store listing** link → `/studio/products/create`
- Optional (decide): pin a product to a timestamp so its card pops at that moment

```mermaid
flowchart TD
    A[Click Attach store products] --> B{Any store listings?}
    B -->|Yes| C[Picker: search + checkbox list of own products]
    B -->|No| D["Empty: 'No products yet' + Create store listing"]
    C --> E[Select products → chips on video]
    D --> F[/studio/products/create]
    E --> G[Saved → shoppable cards on watch page]
```

Trust note (per CLAUDE.md): client only picks product ids for display. Backend
re-validates ownership, price, and inventory — never trust client-sent price/qty.

### Step 3 — Checks

| Field           | Notes                     | Keep? |
| --------------- | ------------------------- | ----- |
| Copyright check | mock "No issues found" ✅ |       |

### Step 4 — Visibility

| Field                  | Notes                                                        | Keep? |
| ---------------------- | ------------------------------------------------------------ | ----- |
| Save or publish        | Private / Unlisted / Public radio                            |       |
| Investor-only audience | 4th visibility tier beyond private/unlisted/public           |       |
| NDA / gated visibility | private pitch to selected investors only — gate before watch |       |
| Schedule               | collapsible date picker                                      |       |
| Pre-publish reminders  | static copy                                                  |       |
| **Save** button        | commits video to list                                        |       |

**Visibility tiers (Qatoto):** Private · Unlisted · Public · **Investor-only**.
NDA gating optional on Investor-only — viewer accepts NDA before playback. Trust
note: NDA acceptance + investor identity enforced **server-side**, never client.

---

## 4. Video preview / "processing" behavior

Right-side card in the screenshots:

```mermaid
flowchart TD
    P0[File selected] --> P1["Processing video…" placeholder]
    P1 --> P2[Thumbnail appears]
    P2 --> P3[Playable preview + Video link + Filename]
```

- Phase note: real processing is backend. For UI phase, **fake it** — timeout that
  swaps "Processing video…" → thumbnail → player. Or skip and show static preview.
- Decide: keep the fake processing animation, or go straight to preview?

---

## 5. After Save → My Videos list

`/studio/videos` should render a list/table of saved videos.

```mermaid
flowchart TD
    A[Save in modal] --> B[Append to videos state / mock array]
    B --> C[/studio/videos reads it]
    C --> D[Row per video: thumbnail, title, visibility, date, filename]
```

Open questions:

- Where does the list live? Options:
    - **A)** Local React state (lost on refresh) — simplest for UI phase.
    - **B)** Mock array in a shared module — survives navigation, seeded rows.
    - **C)** Context/provider so `/studio` and `/studio/videos` share it.
- List item shape (columns): thumbnail · title · visibility badge · date · ⋯ menu?

---

## 6. Decisions for you to make

Resolved & built: **1** full 4-step wizard · **2** all "show more" fields kept ·
**3** fake processing kept · **4** storage = **C** (shared context) · **5** first
file opens the modal, the rest wait behind **Edit details** · **7** anime routes to
review, and its creator-side status now lives **inline in My Videos** (no separate
`/studio/queue`).

Original questions, for reference:

1. **Modal scope** — full 4-step wizard, or trim to Details + Visibility only?
2. **Which Step-1 "show more" fields survive?** (long list above — most are
   YouTube cruft you may not want for Qatoto's B2B thesis)
3. **Fake processing animation** — keep or skip?
4. **Videos list storage** — A / B / C above?
5. **Multi-file** — dropzone accepts many files. One modal per file, or batch?
6. **Go Live** + **Create Store Listing** — confirmed out of scope for this doc.
7. **Anime approval** — anime episodes route to admin review, not instant publish.
   Creator-side status shows inline in My Videos (not a separate queue page).
   See §6.5 + `ADMIN_STRUCTURE.md`.

---

## 6.5 Admin approval boundary

Anime episodes (and possibly flagged content later) don't publish on save. Two
surfaces track them — kept separate:

- **My Videos (`/studio/videos`)** (creator side) — anime rows carry a read-only
  status badge (Pending / Approved / Rejected + reason) inline in the normal video
  list. This is where a submitted episode shows right after Save. **There is no
  separate `/studio/queue` page** — merged into My Videos so anime doesn't get its own
  endpoint.
- **`/admin/review`** (staff side) — Qatoto admins do the actual approve/reject. Lives
  in a **separate `(admin)` route group in this same app**, role-gated
  **server-side** — not a separate website (see `ADMIN_STRUCTURE.md`).

```mermaid
flowchart LR
    U[Creator saves anime ep] --> Q["My Videos — creator's list, Pending badge"]
    Q --> ADM["/admin/review — Qatoto staff"]
    ADM -->|Approve| PUB[Shows in /anime]
    ADM -->|Reject| BACK["My Videos row → Rejected + reason"]
```

---

## 7. Files to touch (when we build)

| File                                                                                                                                 | Change                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `src/components/studio/upload/upload-modal.tsx`                                                                                      | ✅ 4-step wizard, create + edit modes                               |
| `src/components/studio/upload/steps/*.tsx`                                                                                           | ✅ one per step (+ `anime-episode-fields.tsx`)                      |
| `src/components/studio/upload/{video-preview-card,chapters-editor,playlists-picker,create-playlist-modal,store-products-picker}.tsx` | ✅ modal sub-components                                             |
| [create-studio-page.tsx](src/components/studio/pages/create-studio-page.tsx)                                                         | ✅ opens modal on file select (`mode="create"`)                     |
| [studio/videos/page.tsx](<src/app/(studio)/studio/videos/page.tsx>)                                                                  | ✅ renders `VideosList`                                             |
| `src/components/studio/videos/videos-list.tsx`                                                                                       | ✅ list + anime status badges + per-row **Edit** (`mode="edit"`)    |
| `src/state/studio-videos-context.tsx`                                                                                                | ✅ shared store (option C) — `addVideo` / `updateVideo` / playlists |
| ~~`src/components/studio/queue/*` · `/studio/queue`~~                                                                                | ❌ removed — merged into My Videos                                  |
