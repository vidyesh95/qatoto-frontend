# STUDIO_BACKEND_STRUCTURE.md — Qatoto Creator Studio: Video-Upload API

> This document describes the **video-upload** contract the Next.js Creator Studio depends on,
> and how it is wired on the Express backend (`/Users/vinitchuri/code/backend/qatoto-backend`).
> It is the sibling of [STORE_BACKEND_STRUCTURE.md](STORE_BACKEND_STRUCTURE.md) (product
> listings) and [BACKEND_STRUCTURE.md](BACKEND_STRUCTURE.md) (auth & identity) — same voice,
> same layering (routes → controllers → services), same `Result<T, E>` envelope, same
> zero-trust §0 — scoped to the **video upload** flow at `/studio` and **My Videos** at
> `/studio/videos`.
>
> **Goal:** let a signed-in creator upload a video, fill its metadata (details, chapters,
> shoppable products, pitch/funding/recruit attachments, playlists, visibility tier), publish
> it, and — for **anime episodes** — route it through an admin review queue — with the backend
> as the only source of truth **and running cost kept near zero**.
>
> **Scope:** video **upload** only. **Go Live Stream is explicitly out of scope** (separate
> future doc). Store listings live in [STORE_BACKEND_STRUCTURE.md](STORE_BACKEND_STRUCTURE.md).
>
> **Cost stance (headline — see §5):** the backend **never touches video bytes**. The client
> uploads the file **directly to the video provider** via a resumable URL the backend mints, so
> there is **no server egress, no proxy bandwidth, no memory blowup**. Transcoding + adaptive
> HLS + CDN delivery are offloaded to the provider's network (generous free tier). Postgres
> stores only ids + metadata.
>
> **Provider:** **Livepeer Studio** is the first implementation — already provisioned in the
> backend `.env.example` (`LIVEPEER_API_KEY`, `LIVEPEER_SIGNING_KEY_PUBLIC/PRIVATE`). It sits
> **behind a seam** (§5.1) so it can be swapped for Cloudflare Stream / ImageKit / a self-hosted
> Hetzner box later without a schema or frontend rewrite.
>
> **Status:** the frontend upload flow ([create-studio-page.tsx](src/components/studio/pages/create-studio-page.tsx)
> → [upload-modal.tsx](src/components/studio/upload/upload-modal.tsx) →
> [studio-videos-context.tsx](src/state/studio-videos-context.tsx)) is **pure UI + mock data**
> today — saves push into a React `useState` store, nothing is submitted, the video list is a
> seeded array. This doc is the spec the backend-integration phase implements. The video domain
> does **not** exist in the backend yet (greenfield: no video/playlist/series table or route).

---

## 0. The one rule that governs everything

**The frontend is a hostile, untrusted presentation layer. The backend is the only source of
truth.** (Same NON-NEGOTIABLE principle as [CLAUDE.md](CLAUDE.md) §"thin client",
BACKEND_STRUCTURE.md §0, and STORE_BACKEND_STRUCTURE.md §0 — applied to video.)

Anyone can open DevTools, read the client JS, and forge any request. So for every upload
mutation the backend **re-checks everything, every request, by itself**:

- **Ownership is server-derived.** The creator id comes from `req.user.id` (the session cookie,
  via `requireAuth`), **never** from the request body. A video's `creatorId` is stamped from the
  session at create time and can never be changed by the client.
- **Every `/videos/:id*` route re-verifies ownership** before acting: load the row, confirm
  `video.creatorId === req.user.id`, else respond **`404`** (not `403` — a stranger must not be
  able to probe which video ids exist).
- **The upload bytes are never trusted and never proxied.** The backend hands the client a
  short-lived upload URL and the client uploads **straight to the provider**. The backend later
  learns the real duration / size / readiness from a **signature-verified webhook**, not from
  anything the client claims. A client that POSTs `durationSeconds: 5` is ignored.
- **Playback of gated tiers is server-authorized.** `private` / `investor_only` / NDA videos are
  only playable with a **short-lived JWT the backend mints** (signed with the provider signing
  key) after it re-checks the caller is allowed. The client cannot self-issue access.
- **Publish is gated server-side.** "Save draft" vs "Publish" is UX; the server decides whether a
  video is _complete enough_ to go live (title, `uploadStatus = ready`, a visibility tier) at
  `POST /videos/:id/publish`, and rejects with `422` otherwise.
- **Anime approval is server-side only.** An anime episode never self-publishes. On publish it
  goes to `reviewStatus: pending`; only a `moderator`/`admin` (role re-derived from the session,
  §10) can approve it into `/anime`. The client's "Save" is a submission, not an authorization.
- **Attached products/pitches are re-validated.** The client only sends ids; the backend
  re-confirms the caller owns each attached `product` (and the price/inventory shown to a buyer
  is always re-derived, never trusted from the video attachment — per STORE §0).
- **Validate the shape of every body/query** with Zod `.safeParse()` → `422` on failure, using
  `.strict()` to reject unknown keys (the prevailing controller style in this backend).

If you remember nothing else from this file, remember §0.

---

## 1. What the frontend expects

The creator surface is two pages plus a modal:

- **Upload landing** — a dropzone
  ([create-studio-page.tsx](src/components/studio/pages/create-studio-page.tsx)): selecting the
  first file opens the modal; the rest wait behind **Edit details**.
- **Upload modal** — a 4-step wizard
  ([upload-modal.tsx](src/components/studio/upload/upload-modal.tsx)): **Details → Video elements
  → Checks → Visibility**, reused in **create** and **edit** modes. The right-side card shows
  "Processing video…" → player once ready.
- **My Videos** — the creator's list
  ([videos-list.tsx](src/components/studio/videos/videos-list.tsx)): each row shows thumbnail,
  title, visibility, date, and — for anime — a read-only review badge (Pending / Approved /
  Rejected + reason). Per-row **Edit** re-opens the modal.

The shared shape is `StudioVideo` in
[studio-videos-context.tsx](src/state/studio-videos-context.tsx) — every field below maps to a
column or child table in §4.

### Field mapping (form → contract)

| Frontend field (`StudioVideo`)                             | Backend field                                                  | Notes                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| `title`                                                    | `title`                                                        | 1–100 chars (modal shows a 0/100 counter)                |
| `description`                                              | `description`                                                  | nullable                                                 |
| `videoType`                                                | `videoType` (enum)                                             | `pitch`\|`demo`\|`update`\|`ama`\|`anime_episode`        |
| `stageBadge`                                               | `stageBadge` (enum)                                            | `idea`\|`mvp`\|`scaling`\|`shipped`                      |
| `sectorTags` (`string[]`)                                  | `sectorTags` (`text[]`)                                        | B2B discovery tags (replaces YouTube Category)           |
| `websiteUrl`                                               | `websiteUrl`                                                   | normalized + `rel="nofollow noopener"` server-side       |
| `callToActionLabel`                                        | `ctaLabel`                                                     | paired with `ctaUrl` (custom CTA button)                 |
| `linkedinUrl` / `xProfileUrl` / `contactEmail`             | same                                                           | structured social rows, not dumped in description        |
| `isMadeForKids`                                            | `isMadeForKids`                                                | required Yes/No                                          |
| `hasAgeRestriction`                                        | `hasAgeRestriction`                                            | advanced                                                 |
| `selectedPlaylistTitles`                                   | `playlist_item` rows                                           | playlist membership (§4)                                 |
| `chapters` (`VideoChapter[]`)                              | `video_chapter` rows                                           | manual chapters (§4, §6)                                 |
| `attachedProductIds`                                       | `video_attached_product` rows                                  | shoppable; ownership re-verified                         |
| `attachedPitchTitle` / `hasFundingCallToAction`            | `attachedPitchId` / `hasFundingCallToAction`                   | link fields; pitch/funding domains are separate docs     |
| `openRoles` / `teamMemberNames` / `collaboratorEmails`     | `video_open_role` / `video_team_member` / `video_collaborator` | recruit / credit / invite                                |
| `attachedDocumentNames` / `milestones` / `relatedVideoUrl` | `video_document` / `video_milestone` / `relatedVideoUrl`       | deck, roadmap, related video                             |
| "Show more" advanced fields                                | explicit columns + `settings` jsonb                            | see §4 (paid promotion, tags, license, comment prefs, …) |
| `visibility`                                               | `visibility` (enum)                                            | `private`\|`unlisted`\|`public`\|`investor_only`         |
| `isNdaRequired`                                            | `isNdaRequired`                                                | gate before playback (Investor-only)                     |
| `scheduledPublishDate`                                     | `scheduledPublishAt`                                           | schedule                                                 |
| `fileName` / `fileSizeInBytes`                             | `originalFileName` / `sizeBytes`                               | `sizeBytes` set from the **webhook**, not the client     |
| `animeEpisodeDetails`                                      | `anime_series` / `anime_season` / `anime_episode` rows         | anime branch (§4, §10)                                   |
| `status` (`StudioVideoStatus`)                             | `uploadStatus` + `publishStatus` + `reviewStatus`              | **one loose status → three orthogonal columns** (§4)     |

**Status contract:** the frontend's single `StudioVideoStatus` union
(`processing`\|`draft`\|`scheduled`\|`published`\|`pending-review`\|`approved`\|`rejected`) is a
**view** derived on read from three independent server columns — mixing them into one field on the
wire allows illegal states (e.g. "published" while still "processing"). See §4 and §8.

---

## 2. The stack

Everything the store/auth features use is reused. Video adds **one** provider integration.

| Concern           | Pick                                                                          | Why / reuse                                                                     |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Server framework  | **Express 5**                                                                 | Same app, more routers (`/videos`, `/playlists`, `/series`, `/admin`, webhook). |
| Language          | **TypeScript** (strict, ESM `#src/*`)                                         | Shared shapes with the frontend.                                                |
| Database ORM      | **Drizzle ORM**                                                               | New tables in `src/db/schema.ts`; `pnpm db:generate && db:migrate`.             |
| Database          | **PostgreSQL** via `pg`                                                       | FKs, enums, unique/position indexes enforced at the DB.                         |
| Validation        | **zod**                                                                       | Inline `.safeParse()` → `422` (prevailing style).                               |
| Video storage/CDN | **Livepeer Studio** (`src/lib/livepeer.ts`, behind `videoProvider` seam §5.1) | Direct upload, transcode, HLS, gated-playback JWT, webhooks.                    |
| Thumbnails        | **Cloudinary + sharp** (`src/lib/{cloudinary,image}.ts`)                      | Reuse the product-image pipeline for the **custom** thumbnail (tiny image).     |
| Doc uploads (PDF) | **Cloudinary raw** (or the same provider)                                     | Pitch deck / whitepaper; small, cheap.                                          |
| File uploads      | **multer** (`src/middleware/upload-*.ts`)                                     | Only for the thumbnail/PDF — **never** the video (video bypasses the server).   |
| Rate limiting     | **express-rate-limit** (`src/middleware/rate-limit.ts`)                       | Per-route limiter on create + thumbnail + review actions.                       |

**New dependency:** none strictly required on the backend — the Livepeer REST API is called with
plain `fetch` to stay dep-light (add the `livepeer` SDK only if preferred). The **frontend** adds
`tus-js-client` for the resumable direct upload. **No `@aws-sdk`, no `ffmpeg` on our servers.**

**New env** (backend, already stubbed in `.env.example` except the webhook secret):

```text
LIVEPEER_API_KEY=...
LIVEPEER_SIGNING_KEY_PUBLIC=...          # base64 PEM — gated playback
LIVEPEER_SIGNING_KEY_PRIVATE=...         # base64 PEM — gated playback
LIVEPEER_WEBHOOK_SECRET=...              # verify POST /webhooks/livepeer
VIDEO_STORAGE_PROVIDER=livepeer          # selects the videoProvider impl (§5.1)
INITIAL_ADMIN_EMAIL=...                  # first-admin seed (§10)
INITIAL_ADMIN_PASSWORD=...
```

---

## 3. Folder structure (additions)

New and changed files, following the existing route → controller → service → db layering:

```text
qatoto-backend/
├── src/
│   ├── db/
│   │   └── schema.ts                       # + video + child tables + playlist/anime tables + enums + relations; + user.role
│   ├── routes/
│   │   ├── videos.routes.ts                # NEW — /videos CRUD, upload, thumbnail, chapters, products, publish, playback-token
│   │   ├── playlists.routes.ts             # NEW — /playlists CRUD + membership
│   │   ├── series.routes.ts                # NEW — /series (anime catalog) CRUD + seasons/episodes
│   │   ├── admin.routes.ts                 # NEW — /admin/review queue (moderator/admin only)
│   │   └── webhooks.routes.ts              # NEW — POST /webhooks/livepeer (no auth, signature-verified)
│   ├── controllers/
│   │   ├── videos.controller.ts            # NEW — Zod parse + ownership guard + HTTP mapping
│   │   ├── playlists.controller.ts         # NEW
│   │   ├── series.controller.ts            # NEW
│   │   ├── admin-review.controller.ts      # NEW
│   │   └── webhooks.controller.ts          # NEW — verify signature, flip uploadStatus
│   ├── services/
│   │   ├── videos.service.ts               # NEW — domain logic, returns Result<T, VideoError>
│   │   ├── playlists.service.ts            # NEW
│   │   ├── series.service.ts               # NEW
│   │   └── review.service.ts               # NEW — approve/reject + audit log
│   ├── middleware/
│   │   ├── require-role.ts                 # NEW — requireRole("moderator"|"admin"), role from session
│   │   └── upload-image.ts                 # reuse upload-product-image for thumbnails
│   ├── lib/
│   │   ├── videoProvider.ts                # NEW — the provider seam (interface + selector)
│   │   ├── livepeer.ts                     # NEW — first impl: requestUpload/deleteAsset/signPlayback/verifyWebhook
│   │   ├── cloudinary.ts                   # + uploadVideoThumbnail / deleteVideoThumbnail
│   │   └── image.ts                         # (reused) validateAndNormalizeImage
│   ├── scripts/
│   │   └── seed-admin.ts                    # NEW — first-admin seed from env (§10)
│   └── app.ts                               # + mount the new routers
```

`req.user` is already attached by `requireAuth` (`src/middleware/require-auth.ts`) and typed via
`src/types/express.d.ts`. `requireRole` (§10) extends it to read `req.user.role`.

---

## 4. The data (new tables)

All in `src/db/schema.ts`, following the repo conventions used by the commerce tables:
`pgTable("snake_case", { camelColumn: type("snake_case_col") })`; self-generated ids
`text("id").primaryKey().$defaultFn(() => randomUUID())` (Better Auth never touches these);
timestamps `createdAt: timestamp("created_at").defaultNow().notNull()` and
`updatedAt … $onUpdate(() => new Date()).notNull()`; FKs `.references(() => …, { onDelete:
"cascade" })`; indexes in the 3rd `pgTable` arg; `relations(...)` declared separately.

### Two-axis status model (no loose UI states)

The frontend's one `status` field is **three orthogonal server columns** so illegal combinations
can't exist (Pattern 1, CLAUDE.md):

- `uploadStatus` — the **media** lifecycle, driven by the provider webhook: `uploading` →
  `processing` → `ready` (or `failed`). The client never sets this.
- `publishStatus` — the **distribution** state the creator controls: `draft` → `scheduled` →
  `published`.
- `reviewStatus` — the **moderation** state for gated content: `not_required` (normal videos) /
  `pending` / `approved` / `rejected`. Defaults to `not_required`; set to `pending` when
  `videoType = anime_episode` on publish.

A row can be `uploadStatus: processing` **and** `publishStatus: draft` **and** `reviewStatus:
not_required` simultaneously — all independent. The frontend badge is derived from the three (§8).

### Enums

```ts
export const videoVisibilityEnum = pgEnum("video_visibility", [
    "private",
    "unlisted",
    "public",
    "investor_only",
]);

export const videoTypeEnum = pgEnum("video_type", [
    "pitch",
    "demo",
    "update",
    "ama",
    "anime_episode",
]);

export const videoStageEnum = pgEnum("video_stage", ["idea", "mvp", "scaling", "shipped"]);

// Media lifecycle — set only by the provider webhook, never the client.
export const videoUploadStatusEnum = pgEnum("video_upload_status", [
    "uploading",
    "processing",
    "ready",
    "failed",
]);

export const videoPublishStatusEnum = pgEnum("video_publish_status", [
    "draft",
    "scheduled",
    "published",
]);

export const contentReviewStatusEnum = pgEnum("content_review_status", [
    "not_required",
    "pending",
    "approved",
    "rejected",
]);

export const videoLicenseEnum = pgEnum("video_license", ["standard", "creative_commons"]);

export const shortsRemixEnum = pgEnum("shorts_remix", ["video_and_audio", "audio_only"]);

export const playlistVisibilityEnum = pgEnum("playlist_visibility", [
    "public",
    "unlisted",
    "private",
]);

export const animeAudioModeEnum = pgEnum("anime_audio_mode", ["subbed", "dubbed"]);

// Which provider stored the asset — keeps mixed/migrated assets coexisting (§5.1).
export const storageProviderEnum = pgEnum("storage_provider", [
    "livepeer",
    "cloudflare",
    "imagekit",
    "self_hosted",
]);

// RBAC — added to the auth `user` table (§10).
export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);
```

### `video`

The record, owned by exactly one creator. **Provider columns are neutral** (`videoAssetId`, not
`livepeerAssetId`) so a provider swap needs no rename (§5.1).

```ts
export const video = pgTable(
    "video",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        // Owner. Stamped from req.user.id at create — NEVER from the body (§0).
        creatorId: text("creator_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),

        // --- Provider-neutral media identity (§5.1) ---
        storageProvider: storageProviderEnum("storage_provider").default("livepeer").notNull(),
        // Opaque asset id from the provider (Livepeer asset id today).
        videoAssetId: text("video_asset_id"),
        // Opaque playback id → playback URL (HLS .m3u8) is derived, not stored raw.
        playbackId: text("playback_id"),
        // Canonical playback URL, filled once known (public tiers). Gated tiers append a JWT (§9).
        playbackUrl: text("playback_url"),
        uploadStatus: videoUploadStatusEnum("upload_status").default("uploading").notNull(),
        // Set by the webhook, NOT the client.
        durationSeconds: integer("duration_seconds"),
        sizeBytes: integer("size_bytes"),
        originalFileName: text("original_file_name"),
        // Provider auto-thumbnail OR a Cloudinary custom thumbnail (§8).
        thumbnailUrl: text("thumbnail_url"),

        // --- Details step ---
        title: text("title").notNull(),
        description: text("description"),
        videoType: videoTypeEnum("video_type").default("demo").notNull(),
        stageBadge: videoStageEnum("stage_badge"),
        sectorTags: text("sector_tags").array().notNull().default([]),
        websiteUrl: text("website_url"),
        ctaLabel: text("cta_label"),
        ctaUrl: text("cta_url"),
        linkedinUrl: text("linkedin_url"),
        xProfileUrl: text("x_profile_url"),
        contactEmail: text("contact_email"),
        isMadeForKids: boolean("is_made_for_kids"),
        hasAgeRestriction: boolean("has_age_restriction").default(false).notNull(),

        // --- Video elements step (scalar links; list attachments are child tables below) ---
        relatedVideoUrl: text("related_video_url"),
        attachedPitchId: text("attached_pitch_id"), // FK to a future pitch table (§12)
        hasFundingCallToAction: boolean("has_funding_cta").default(false).notNull(),

        // --- Visibility step ---
        visibility: videoVisibilityEnum("visibility").default("private").notNull(),
        isNdaRequired: boolean("is_nda_required").default(false).notNull(),
        scheduledPublishAt: timestamp("scheduled_publish_at"),

        // --- Orthogonal status columns (see "Two-axis status model") ---
        publishStatus: videoPublishStatusEnum("publish_status").default("draft").notNull(),
        publishedAt: timestamp("published_at"),
        reviewStatus: contentReviewStatusEnum("review_status").default("not_required").notNull(),
        rejectionReason: text("rejection_reason"),

        // --- "Show more" first-class advanced fields ---
        license: videoLicenseEnum("license").default("standard").notNull(),
        tags: text("tags").array().notNull().default([]),
        videoLanguage: text("video_language"),
        isEmbeddingAllowed: boolean("is_embedding_allowed").default(true).notNull(),
        areCommentsEnabled: boolean("are_comments_enabled").default(true).notNull(),
        shouldShowLikesCount: boolean("should_show_likes_count").default(true).notNull(),
        hasPaidPromotion: boolean("has_paid_promotion").default(false).notNull(),
        usesAlteredContent: boolean("uses_altered_content"),

        // Long-tail "show more" prefs with no query/relationship value:
        // captionCertification, commentModeration, commentSortOrder, shortsRemixing,
        // recordingDate, recordingLocation, category. A jsonb keeps the table sane;
        // promote any field to a column if it ever needs an index or FK.
        settings: jsonb("settings").notNull().default({}),

        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index("video_creatorId_idx").on(table.creatorId),
        index("video_publishStatus_idx").on(table.publishStatus),
        index("video_reviewStatus_idx").on(table.reviewStatus),
        index("video_videoType_idx").on(table.videoType),
        uniqueIndex("video_asset_unq").on(table.videoAssetId), // one row per provider asset
    ],
);
```

> **Why `settings` is jsonb, not columns.** The YouTube-carryover "show more" fields
> (caption certification, comment moderation mode, sort order, shorts-remix mode, recording
> date/location, category) are display prefs with no query, index, or FK need — mirroring the
> store doc's `keyFeatures` reasoning, but for a heterogeneous bag rather than an array. First-class
> fields that gate behavior (`visibility`, `license`, `areCommentsEnabled`) stay real columns.

### Child tables (one per repeating group)

```ts
// Manual chapters (chapters-editor.tsx). Rules validated in the service (§6).
export const videoChapter = pgTable(
    "video_chapter",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        videoId: text("video_id")
            .notNull()
            .references(() => video.id, { onDelete: "cascade" }),
        startSeconds: integer("start_seconds").notNull(), // 0 for the first chapter
        title: text("title").notNull(),
        position: integer("position").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("video_chapter_videoId_idx").on(table.videoId)],
);

// Shoppable products (store-products-picker.tsx). Ownership of each product re-verified (§0).
export const videoAttachedProduct = pgTable(
    "video_attached_product",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        videoId: text("video_id")
            .notNull()
            .references(() => video.id, { onDelete: "cascade" }),
        productId: text("product_id")
            .notNull()
            .references(() => product.id, { onDelete: "cascade" }),
        position: integer("position").notNull(),
        pinnedAtSeconds: integer("pinned_at_seconds"), // optional: pop the card at this timestamp
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("video_attached_product_videoId_idx").on(table.videoId),
        uniqueIndex("video_product_unq").on(table.videoId, table.productId),
    ],
);

// Pitch deck / whitepaper PDFs (Cloudinary raw or provider).
export const videoDocument = pgTable(
    "video_document",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        videoId: text("video_id")
            .notNull()
            .references(() => video.id, { onDelete: "cascade" }),
        url: text("url").notNull(),
        fileName: text("file_name").notNull(),
        position: integer("position").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("video_document_videoId_idx").on(table.videoId)],
);

// Roadmap / build→ship milestones.
export const videoMilestone = pgTable(
    "video_milestone",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        videoId: text("video_id")
            .notNull()
            .references(() => video.id, { onDelete: "cascade" }),
        label: text("label").notNull(),
        position: integer("position").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("video_milestone_videoId_idx").on(table.videoId)],
);

// Recruit: open roles attached to a video (applications = §12 gap).
export const videoOpenRole = pgTable(
    "video_open_role",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        videoId: text("video_id")
            .notNull()
            .references(() => video.id, { onDelete: "cascade" }),
        roleTitle: text("role_title").notNull(),
        roleDescription: text("role_description"),
        position: integer("position").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("video_open_role_videoId_idx").on(table.videoId)],
);

// Team credit shown on the watch page. linkedUserId ties a credit to a real account when known.
export const videoTeamMember = pgTable(
    "video_team_member",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        videoId: text("video_id")
            .notNull()
            .references(() => video.id, { onDelete: "cascade" }),
        memberName: text("member_name").notNull(),
        roleLabel: text("role_label"),
        linkedUserId: text("linked_user_id").references(() => user.id, { onDelete: "set null" }),
        position: integer("position").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("video_team_member_videoId_idx").on(table.videoId)],
);

// Invite-collaborator: pending/accepted invites by email (or resolved user).
export const videoCollaborator = pgTable(
    "video_collaborator",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        videoId: text("video_id")
            .notNull()
            .references(() => video.id, { onDelete: "cascade" }),
        invitedEmail: text("invited_email").notNull(),
        userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
        status: text("status").default("invited").notNull(), // invited | accepted | declined
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("video_collaborator_videoId_idx").on(table.videoId)],
);
```

### Playlists

```ts
export const playlist = pgTable(
    "playlist",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        creatorId: text("creator_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        visibility: playlistVisibilityEnum("visibility").default("private").notNull(),
        defaultVideoOrder: text("default_video_order").default("date_published_newest").notNull(),
        language: text("language"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("playlist_creatorId_idx").on(table.creatorId)],
);

export const playlistItem = pgTable(
    "playlist_item",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        playlistId: text("playlist_id")
            .notNull()
            .references(() => playlist.id, { onDelete: "cascade" }),
        videoId: text("video_id")
            .notNull()
            .references(() => video.id, { onDelete: "cascade" }),
        position: integer("position").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("playlist_item_playlistId_idx").on(table.playlistId),
        uniqueIndex("playlist_item_unq").on(table.playlistId, table.videoId),
    ],
);
```

### Anime catalog (series → season → episode)

An anime episode is created **through the upload flow** (`videoType = anime_episode`): the modal
either picks an existing series or creates one, and on save the service creates/links the
`anime_series` / `anime_season` / `anime_episode` rows to the new `video` row and sets the video's
`reviewStatus: pending`. The catalog is also editable at `/studio/series`.

```ts
export const animeSeries = pgTable(
    "anime_series",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        ownerId: text("owner_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        posterUrl: text("poster_url"),
        genreTags: text("genre_tags").array().notNull().default([]),
        status: text("status").default("ongoing").notNull(), // ongoing | completed | hiatus
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("anime_series_ownerId_idx").on(table.ownerId)],
);

export const animeSeason = pgTable(
    "anime_season",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        seriesId: text("series_id")
            .notNull()
            .references(() => animeSeries.id, { onDelete: "cascade" }),
        seasonLabel: text("season_label").notNull(),
        position: integer("position").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("anime_season_seriesId_idx").on(table.seriesId)],
);

export const animeEpisode = pgTable(
    "anime_episode",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        seasonId: text("season_id")
            .notNull()
            .references(() => animeSeason.id, { onDelete: "cascade" }),
        // The uploaded asset. One video is at most one episode.
        videoId: text("video_id").references(() => video.id, { onDelete: "set null" }),
        episodeNumber: integer("episode_number").notNull(),
        episodeTitle: text("episode_title").notNull(),
        isPremium: boolean("is_premium").default(false).notNull(),
        releaseScheduleDay: text("release_schedule_day"), // e.g. "friday"
        releaseScheduleTime: text("release_schedule_time"), // e.g. "18:00"
        premiereDate: timestamp("premiere_date"),
        audioMode: animeAudioModeEnum("audio_mode"),
        audioLanguage: text("audio_language"),
        ageRating: text("age_rating"),
        releasedAt: timestamp("released_at"), // set when it goes live in /anime after approval
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index("anime_episode_seasonId_idx").on(table.seasonId),
        uniqueIndex("anime_episode_unq").on(table.seasonId, table.episodeNumber),
    ],
);
```

### Content-review audit log

Every approve/reject is logged (admin doc §6 "build mock audit log now" → real table here). Maps
to the frontend `admin-audit-log-context`.

```ts
export const contentReviewAction = pgTable(
    "content_review_action",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => randomUUID()),
        videoId: text("video_id")
            .notNull()
            .references(() => video.id, { onDelete: "cascade" }),
        reviewerId: text("reviewer_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        action: text("action").notNull(), // approve | reject
        reason: text("reason"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [index("content_review_action_videoId_idx").on(table.videoId)],
);
```

### `user.role` (RBAC)

Add a `role` column to the existing auth `user` table (Better Auth `additionalFields` /
migration):

```ts
// in the existing `user` pgTable definition:
role: userRoleEnum("role").default("user").notNull(),
```

### Relations

Declare `relations(...)` for `video` (→ creator, chapters, attachedProducts, documents,
milestones, openRoles, teamMembers, collaborators, animeEpisode), `playlist` (→ items),
`animeSeries`/`animeSeason`/`animeEpisode`, and `contentReviewAction` — same pattern as
`productRelations` in STORE §4. After editing `schema.ts`, run `pnpm db:generate && pnpm
db:migrate`.

---

## 5. The cost architecture (why this is ~zero cost)

This is the reason the doc exists. Video is the expensive media type; every decision below exists
to keep the **running cost at or near zero at low volume**, scaling linearly and cheaply after.

1. **Bytes never transit Express.** `POST /videos` calls the provider's _request-upload_ and
   returns a **short-lived, resumable upload URL** (Livepeer TUS endpoint). The browser uploads
   the file **directly to the provider** — the backend only ever moves small JSON. So there is
   **no server egress billed, no proxy bandwidth (which would be 2× — in then out), no multi-GB
   buffers in memory, and no long-held request timing out.** Contrast the naive design (client →
   our server → provider), which pays bandwidth twice and risks OOM on large files.

2. **Transcoding is offloaded, not self-hosted.** Livepeer's decentralized network does the
   transcode to adaptive HLS renditions. We run **no `ffmpeg`, no GPU/CPU transcode box**. That
   avoids the single biggest video cost (self-hosted transcode CPU, or Mux/AWS MediaConvert per-minute
   fees). Livepeer's free tier covers early volume; usage-based after.

3. **Playback = provider HLS + CDN.** The `playbackId` yields an `.m3u8` served from the
   provider's CDN with adaptive bitrate — **for free from our infra's perspective**. We serve no
   video bytes.

4. **Thumbnails are cheap.** Default to the provider's **auto-generated** frame ($0, arrives via
   the webhook). A **custom** thumbnail reuses the existing **Cloudinary + sharp** image pipeline
   — tiny images on a free tier.

5. **Gated playback only when needed.** Public/unlisted videos need no token — the HLS URL is
   plain. Only `private`/`investor_only`/NDA videos mint a **short-lived JWT** (§9), so the auth
   cost is bounded to the gated minority.

6. **Webhooks, not polling.** The `uploading → processing → ready` transition is driven by the
   provider **calling us** (`asset.ready`), not by us polling the provider on a timer. **No idle
   compute, no wasted API calls.**

7. **Postgres stores only ids + metadata.** The DB holds `videoAssetId` / `playbackId` /
   metadata — kilobytes per video, not gigabytes. Negligible storage cost; no blob columns.

**Net:** at low volume this is effectively free (free tiers + our own server only shuffling JSON).
The dominant variable cost is provider transcode/delivery minutes, which are usage-based and among
the cheapest available.

> **Pricing caveat:** exact Livepeer free-tier limits and per-minute rates change and may be stale
> versus this doc — **verify current Livepeer Studio pricing** before committing volume.

### 5.1 Provider portability (Livepeer → Cloudflare Stream / ImageKit / Hetzner)

Livepeer is **one implementation behind a seam**, so switching later is cheap and touches ~one file.

- **The frontend never names the provider.** It calls our `/videos` endpoints and uploads to the
  **opaque URL** we return. Swapping the backend provider leaves the frontend untouched (only the
  client upload lib changes if the _protocol_ changes — TUS vs presigned PUT).

- **One seam — `src/lib/videoProvider.ts`** — an interface every provider implements:

    ```ts
    export interface VideoProvider {
        // Create a remote asset + return where the client uploads the bytes directly.
        requestUpload(input: {
            name: string;
        }): Promise<
            Result<
                {
                    assetId: string;
                    playbackId: string;
                    upload: { url: string; protocol: "tus" | "put" };
                },
                ProviderError
            >
        >;
        deleteAsset(assetId: string): Promise<Result<void, ProviderError>>;
        // Mint a short-lived playback JWT for gated tiers.
        signPlayback(
            playbackId: string,
            ttlSeconds: number,
        ): Promise<Result<string, ProviderError>>;
        // Verify an inbound webhook and normalize it to a provider-neutral event.
        verifyWebhook(
            rawBody: Buffer,
            headers: Record<string, string>,
        ): Result<VideoWebhookEvent, ProviderError>;
    }
    ```

    `src/lib/livepeer.ts` is the first impl. `VIDEO_STORAGE_PROVIDER` selects it. Adding
    `cloudflareStream.ts` / `imagekit.ts` / `hetzner.ts` = implement those four functions — **no
    route, controller, or schema change.**

- **Provider-neutral columns** (`videoAssetId`, `playbackId`, `playbackUrl`, `uploadStatus`,
  `storageProvider`) mean old and new-provider assets **coexist**. Migration is **dual-run** (new
  uploads → new provider) with optional re-ingest of old assets. **No table drop, no rename.**

- **Protocol-tagged upload response** (`{ upload: { url, protocol: "tus" | "put" } }`) means a
  provider that wants a presigned PUT instead of resumable TUS needs **no new endpoint** — the
  client branches on `protocol`.

- **Fit at a glance:** **Cloudflare Stream** — near drop-in (TUS upload, HLS, signed URLs,
  webhooks; very cheap). **ImageKit** — same endpoints, rewrite the seam. **Hetzner VPS** —
  cheapest $ but you own `ffmpeg` transcode + HLS serving + signed URLs + resumable upload; biggest
  seam rewrite, still no schema/frontend change.

---

## 6. The API — endpoints YOU write

Mounted in `src/app.ts` after `express.json()` (except the webhook, which needs the **raw** body
for signature verification — mount it with `express.raw({ type: "application/json" })` before the
JSON parser, like the Better Auth handler):

```ts
app.use("/videos", videosRouter);
app.use("/playlists", playlistsRouter);
app.use("/series", seriesRouter);
app.use("/admin", adminRouter);
app.use("/webhooks", webhooksRouter); // raw body
```

**Every** creator route is guarded by `requireAuth`; the creator id is `req.user.id`. Every
`/:id*` route runs the ownership check (§0) → `404` when the caller doesn't own the row. Declare
literal segments (`/mine`) **before** `/:id` (same rule as the users/products routers).

### Creator video (`/videos`)

| Method & path                    | Body / input                                         | Behavior & statuses                                                                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /videos`                   | JSON `CreateVideoSchema` (title + optional metadata) | Create a **draft** row + call provider _request-upload_. `creatorId` from session. `201` `{ video: PublicVideo, upload: { url, protocol } }`. `422` · `503 PROVIDER_NOT_CONFIGURED`.                                         |
| `GET /videos/mine`               | `?page&limit`                                        | Caller's own videos, `PaginatedResponse<VideoListRow>` ordered by `updatedAt` desc. `200`.                                                                                                                                   |
| `GET /videos/:id`                | —                                                    | Full `PublicVideo` (chapters, products, attachments, anime). Owner only → `404` otherwise.                                                                                                                                   |
| `PATCH /videos/:id`              | JSON `UpdateVideoSchema` (all optional)              | Partial update of mutable metadata. `200` `PublicVideo` · `422` · `404`.                                                                                                                                                     |
| `POST /videos/:id/thumbnail`     | `multipart/form-data`, field **`image`**             | sharp validate+normalize → Cloudinary → set `thumbnailUrl`. `200` · image statuses (§8 map) · `413` (>5 MB) · `404`.                                                                                                         |
| `PUT /videos/:id/chapters`       | JSON `{ chapters: [{ startSeconds, title }] }`       | Replace the chapter set. Validate: first `startSeconds = 0`, strictly ascending, ≥10 s apart, ≤ `durationSeconds`, ≥3 to show. `200` · `422` · `404`.                                                                        |
| `PUT /videos/:id/products`       | JSON `{ productIds: string[] }`                      | Replace attached products; **each product ownership re-verified** → `422 PRODUCT_NOT_OWNED`. `200` · `404`.                                                                                                                  |
| `PUT /videos/:id/playlists`      | JSON `{ playlistIds: string[] }`                     | Set which of the caller's playlists contain this video. `200` · `404`.                                                                                                                                                       |
| `POST /videos/:id/publish`       | —                                                    | draft → published (or `scheduled` if `scheduledPublishAt` is future). Re-check completeness server-side. **anime → `reviewStatus: pending`, NOT live.** `200` `PublicVideo` · `422 INCOMPLETE_FOR_PUBLISH` · `404`.          |
| `POST /videos/:id/unpublish`     | —                                                    | published/scheduled → draft. `200` · `404`.                                                                                                                                                                                  |
| `GET /videos/:id/playback-token` | —                                                    | For gated tiers: server authorizes caller (owner / permitted investor / NDA-accepted) → mint short-lived provider JWT. `200 { token, ttlSeconds }` · `403 NOT_PERMITTED` · `404`. Public/unlisted → `409 NO_TOKEN_REQUIRED`. |
| `DELETE /videos/:id`             | —                                                    | Delete the provider asset + Cloudinary thumbnail, then the row (FK cascade clears children). `200` · `404`.                                                                                                                  |

### Playlists (`/playlists`)

`POST /playlists` (create) · `GET /playlists/mine` (list) · `PATCH /playlists/:id` (rename/visibility)
· `DELETE /playlists/:id` · `PUT /playlists/:id/videos` (`{ videoIds: string[] }` — membership +
order). All `requireAuth`, owner-scoped, `404` on non-owner.

### Anime catalog (`/series`)

`POST /series` · `GET /series/mine` · `GET /series/:id` · `PATCH /series/:id` · `DELETE /series/:id`,
with nested `POST /series/:id/seasons` and `POST /seasons/:id/episodes`. Owner-scoped. (Episodes are
normally created via the upload flow; these exist for catalog management at `/studio/series`.)

### Webhook (`/webhooks`, no auth, signature-verified)

`POST /webhooks/livepeer` — verify the signature against `LIVEPEER_WEBHOOK_SECRET`
(`videoProvider.verifyWebhook`), then:

- `asset.ready` → `uploadStatus: ready`, set `durationSeconds`, `sizeBytes`, `playbackUrl`, and
  `thumbnailUrl` (if no custom one).
- `asset.failed` → `uploadStatus: failed`.

Unknown/unverified → `400`, no state change. **This is the only authority for media readiness** —
the client is never trusted for it (§0).

### Admin review (`/admin/review`, `requireRole("moderator")`)

| Method & path                         | Behavior & statuses                                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /admin/review?status=pending`    | List videos where `videoType = anime_episode` and `reviewStatus = <status>`. `200 PaginatedResponse<ReviewRow>`. `403` if caller lacks role.                                                     |
| `POST /admin/review/:videoId/approve` | `reviewStatus: approved`; **auto-publish** to `/anime` on/after the episode release date (admin decision #3), set `animeEpisode.releasedAt`; log `content_review_action`. `200` · `403` · `404`. |
| `POST /admin/review/:videoId/reject`  | JSON `{ reason }` → `reviewStatus: rejected` + `rejectionReason`; log action. `200` · `403` · `404` · `422`.                                                                                     |

Role is **re-derived from the session** in `requireRole` (§10) — a client-claimed role is ignored.

---

## 7. Validation (`src/controllers/*.controller.ts`)

Inline Zod at the top of each controller, `Schema.safeParse(req.body)`, `422` +
`z.flattenError(parsed.error).fieldErrors` — the prevailing style. `.strict()` rejects unknown keys.
Sketch for the video create/update:

```ts
const ChapterSchema = z.object({
    startSeconds: z.number().int().min(0),
    title: z.string().trim().min(1).max(120),
});

const CreateVideoSchema = z
    .object({
        title: z.string().trim().min(1).max(100),
        description: z.string().trim().max(5000).optional(),
        videoType: z.enum(["pitch", "demo", "update", "ama", "anime_episode"]).default("demo"),
        stageBadge: z.enum(["idea", "mvp", "scaling", "shipped"]).optional(),
        sectorTags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
        websiteUrl: z.string().url().max(2048).optional(),
        ctaLabel: z.string().trim().max(60).optional(),
        ctaUrl: z.string().url().max(2048).optional(),
        linkedinUrl: z.string().url().max(2048).optional(),
        xProfileUrl: z.string().url().max(2048).optional(),
        contactEmail: z.string().email().optional(),
        isMadeForKids: z.boolean().optional(),
        visibility: z.enum(["private", "unlisted", "public", "investor_only"]).default("private"),
        isNdaRequired: z.boolean().default(false),
        scheduledPublishAt: z.coerce.date().optional(),
        originalFileName: z.string().trim().max(255).optional(),
        // anime branch (required only when videoType === "anime_episode"; enforce with .refine)
        anime: z
            .object({
                seriesId: z.string().optional(), // omit to create a new series
                newSeriesTitle: z.string().trim().max(200).optional(),
                seasonLabel: z.string().trim().max(60),
                episodeNumber: z.number().int().min(0),
                episodeTitle: z.string().trim().min(1).max(200),
                releaseScheduleDay: z.string().optional(),
                releaseScheduleTime: z.string().optional(),
                premiereDate: z.coerce.date().optional(),
                audioMode: z.enum(["subbed", "dubbed"]).optional(),
                audioLanguage: z.string().optional(),
                ageRating: z.string().optional(),
                genreTags: z.array(z.string()).max(20).default([]),
            })
            .optional(),
    })
    .strict();

const UpdateVideoSchema = CreateVideoSchema.partial();
const ReplaceChaptersSchema = z.object({ chapters: z.array(ChapterSchema).max(100) }).strict();
const ReplaceProductsSchema = z.object({ productIds: z.array(z.string()).max(50) }).strict();
```

Notes the doc pins down:

- **Media fields are never in the schema.** `durationSeconds`, `sizeBytes`, `playbackId`,
  `videoAssetId`, `uploadStatus`, `thumbnailUrl` are all server/webhook-derived — a client that
  sends them is rejected by `.strict()`.
- **URLs are validated + normalized server-side** and rendered `rel="nofollow noopener"` (§0);
  don't trust a client-claimed "verified" state.
- **Chapter rules** (first `0`, ascending, ≥10 s apart, ≤ duration, ≥3 to show) are enforced in the
  service, not just the schema, because they depend on `durationSeconds`.
- **Publish/thumbnail/playback-token/publish** take **no mutation body** (or only `reason` for
  reject); their inputs are the session + path params.

---

## 8. Services & Result types (`src/services/*.service.ts`)

Services never touch `req`/`res`; they return `Result<T, VideoError>` and the controller
exhaustively switches on `error.type` → HTTP (with a `never` default), exactly like
`users.service.ts` / `products.service.ts`.

```ts
export type VideoError =
    | { type: "NOT_FOUND"; videoId: string } // missing OR not owned → 404
    | { type: "INCOMPLETE_FOR_PUBLISH"; missing: string[] } // publish gate → 422
    | { type: "NOT_READY"; uploadStatus: string } // publish before ready → 422
    | { type: "PRODUCT_NOT_OWNED"; productId: string } // attach a stranger's product → 422
    | { type: "INVALID_CHAPTERS"; message: string } // chapter rules → 422
    | { type: "NO_TOKEN_REQUIRED" } // public/unlisted playback-token → 409
    | { type: "NOT_PERMITTED" } // gated playback, caller not allowed → 403
    | ProviderError // from videoProvider (request-upload / delete / sign / webhook)
    | ImageValidationError // reused from lib/image.ts (sharp) — thumbnail route
    | CloudinaryError; // reused from lib/cloudinary.ts — thumbnail route
```

Canonical read-back projections (one source of truth for shape, like `PublicProduct`):

```ts
export interface PublicVideo {
    readonly id: string;
    readonly title: string;
    readonly description: string | null;
    readonly videoType: "pitch" | "demo" | "update" | "ama" | "anime_episode";
    readonly stageBadge: "idea" | "mvp" | "scaling" | "shipped" | null;
    // provider-neutral media identity
    readonly storageProvider: "livepeer" | "cloudflare" | "imagekit" | "self_hosted";
    readonly playbackId: string | null;
    readonly playbackUrl: string | null;
    readonly uploadStatus: "uploading" | "processing" | "ready" | "failed";
    readonly durationSeconds: number | null;
    readonly thumbnailUrl: string | null;
    // distribution + moderation
    readonly visibility: "private" | "unlisted" | "public" | "investor_only";
    readonly publishStatus: "draft" | "scheduled" | "published";
    readonly publishedAt: Date | null;
    readonly reviewStatus: "not_required" | "pending" | "approved" | "rejected";
    readonly rejectionReason: string | null;
    // attachments
    readonly chapters: readonly { id: string; startSeconds: number; title: string }[];
    readonly attachedProducts: readonly { id: string; productId: string; position: number }[];
    // …milestones, openRoles, teamMembers, documents, collaborators, anime episode…
}

// Compact row for My Videos (maps 1:1 to videos-list.tsx).
export interface VideoListRow {
    readonly id: string;
    readonly title: string;
    readonly thumbnailUrl: string | null;
    readonly visibility: "private" | "unlisted" | "public" | "investor_only";
    readonly uploadStatus: "uploading" | "processing" | "ready" | "failed";
    readonly publishStatus: "draft" | "scheduled" | "published";
    readonly reviewStatus: "not_required" | "pending" | "approved" | "rejected";
    readonly createdAt: Date;
}
```

**Deriving the frontend badge (§1 status contract).** The single `StudioVideoStatus` the UI shows
is computed from the three columns on read — the client never stores it:

```text
uploadStatus = failed                      → "failed"
uploadStatus in {uploading,processing}     → "processing"
reviewStatus = pending                     → "pending-review"
reviewStatus = rejected                    → "rejected"
reviewStatus = approved & not yet released → "approved"
publishStatus = scheduled                  → "scheduled"
publishStatus = published                  → "published"
else                                       → "draft"
```

Ownership is enforced **in the service**: every read/mutation filters
`where(and(eq(video.id, id), eq(video.creatorId, creatorId)))`; an empty result → `NOT_FOUND` →
`404` (never leaking existence). Create (video row + anime rows), chapter/product/playlist replace,
and publish run inside a transaction so children stay consistent with the parent.

**Thumbnail status map** — identical to the store image map: missing `req.file` → `422`,
`NOT_AN_IMAGE`/`UNSUPPORTED_FORMAT`/dimension errors → `422`, `NOT_CONFIGURED` → `503`,
`UPLOAD_FAILED`/`DELETE_FAILED` → `502`, size cap → `413` (in the multer middleware).

---

## 9. The Livepeer pipeline (request-upload → direct upload → webhook → gated playback)

Four layers, all behind the `videoProvider` seam (§5.1):

1. **Request upload (`POST /videos`).** The service calls
   `videoProvider.requestUpload({ name })`. Livepeer's impl `POST`s to
   `https://livepeer.studio/api/asset/request-upload` with the API key and returns
   `{ asset: { id, playbackId }, tusEndpoint, url }`. The service stores `videoAssetId`,
   `playbackId`, `uploadStatus: "uploading"` and returns `{ upload: { url: tusEndpoint, protocol:
"tus" } }` to the client.

2. **Direct upload (client → provider).** The browser uses `tus-js-client` to upload the file
   **straight to `tusEndpoint`** — resumable, chunked, no server hop. The backend is not involved
   in the byte transfer (§5.1). While it uploads, the UI polls `GET /videos/:id` (or listens) for
   `uploadStatus`.

3. **Webhook (provider → us).** When transcoding finishes, Livepeer calls
   `POST /webhooks/livepeer`. `videoProvider.verifyWebhook` checks the signature against
   `LIVEPEER_WEBHOOK_SECRET`; on `asset.ready` the service flips `uploadStatus: "ready"` and fills
   `durationSeconds` / `sizeBytes` / `playbackUrl` / auto-`thumbnailUrl`. This — not the client —
   is what lets a draft be published.

4. **Gated playback (`GET /videos/:id/playback-token`).** For `private`/`investor_only`/NDA videos,
   the service first authorizes the caller (owner, or an investor with an accepted NDA — enforced
   server-side, never client), then `videoProvider.signPlayback(playbackId, ttl)` mints a
   short-lived JWT signed with `LIVEPEER_SIGNING_KEY_PRIVATE`. The client appends it to the HLS URL.
   Public/unlisted videos skip this entirely (`409 NO_TOKEN_REQUIRED`).

```text
1. POST /videos {title, …}
   → requireAuth resolves creatorId from the session cookie (NEVER the body).
   → CreateVideoSchema.safeParse → 422 on bad shape.
   → videoProvider.requestUpload → store videoAssetId/playbackId, uploadStatus "uploading".
   → 201 { video, upload: { url, protocol: "tus" } }.

2. Client uploads the file DIRECTLY to url via tus-js-client. Backend sees no bytes.

3. Provider finishes → POST /webhooks/livepeer (signature-verified)
   → asset.ready: uploadStatus "ready" + duration/size/playbackUrl/thumbnail.

4. PATCH /videos/:id … fill metadata; PUT /:id/chapters; PUT /:id/products; PUT /:id/playlists.

5. POST /videos/:id/publish
   → re-check: title + uploadStatus "ready" + a visibility tier. missing → 422.
   → normal video → publishStatus "published" (or "scheduled").
   → anime episode → reviewStatus "pending" (NOT published to /anime). → 200 PublicVideo.
```

If the creator abandons the flow after step 1, the row stays a `draft` (and the un-finished asset
can be swept later) — visible only to them in My Videos, never to viewers.

---

## 10. Anime + admin-review boundary (RBAC)

Normal videos publish straight to the creator's channel. **Anime episodes are curated** and route
through staff review before appearing in `/anime` — the boundary specced in
[UPLOAD_VIDEO_STRUCTURE.md](UPLOAD_VIDEO_STRUCTURE.md) §3 and [ADMIN_STRUCTURE.md](ADMIN_STRUCTURE.md)
§4.1.

- **Two surfaces, never conflated.** The creator sees a read-only status badge inline in **My
  Videos** (`/studio/videos`) — Pending / Approved / Rejected + reason. Staff act at
  **`/admin/review`**. Same rows, different permissions. There is **no `/studio/queue`**.
- **On publish**, `videoType = anime_episode` → `reviewStatus: pending` (not live). A
  `moderator`/`admin` approves → **auto-publish** into `/anime` on/after the episode release date
  (admin decision #3), or rejects with a reason. Every decision writes a `content_review_action`.
- **Re-editing an approved/rejected anime episode resets it to `pending`** — edited content is
  re-reviewed (UPLOAD_VIDEO_STRUCTURE.md §3).
- **RBAC.** `user.role ∈ {user, moderator, admin}`. New middleware
  `src/middleware/require-role.ts`:

    ```ts
    export function requireRole(minimum: "moderator" | "admin") {
        return (req, res, next) => {
            if (!req.user) return respondUnauthenticated(res); // 401
            const rank = { user: 0, moderator: 1, admin: 2 };
            if (rank[req.user.role] < rank[minimum]) {
                return res
                    .status(403)
                    .json({ status: "error", statusCode: 403, message: "Forbidden." });
            }
            next();
        };
    }
    ```

    The role is loaded onto `req.user` from the session in `requireAuth` (extend the ambient
    `express.d.ts` type). **A client-claimed role is never trusted** (admin doc §2).

- **First admin — seed script** `scripts/seed-admin.ts`: if no `admin` exists, create/promote one
  from `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` (admin doc §7). Day-to-day promotion is a
  future `/admin/users` action; recovery is re-running the seed.
- The admin **open decision** ("keep anime **and** videos for approval") extends by defaulting
  `reviewStatus: pending` for other `videoType`s too — **no schema change**, just a flipped default.

---

## 11. Zero-trust checklist (per §0, applied to each route)

- `creatorId` / `ownerId` are **only** ever `req.user.id`. No owner field in any request schema.
- Ownership is re-checked in the **service** on every `:id` op; failure → `NOT_FOUND` → `404`.
- **Video bytes never transit the server** and are never trusted; `uploadStatus`/`duration`/`size`
  come only from the **signature-verified webhook**.
- Gated-tier playback requires a **server-minted JWT** after a server-side permission check; the
  client can't self-authorize.
- Attached `productId`s are re-verified for ownership; buyer-facing price/inventory is always
  re-derived (STORE §0), never trusted from the attachment.
- Publish completeness and **anime approval** are decided server-side; the client's click is a
  request, not an authorization.
- Admin actions re-derive the role from the session (`requireRole`) and **audit-log** every decision.
- Every body/query is Zod `.safeParse()`d with `.strict()` → `422` before the service runs.

---

## 12. Frontend-behind-backend gaps (planned, not modeled here)

- **Pitch / funding domains.** The `video` row carries `attachedPitchId` and
  `hasFundingCallToAction` link fields, but the **pitch** (`/studio/pitches`) and **funding**
  (`/studio/funding`) products are separate subsystems with their own tables and docs. This doc owns
  the video-side attachment, not the pitch/funding domain.
- **Role applications.** `video_open_role` stores the roles; viewers _applying_ to a role
  (applications, review, messaging) is a future feature.
- **NDA / investor identity.** `isNdaRequired` and `investor_only` gate playback via §9, but
  verifying investor identity and recording NDA acceptance is a server-side flow to be specced when
  the investor product lands.
- **Live streaming.** Out of scope — a separate doc. The `videoProvider` seam can grow a
  `createLiveStream()` method then.
- **Watch-side read API.** This doc is the **creator** contract. The public watch surface
  (`src/lib/videos.ts`, `QATOTO_VIDEO_API_URL`) is a separate read model.
- **Playlists picker / series editor polish, custom-vs-auto thumbnail UX** — frontend follow-ups;
  the contract is already here.

---

## 13. Verification (when the backend phase begins)

1. `pnpm db:generate && pnpm db:migrate` — apply the new tables + enums + `user.role`.
2. Configure `LIVEPEER_*` + `LIVEPEER_WEBHOOK_SECRET`; run `tsx scripts/seed-admin.ts`.
3. Sign in (get a session cookie), then exercise the flow:

    ```bash
    # 1. create a draft + get the direct-upload URL
    curl -X POST https://localhost:8000/videos -b cookies.txt -H 'content-type: application/json' \
      -d '{"title":"Seed round demo","videoType":"demo","visibility":"public"}'
    # → 201 { video: {id, uploadStatus:"uploading"}, upload:{url, protocol:"tus"} }

    # 2. upload the file DIRECTLY to the provider (tus) — NOT through our server
    #    (browser uses tus-js-client; CLI check: `tus-node`/`curl` against `upload.url`)

    # 3. provider fires the webhook → uploadStatus flips to "ready"
    curl https://localhost:8000/videos/<id> -b cookies.txt   # → uploadStatus:"ready", playbackUrl set

    # 4. publish
    curl -X POST https://localhost:8000/videos/<id>/publish -b cookies.txt
    # → 200, publishStatus "published" (or reviewStatus "pending" for an anime_episode)

    # 5. My Videos list
    curl https://localhost:8000/videos/mine -b cookies.txt   # → row with the derived badge
    ```

4. **Cost check** — confirm the video bytes went **only** to the provider (server ingress/egress
   near zero for the upload); the backend logs should show only the small JSON round-trips.
5. **Field coverage** — every `StudioVideo` field in
   [studio-videos-context.tsx](src/state/studio-videos-context.tsx) maps to a column/child table
   (§4); every modal step (Details / Video elements / Checks / Visibility + anime branch) is covered.
6. **Negative checks:** publish before `uploadStatus:"ready"` → `422 NOT_READY`; publish a
   titleless draft → `422 INCOMPLETE_FOR_PUBLISH`; another creator's `GET /videos/:id` → `404`;
   `playback-token` for a public video → `409`; gated `playback-token` as a stranger → `403`; a
   non-moderator hitting `/admin/review` → `403`; an unsigned webhook → `400`.

```

```
