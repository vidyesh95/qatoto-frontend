// TRANSPORT: props-only — pure contract for the STUDIO video API (`/videos`, owner-scoped).
//
// SEPARATE FROM `@/lib/feed/schemas`, WHICH IS THE VIEWER SIDE OF THE SAME TABLE. The feed
// reads what a stranger may see; this reads what a creator owns — `publishStatus`,
// `reviewStatus`, `uploadStatus`, `isSourceVerified`, `rejectionReason`. The backend
// deliberately omits every one of those from the public watch payload, and merging the two
// schemas would quietly re-introduce them into a public read.
//
// THE WRITE AND READ SHAPES ARE ASYMMETRIC, ON PURPOSE. You send `categoryIds: string[]` and
// read back `categories: { id, slug, label }[]`; same for milestones, open roles, team members,
// collaborators and attached products. Do not "fix" one into the other — the write takes ids
// because ids are what the client knows, and the read returns objects because a label is what
// the UI renders.

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Wire enums — snake_case pgEnum labels, byte-identical                       */
/* -------------------------------------------------------------------------- */

export const VIDEO_TYPES = ["pitch", "demo", "update", "ama", "anime_episode"] as const;
export const VIDEO_STAGE_BADGES = ["idea", "mvp", "scaling", "shipped"] as const;
/** Note `investor_only` — playlists have their own, SHORTER visibility enum. */
export const VIDEO_VISIBILITIES = ["private", "unlisted", "public", "investor_only"] as const;
export const VIDEO_UPLOAD_STATUSES = ["uploading", "processing", "ready", "failed"] as const;
export const VIDEO_PUBLISH_STATUSES = ["draft", "scheduled", "published"] as const;
export const CONTENT_REVIEW_STATUSES = ["not_required", "pending", "approved", "rejected"] as const;
export const VIDEO_LICENSES = ["standard", "creative_commons"] as const;
export const SHORTS_REMIX_MODES = ["video_and_audio", "audio_only"] as const;
export const ANIME_AUDIO_MODES = ["subbed", "dubbed"] as const;
export const VIDEO_COLLABORATOR_STATUSES = ["invited", "accepted", "declined"] as const;
export const STORAGE_PROVIDERS = ["livepeer", "cloudflare", "imagekit", "self_hosted"] as const;

/**
 * The status the studio actually renders, derived server-side from the four status columns.
 *
 * Kebab-cased, unlike every other enum here — it is NOT a pgEnum, it is a computed view field,
 * so it follows no column's spelling. Do not snake_case it to "match the others".
 */
export const STUDIO_VIDEO_STATUSES = [
  "failed",
  "processing",
  "pending-review",
  "rejected",
  "approved",
  "scheduled",
  "published",
  "draft",
] as const;

export const VideoTypeSchema = z.enum(VIDEO_TYPES);
export type StudioVideoType = z.infer<typeof VideoTypeSchema>;
export const VideoVisibilitySchema = z.enum(VIDEO_VISIBILITIES);
export type StudioVideoVisibility = z.infer<typeof VideoVisibilitySchema>;
export const StudioVideoStatusSchema = z.enum(STUDIO_VIDEO_STATUSES);
export type StudioVideoStatus = z.infer<typeof StudioVideoStatusSchema>;
export const ContentReviewStatusSchema = z.enum(CONTENT_REVIEW_STATUSES);
export type ContentReviewStatus = z.infer<typeof ContentReviewStatusSchema>;
export const VideoPublishStatusSchema = z.enum(VIDEO_PUBLISH_STATUSES);
export type VideoPublishStatus = z.infer<typeof VideoPublishStatusSchema>;

/* -------------------------------------------------------------------------- */
/* Nested read views                                                            */
/* -------------------------------------------------------------------------- */

export const VideoChapterSchema = z
  .object({ id: z.string(), startSeconds: z.number(), title: z.string() })
  .strip();
export type VideoChapter = z.infer<typeof VideoChapterSchema>;

export const ContentCategoryRefSchema = z
  .object({ id: z.string(), slug: z.string(), label: z.string() })
  .strip();
export type ContentCategoryRef = z.infer<typeof ContentCategoryRefSchema>;

export const VideoAttachedProductSchema = z
  .object({
    id: z.string(),
    productId: z.string(),
    position: z.number(),
    pinnedAtSeconds: z.number().nullable(),
  })
  .strip();

export const VideoLabelSchema = z
  .object({ id: z.string(), label: z.string(), position: z.number() })
  .strip();

export const VideoOpenRoleSchema = z
  .object({
    id: z.string(),
    roleTitle: z.string(),
    roleDescription: z.string().nullable(),
    position: z.number(),
  })
  .strip();

export const VideoTeamMemberSchema = z
  .object({
    id: z.string(),
    memberName: z.string(),
    roleLabel: z.string().nullable(),
    position: z.number(),
  })
  .strip();

export const VideoCollaboratorSchema = z
  .object({
    id: z.string(),
    invitedEmail: z.string(),
    status: z.enum(VIDEO_COLLABORATOR_STATUSES),
  })
  .strip();

export const VideoDocumentSchema = z
  .object({ id: z.string(), url: z.string(), fileName: z.string(), position: z.number() })
  .strip();

export const AnimeEpisodeSchema = z
  .object({
    id: z.string(),
    seriesId: z.string(),
    seriesTitle: z.string(),
    seasonId: z.string(),
    seasonLabel: z.string(),
    episodeNumber: z.number(),
    episodeTitle: z.string(),
    isPremium: z.boolean(),
    // NOT instants, and NOT `z.iso.datetime()`. Both are `text` columns: a weekday name and
    // a clock time. `premiereDate` and `releasedAt` below ARE `timestamp` columns.
    releaseScheduleDay: z.string().nullable(),
    releaseScheduleTime: z.string().nullable(),
    premiereDate: z.iso.datetime().nullable(),
    audioMode: z.enum(ANIME_AUDIO_MODES).nullable(),
    audioLanguage: z.string().nullable(),
    ageRating: z.string().nullable(),
    releasedAt: z.iso.datetime().nullable(),
  })
  .strip();
export type AnimeEpisode = z.infer<typeof AnimeEpisodeSchema>;

/* -------------------------------------------------------------------------- */
/* PublicVideo — the owner-scoped detail read                                   */
/* -------------------------------------------------------------------------- */

/**
 * One video as its owner sees it. Returned by `GET /videos/:videoId`, `PATCH`, publish,
 * unpublish, chapters, products, playlists and thumbnail — every video mutation but create.
 *
 * `isMadeForKids` and `usesAlteredContent` are TRI-STATE (`boolean | null`) and that is not an
 * oversight. `null` means "the creator has not answered", and `isMadeForKids === null` BLOCKS
 * publish. Coercing either to `false` would let an unanswered legal declaration pass as an
 * answered one.
 *
 * `recordingDate` is a DATE column, so it is `"YYYY-MM-DD"`, not an instant. Parsing it as a
 * timestamp shifts it a day in half the world's time zones.
 */
export const PublicVideoSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    videoType: VideoTypeSchema,
    stageBadge: z.enum(VIDEO_STAGE_BADGES).nullable(),

    videoSource: z.enum(["youtube", "hosted"]),
    youtubeVideoId: z.string().nullable(),
    youtubeEmbedUrl: z.string().nullable(),
    // The flag the "verifying…" badge reads. False while a YouTube oEmbed outage is being
    // retried, and PUBLISH IS REFUSED with a 409 for as long as it stays false.
    isSourceVerified: z.boolean(),

    storageProvider: z.enum(STORAGE_PROVIDERS).nullable(),
    playbackId: z.string().nullable(),
    playbackUrl: z.string().nullable(),

    uploadStatus: z.enum(VIDEO_UPLOAD_STATUSES),
    durationSeconds: z.number().nullable(),
    thumbnailUrl: z.string().nullable(),
    hasCustomThumbnail: z.boolean(),

    sectorTags: z.array(z.string()),
    tags: z.array(z.string()),
    websiteUrl: z.string().nullable(),
    ctaLabel: z.string().nullable(),
    ctaUrl: z.string().nullable(),
    linkedinUrl: z.string().nullable(),
    xProfileUrl: z.string().nullable(),
    contactEmail: z.string().nullable(),
    isMadeForKids: z.boolean().nullable(),
    hasAgeRestriction: z.boolean(),
    relatedVideoUrl: z.string().nullable(),
    hasFundingCallToAction: z.boolean(),

    visibility: VideoVisibilitySchema,
    isNdaRequired: z.boolean(),
    scheduledPublishAt: z.iso.datetime().nullable(),
    publishStatus: VideoPublishStatusSchema,
    publishedAt: z.iso.datetime().nullable(),
    reviewStatus: ContentReviewStatusSchema,
    rejectionReason: z.string().nullable(),

    license: z.enum(VIDEO_LICENSES),
    videoLanguage: z.string().nullable(),
    isEmbeddingAllowed: z.boolean(),
    areCommentsEnabled: z.boolean(),
    shouldShowLikesCount: z.boolean(),
    hasPaidPromotion: z.boolean(),
    usesAlteredContent: z.boolean().nullable(),
    captionCertification: z.string().nullable(),
    commentModeration: z.string().nullable(),
    commentSortOrder: z.string().nullable(),
    shortsRemixing: z.enum(SHORTS_REMIX_MODES),
    // DELIBERATELY NOT `z.iso.datetime()` — a DATE column, so `"YYYY-MM-DD"`. See the note
    // at the top of this block; `datetime()` would reject every value it ever holds.
    recordingDate: z.string().nullable(),
    recordingLocation: z.string().nullable(),
    // LEGACY free-text column, read-only and scheduled for removal. `categories` replaced it;
    // nothing writes this and nothing should render it.
    category: z.string().nullable(),

    chapters: z.array(VideoChapterSchema),
    categories: z.array(ContentCategoryRefSchema),
    attachedProducts: z.array(VideoAttachedProductSchema),
    milestones: z.array(VideoLabelSchema),
    openRoles: z.array(VideoOpenRoleSchema),
    teamMembers: z.array(VideoTeamMemberSchema),
    collaborators: z.array(VideoCollaboratorSchema),
    documents: z.array(VideoDocumentSchema),
    playlistIds: z.array(z.string()),
    animeEpisode: AnimeEpisodeSchema.nullable(),

    derivedStatus: StudioVideoStatusSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strip();
export type PublicVideo = z.infer<typeof PublicVideoSchema>;

/**
 * `POST /videos` nests its result. Every OTHER video mutation returns a bare `PublicVideo`, so
 * this is the one place a caller has to reach through a wrapper.
 */
export const CreatedVideoSchema = z
  .object({ video: PublicVideoSchema, suggestedTitle: z.string().nullable() })
  .strip();
export type CreatedVideo = z.infer<typeof CreatedVideoSchema>;

/* -------------------------------------------------------------------------- */
/* VideoListRow — `GET /videos/mine`                                            */
/* -------------------------------------------------------------------------- */

/**
 * The My Videos row. Deliberately narrow.
 *
 * No `isSourceVerified`, no categories, no description — the list read is deliberately narrow
 * so a creator with 500 videos does not pay for the detail payload 500 times. The "verifying…"
 * badge therefore keys on `uploadStatus`/`derivedStatus`, not on the verification flag, which
 * only the detail read carries.
 */
export const VideoListRowSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    thumbnailUrl: z.string().nullable(),
    /** Lets the list tell an anime episode from a pitch — they publish by different routes. */
    videoType: VideoTypeSchema,
    videoSource: z.enum(["youtube", "hosted"]),
    visibility: VideoVisibilitySchema,
    uploadStatus: z.enum(VIDEO_UPLOAD_STATUSES),
    publishStatus: VideoPublishStatusSchema,
    reviewStatus: ContentReviewStatusSchema,
    rejectionReason: z.string().nullable(),
    scheduledPublishAt: z.iso.datetime().nullable(),
    derivedStatus: StudioVideoStatusSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strip();
export type VideoListRow = z.infer<typeof VideoListRowSchema>;

export const PaginationMetaSchema = z
  .object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  })
  .strip();

export const DeletedSchema = z.object({ deleted: z.boolean() }).strip();

/* -------------------------------------------------------------------------- */
/* Write inputs                                                                 */
/* -------------------------------------------------------------------------- */

/** Filters `GET /videos/mine` accepts. Its query schema is `.strict()` — nothing else. */
export interface ListMyVideosFilter {
  readonly page?: number;
  readonly limit?: number;
  readonly publishStatus?: VideoPublishStatus;
  readonly reviewStatus?: ContentReviewStatus;
}

/**
 * The anime block, required on create IF AND ONLY IF `videoType === "anime_episode"`.
 *
 * `seriesId` XOR `newSeriesTitle` — sending both, or neither, is a 422 at path `seriesId`. The
 * either/or is why this is a union rather than two optional fields: the illegal combinations
 * are unrepresentable (CLAUDE.md Pattern 1) instead of caught at the boundary.
 */
export type CreateAnimeEpisodeInput = {
  readonly seasonLabel: string;
  readonly episodeNumber: number;
  readonly episodeTitle: string;
  readonly releaseScheduleDay?: string;
  readonly releaseScheduleTime?: string;
  readonly premiereDate?: string;
  readonly audioMode?: (typeof ANIME_AUDIO_MODES)[number];
  readonly audioLanguage?: string;
  readonly ageRating?: string;
  readonly genreTags?: string[];
} & ({ readonly seriesId: string } | { readonly newSeriesTitle: string });

/**
 * `POST /videos`.
 *
 * ONLY `youtubeUrl` AND `title` ARE REQUIRED; the backend defaults the rest. The create schema
 * is `.strict()`, so any server-owned field — `youtubeVideoId`, `videoSource`, `uploadStatus`,
 * `publishStatus`, `reviewStatus`, `thumbnailUrl`, `durationSeconds` — is a hard 422 rather
 * than a silently ignored key. Never echo a read payload back as a write body.
 */
export interface CreateVideoInput {
  readonly youtubeUrl: string;
  readonly title: string;
  readonly description?: string;
  readonly videoType?: StudioVideoType;
  readonly stageBadge?: (typeof VIDEO_STAGE_BADGES)[number];
  readonly sectorTags?: string[];
  readonly tags?: string[];
  readonly websiteUrl?: string;
  readonly ctaLabel?: string;
  readonly ctaUrl?: string;
  readonly linkedinUrl?: string;
  readonly xProfileUrl?: string;
  readonly contactEmail?: string;
  readonly isMadeForKids?: boolean;
  readonly hasAgeRestriction?: boolean;
  readonly relatedVideoUrl?: string;
  readonly hasFundingCallToAction?: boolean;
  readonly visibility?: StudioVideoVisibility;
  readonly isNdaRequired?: boolean;
  readonly scheduledPublishAt?: string;
  readonly license?: (typeof VIDEO_LICENSES)[number];
  readonly videoLanguage?: string;
  readonly isEmbeddingAllowed?: boolean;
  readonly areCommentsEnabled?: boolean;
  readonly shouldShowLikesCount?: boolean;
  readonly hasPaidPromotion?: boolean;
  readonly usesAlteredContent?: boolean;
  readonly captionCertification?: string;
  readonly commentModeration?: string;
  readonly commentSortOrder?: string;
  readonly shortsRemixing?: (typeof SHORTS_REMIX_MODES)[number];
  /** `"YYYY-MM-DD"`, not an instant — the column is a DATE. */
  readonly recordingDate?: string;
  readonly recordingLocation?: string;
  /** MAX 3, enforced server-side. Ids from `GET /feed/categories`, never slugs. */
  readonly categoryIds?: string[];
  readonly attachedProductIds?: string[];
  readonly milestones?: string[];
  readonly openRoles?: string[];
  readonly teamMemberNames?: string[];
  readonly collaboratorEmails?: string[];
  readonly anime?: CreateAnimeEpisodeInput;
}

/**
 * `PATCH /videos/:videoId` — every create field, all optional, plus a NARROWER anime block.
 *
 * `anime` on update cannot move the episode between series or seasons: `seriesId`,
 * `newSeriesTitle`, `seasonLabel` and `genreTags` are absent from the update schema and are a
 * 422 if sent. Re-homing an episode is a series operation, not a video edit.
 */
export type UpdateVideoInput = Partial<Omit<CreateVideoInput, "anime">> & {
  readonly anime?: {
    readonly episodeNumber?: number;
    readonly episodeTitle?: string;
    readonly releaseScheduleDay?: string;
    readonly releaseScheduleTime?: string;
    readonly premiereDate?: string;
    readonly audioMode?: (typeof ANIME_AUDIO_MODES)[number];
    readonly audioLanguage?: string;
    readonly ageRating?: string;
  };
};

/**
 * `PUT /videos/:videoId/chapters` — a full replace, and the server validates the SHAPE of the
 * list, not just each row: an empty array clears chapters, but 1 or 2 is a 422 ("a video needs
 * at least three chapters for a player to show them"), the first must start at 0, they must
 * ascend, and consecutive starts must be >= 10s apart.
 */
export interface ReplaceChaptersInput {
  readonly chapters: readonly { readonly startSeconds: number; readonly title: string }[];
}
