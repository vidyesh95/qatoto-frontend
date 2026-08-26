// TRANSPORT: props-only — the studio upload form's own shape, plus mappers to and from the
// wire. No network.
//
// WHY A SEPARATE SHAPE AT ALL. The upload modal is a four-step form whose fields are strings
// and checkboxes; the API takes typed arrays, ISO dates and ids. `UploadDraft` is what the form
// edits, `CreateVideoInput` is what the wire takes, and the mapping between them lives here
// rather than being smeared across four step components.
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// EVERY ENUM VALUE HERE IS snake_case, AND THAT IS A CHANGE.
//
// `src/state/studio-videos-context.tsx` — the mock store this replaces — spelled them
// KEBAB-case: `anime-episode`, `investor-only`, `creative-commons`, `video-and-audio`. Those
// are `pgEnum` labels. They are DATA, not identifiers (CLAUDE.md wire-casing), and the backend
// parses them with `z.enum(...).strict()`, so every one of those spellings is a hard 422.
//
// The mock never noticed because nothing was ever sent. Do not "restore consistency" by
// kebab-casing them back.
// ─────────────────────────────────────────────────────────────────────────────────────────

import type {
  CreateAnimeEpisodeInput,
  CreateVideoInput,
  PublicVideo,
  StudioVideoStatus,
  StudioVideoType,
  StudioVideoVisibility,
  UpdateVideoInput,
} from "@/lib/videos/schemas";
import { VIDEO_STAGE_BADGES } from "@/lib/videos/schemas";

export type StudioStageBadge = (typeof VIDEO_STAGE_BADGES)[number];
export type { StudioVideoType, StudioVideoVisibility, StudioVideoStatus };

export type VideoChapter = {
  id: string;
  /** `"mm:ss"` or `"hh:mm:ss"` as typed by the creator; converted on save. */
  timestampLabel: string;
  title: string;
};

export type AnimeEpisodeDetails = {
  /** Either an existing series id, or "" when the creator is naming a new one. */
  seriesId: string;
  /** Set only when `seriesId` is "". The backend takes exactly ONE of the two. */
  newSeriesTitle: string;
  seasonLabel: string;
  episodeNumber: string;
  episodeTitle: string;
  releaseScheduleDay: string;
  releaseScheduleTime: string;
  premiereDate: string;
  audioMode: "subbed" | "dubbed";
  audioLanguage: string;
  ageRating: string;
  genreTags: string[];
};

/** What the four-step upload form edits. */
export type UploadDraft = {
  title: string;
  description: string;
  videoType: StudioVideoType;
  sectorTags: string[];
  stageBadge: StudioStageBadge;
  websiteUrl: string;
  callToActionLabel: string;
  linkedinUrl: string;
  xProfileUrl: string;
  contactEmail: string;
  /** Playlist IDS, not titles. The mock keyed these by title, which merged same-named rows. */
  selectedPlaylistIds: string[];
  isMadeForKids: boolean | null;
  hasAgeRestriction: boolean;
  hasPaidPromotion: boolean;
  usesAlteredContent: boolean | null;
  commaSeparatedTags: string;
  videoLanguage: string;
  captionCertification: string;
  /** `"YYYY-MM-DD"` — a DATE column, not an instant. */
  recordingDate: string;
  recordingLocation: string;
  license: "standard" | "creative_commons";
  isEmbeddingAllowed: boolean;
  shortsRemixing: "video_and_audio" | "audio_only";
  /** Category IDS from `GET /feed/categories`. MAX 3, enforced server-side. */
  categoryIds: string[];
  areCommentsEnabled: boolean;
  commentModeration: string;
  commentSortOrder: string;
  shouldShowLikesCount: boolean;
  relatedVideoUrl: string;
  attachedProductIds: string[];
  hasFundingCallToAction: boolean;
  /*
   * TRANSPORT: mock — NEITHER OF THE NEXT TWO IS EVER SENT.
   *
   * `POST /videos` has no `attachedPitchId` and no document field; its schema is `.strict()`,
   * so including either would be a hard 422 rather than an ignored key. `PublicVideo` does
   * return a read-only `documents` array, but nothing writes it — there is no upload route.
   *
   * They stay on the draft so the two controls in `video-elements-step.tsx` keep working as a
   * layout study, and `toCreateVideoInput` deliberately drops them. A creator who fills them in
   * loses the value on save; that is a known gap, recorded in docs/HOME_STRUCTURE.md §10, and
   * the honest fix is a backend field, not a frontend workaround.
   */
  /**
   * The venture this video belongs to, as a SLUG. Null is unaffiliated content.
   *
   * REPLACED `attachedPitchTitle`, which was a display string chosen from three hardcoded
   * mock titles and sent nowhere — `attachedPitchId` is not client-writable. This one is a
   * real wire field the server resolves and membership-checks.
   */
  researchProjectSlug: string | null;
  attachedDocumentNames: string[];
  /**
   * Recruiting blurbs. Objects since the venture link landed: a blurb may point at a real
   * open role, which is what puts an Apply button under the video instead of a label.
   *
   * `openRoleId` is null for free text, which is still correct for anime and for any video
   * with no venture — the server refuses an id in that case anyway.
   */
  openRoles: {
    roleTitle: string;
    roleDescription: string | null;
    openRoleId: string | null;
  }[];
  teamMemberNames: string[];
  milestones: string[];
  chapters: VideoChapter[];
  collaboratorEmails: string[];
  visibility: StudioVideoVisibility;
  isNdaRequired: boolean;
  /** `"YYYY-MM-DD"` or `""`. Sent as an instant. */
  scheduledPublishDate: string;
  /** The pasted YouTube link. REQUIRED by the API — there is no file-upload route. */
  youtubeUrl: string;
  animeEpisodeDetails: AnimeEpisodeDetails | null;
};

export function createEmptyUploadDraft(): UploadDraft {
  return {
    title: "",
    description: "",
    videoType: "pitch",
    sectorTags: [],
    stageBadge: "idea",
    websiteUrl: "",
    callToActionLabel: "",
    linkedinUrl: "",
    xProfileUrl: "",
    contactEmail: "",
    selectedPlaylistIds: [],
    // NULL, not false: "has the creator answered?" is a different question from "is it for
    // kids?", and publish is refused while this is null.
    isMadeForKids: null,
    hasAgeRestriction: false,
    hasPaidPromotion: false,
    usesAlteredContent: null,
    commaSeparatedTags: "",
    videoLanguage: "English",
    captionCertification: "None",
    recordingDate: "",
    recordingLocation: "",
    license: "standard",
    isEmbeddingAllowed: true,
    shortsRemixing: "video_and_audio",
    categoryIds: [],
    areCommentsEnabled: true,
    commentModeration: "Basic",
    commentSortOrder: "Top",
    shouldShowLikesCount: true,
    relatedVideoUrl: "",
    attachedProductIds: [],
    hasFundingCallToAction: false,
    researchProjectSlug: null,
    attachedDocumentNames: [],
    openRoles: [],
    teamMemberNames: [],
    milestones: [],
    chapters: [],
    collaboratorEmails: [],
    visibility: "private",
    isNdaRequired: false,
    scheduledPublishDate: "",
    youtubeUrl: "",
    animeEpisodeDetails: null,
  };
}

export const MAX_CATEGORIES_PER_VIDEO = 3;

/** `"1:02:05"` / `"6:52"` -> seconds. Returns 0 for anything unparseable. */
export function parseTimestampLabelToSeconds(timestampLabel: string): number {
  const parts = timestampLabel.split(":").map((part) => Number(part.trim()));
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

/** Seconds -> `"6:52"` / `"1:02:05"`. */
export function formatSecondsToTimestampLabel(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.trunc(totalSeconds));
  const hours = Math.trunc(safeSeconds / 3600);
  const minutes = Math.trunc((safeSeconds % 3600) / 60);
  const seconds = String(safeSeconds % 60).padStart(2, "0");
  return hours === 0
    ? `${minutes}:${seconds}`
    : `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`;
}

/**
 * The chapters editor's rows as `PUT /videos/:videoId/chapters` takes them.
 *
 * A SEPARATE ROUTE, NOT PART OF CREATE. `POST /videos` is `.strict()` and has no `chapters`
 * field, so this is a follow-up call the modal fires after the video exists.
 *
 * Rows with an empty title are DROPPED rather than sent: the editor seeds a blank row when the
 * creator clicks "Add chapter", and sending it would be a 422 on a row they never filled in.
 *
 * The backend re-validates the SHAPE of the whole list — 0 is fine but 1-2 is a 422, the first
 * must start at 0, they must ascend, and consecutive starts must be >= 10s apart
 * (`videos.service.ts:174-208`). None of that is checked here; the editor only hints at it and
 * the server is the authority.
 */
export function toChapterInput(
  chapters: readonly VideoChapter[],
): { readonly startSeconds: number; readonly title: string }[] {
  return chapters
    .filter((chapter) => chapter.title.trim().length > 0)
    .map((chapter) => ({
      startSeconds: parseTimestampLabelToSeconds(chapter.timestampLabel),
      title: chapter.title.trim(),
    }));
}

/** Splits the free-text tags field. Empty entries dropped; the API caps the array at 30. */
function splitCommaSeparatedTags(commaSeparatedTags: string): string[] {
  return commaSeparatedTags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

/**
 * Drops empty strings so an untouched optional field is OMITTED rather than sent as `""`.
 *
 * This matters more than it looks: `websiteUrl` is `z.url()` on the backend, so sending `""`
 * for a field the creator never filled is a 422 on a form they consider complete.
 */
function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toAnimeInput(details: AnimeEpisodeDetails): CreateAnimeEpisodeInput {
  const shared = {
    seasonLabel: details.seasonLabel,
    episodeNumber: Number(details.episodeNumber) || 0,
    episodeTitle: details.episodeTitle,
    ...(optionalText(details.releaseScheduleDay) === undefined
      ? {}
      : { releaseScheduleDay: details.releaseScheduleDay.trim() }),
    ...(optionalText(details.releaseScheduleTime) === undefined
      ? {}
      : { releaseScheduleTime: details.releaseScheduleTime.trim() }),
    ...(optionalText(details.premiereDate) === undefined
      ? {}
      : { premiereDate: new Date(details.premiereDate).toISOString() }),
    audioMode: details.audioMode,
    ...(optionalText(details.audioLanguage) === undefined
      ? {}
      : { audioLanguage: details.audioLanguage.trim() }),
    ...(optionalText(details.ageRating) === undefined
      ? {}
      : { ageRating: details.ageRating.trim() }),
    genreTags: details.genreTags,
  };

  // EXACTLY ONE of the two, never both — the backend refines on it and answers 422 at path
  // `seriesId` otherwise. Expressing it as a union means the illegal pair is unrepresentable.
  return details.seriesId.length > 0
    ? { ...shared, seriesId: details.seriesId }
    : { ...shared, newSeriesTitle: details.newSeriesTitle };
}

/**
 * The draft as `POST /videos` takes it.
 *
 * Every optional field is OMITTED rather than sent empty, because the create schema is
 * `.strict()` with real validators on most of them. Server-owned columns — id, status,
 * thumbnail, duration, `youtubeVideoId` — are never included; sending one is a 422.
 */
export function toCreateVideoInput(draft: UploadDraft): CreateVideoInput {
  return {
    youtubeUrl: draft.youtubeUrl.trim(),
    title: draft.title.trim(),
    ...(optionalText(draft.description) === undefined
      ? {}
      : { description: draft.description.trim() }),
    videoType: draft.videoType,
    stageBadge: draft.stageBadge,
    sectorTags: draft.sectorTags,
    tags: splitCommaSeparatedTags(draft.commaSeparatedTags),
    ...(optionalText(draft.websiteUrl) === undefined
      ? {}
      : { websiteUrl: draft.websiteUrl.trim() }),
    ...(optionalText(draft.callToActionLabel) === undefined
      ? {}
      : { ctaLabel: draft.callToActionLabel.trim() }),
    ...(optionalText(draft.linkedinUrl) === undefined
      ? {}
      : { linkedinUrl: draft.linkedinUrl.trim() }),
    ...(optionalText(draft.xProfileUrl) === undefined
      ? {}
      : { xProfileUrl: draft.xProfileUrl.trim() }),
    ...(optionalText(draft.contactEmail) === undefined
      ? {}
      : { contactEmail: draft.contactEmail.trim() }),
    // Only sent once answered. `null` means unanswered and has no wire representation.
    ...(draft.isMadeForKids === null ? {} : { isMadeForKids: draft.isMadeForKids }),
    hasAgeRestriction: draft.hasAgeRestriction,
    ...(optionalText(draft.relatedVideoUrl) === undefined
      ? {}
      : { relatedVideoUrl: draft.relatedVideoUrl.trim() }),
    hasFundingCallToAction: draft.hasFundingCallToAction,
    visibility: draft.visibility,
    isNdaRequired: draft.isNdaRequired,
    ...(optionalText(draft.scheduledPublishDate) === undefined
      ? {}
      : { scheduledPublishAt: new Date(draft.scheduledPublishDate).toISOString() }),
    license: draft.license,
    ...(optionalText(draft.videoLanguage) === undefined
      ? {}
      : { videoLanguage: draft.videoLanguage.trim() }),
    isEmbeddingAllowed: draft.isEmbeddingAllowed,
    areCommentsEnabled: draft.areCommentsEnabled,
    shouldShowLikesCount: draft.shouldShowLikesCount,
    hasPaidPromotion: draft.hasPaidPromotion,
    ...(draft.usesAlteredContent === null ? {} : { usesAlteredContent: draft.usesAlteredContent }),
    ...(optionalText(draft.captionCertification) === undefined
      ? {}
      : { captionCertification: draft.captionCertification.trim() }),
    ...(optionalText(draft.commentModeration) === undefined
      ? {}
      : { commentModeration: draft.commentModeration.trim() }),
    ...(optionalText(draft.commentSortOrder) === undefined
      ? {}
      : { commentSortOrder: draft.commentSortOrder.trim() }),
    shortsRemixing: draft.shortsRemixing,
    ...(optionalText(draft.recordingDate) === undefined
      ? {}
      : { recordingDate: draft.recordingDate.trim() }),
    ...(optionalText(draft.recordingLocation) === undefined
      ? {}
      : { recordingLocation: draft.recordingLocation.trim() }),
    categoryIds: draft.categoryIds.slice(0, MAX_CATEGORIES_PER_VIDEO),
    attachedProductIds: draft.attachedProductIds,
    researchProjectSlug: draft.researchProjectSlug,
    milestones: draft.milestones,
    openRoles: draft.openRoles.map((openRole) => ({
      roleTitle: openRole.roleTitle,
      ...(openRole.roleDescription === null ? {} : { roleDescription: openRole.roleDescription }),
      ...(openRole.openRoleId === null ? {} : { openRoleId: openRole.openRoleId }),
    })),
    teamMemberNames: draft.teamMemberNames,
    collaboratorEmails: draft.collaboratorEmails,
    ...(draft.animeEpisodeDetails === null
      ? {}
      : { anime: toAnimeInput(draft.animeEpisodeDetails) }),
  };
}

/**
 * The draft as `PATCH /videos/:videoId` takes it.
 *
 * `youtubeUrl` is included only when non-empty, and the anime block is NARROWER on update —
 * series, season and genre tags cannot move here, so they are dropped rather than sent and
 * rejected.
 */
export function toUpdateVideoInput(draft: UploadDraft): UpdateVideoInput {
  const { anime: _createAnime, ...createFields } = toCreateVideoInput(draft);
  const animeDetails = draft.animeEpisodeDetails;

  return {
    ...createFields,
    ...(animeDetails === null
      ? {}
      : {
          anime: {
            episodeNumber: Number(animeDetails.episodeNumber) || 0,
            episodeTitle: animeDetails.episodeTitle,
            ...(optionalText(animeDetails.releaseScheduleDay) === undefined
              ? {}
              : { releaseScheduleDay: animeDetails.releaseScheduleDay.trim() }),
            ...(optionalText(animeDetails.releaseScheduleTime) === undefined
              ? {}
              : { releaseScheduleTime: animeDetails.releaseScheduleTime.trim() }),
            ...(optionalText(animeDetails.premiereDate) === undefined
              ? {}
              : { premiereDate: new Date(animeDetails.premiereDate).toISOString() }),
            audioMode: animeDetails.audioMode,
            ...(optionalText(animeDetails.audioLanguage) === undefined
              ? {}
              : { audioLanguage: animeDetails.audioLanguage.trim() }),
            ...(optionalText(animeDetails.ageRating) === undefined
              ? {}
              : { ageRating: animeDetails.ageRating.trim() }),
          },
        }),
  };
}

/** A saved video back into the form shape, for the edit flow. */
export function toUploadDraft(video: PublicVideo): UploadDraft {
  const empty = createEmptyUploadDraft();
  return {
    ...empty,
    title: video.title,
    description: video.description ?? "",
    videoType: video.videoType,
    sectorTags: [...video.sectorTags],
    stageBadge: video.stageBadge ?? "idea",
    websiteUrl: video.websiteUrl ?? "",
    callToActionLabel: video.ctaLabel ?? "",
    linkedinUrl: video.linkedinUrl ?? "",
    xProfileUrl: video.xProfileUrl ?? "",
    contactEmail: video.contactEmail ?? "",
    selectedPlaylistIds: [...video.playlistIds],
    isMadeForKids: video.isMadeForKids,
    hasAgeRestriction: video.hasAgeRestriction,
    hasPaidPromotion: video.hasPaidPromotion,
    usesAlteredContent: video.usesAlteredContent,
    commaSeparatedTags: video.tags.join(", "),
    videoLanguage: video.videoLanguage ?? "",
    captionCertification: video.captionCertification ?? "",
    recordingDate: video.recordingDate ?? "",
    recordingLocation: video.recordingLocation ?? "",
    license: video.license,
    isEmbeddingAllowed: video.isEmbeddingAllowed,
    shortsRemixing: video.shortsRemixing,
    categoryIds: video.categories.map((category) => category.id),
    areCommentsEnabled: video.areCommentsEnabled,
    commentModeration: video.commentModeration ?? "",
    commentSortOrder: video.commentSortOrder ?? "",
    shouldShowLikesCount: video.shouldShowLikesCount,
    relatedVideoUrl: video.relatedVideoUrl ?? "",
    attachedProductIds: video.attachedProducts.map((product) => product.productId),
    hasFundingCallToAction: video.hasFundingCallToAction,
    researchProjectSlug: video.researchProjectSlug,
    openRoles: video.openRoles.map((role) => ({
      roleTitle: role.roleTitle,
      roleDescription: role.roleDescription,
      openRoleId: role.openRoleId,
    })),
    teamMemberNames: video.teamMembers.map((member) => member.memberName),
    milestones: video.milestones.map((milestone) => milestone.label),
    chapters: video.chapters.map((chapter) => ({
      id: chapter.id,
      timestampLabel: formatSecondsToTimestampLabel(chapter.startSeconds),
      title: chapter.title,
    })),
    collaboratorEmails: video.collaborators.map((collaborator) => collaborator.invitedEmail),
    visibility: video.visibility,
    isNdaRequired: video.isNdaRequired,
    scheduledPublishDate: video.scheduledPublishAt?.slice(0, 10) ?? "",
    youtubeUrl: video.youtubeEmbedUrl ?? "",
    animeEpisodeDetails:
      video.animeEpisode === null
        ? null
        : {
            seriesId: video.animeEpisode.seriesId,
            newSeriesTitle: "",
            seasonLabel: video.animeEpisode.seasonLabel,
            episodeNumber: String(video.animeEpisode.episodeNumber),
            episodeTitle: video.animeEpisode.episodeTitle,
            releaseScheduleDay: video.animeEpisode.releaseScheduleDay ?? "",
            releaseScheduleTime: video.animeEpisode.releaseScheduleTime ?? "",
            premiereDate: video.animeEpisode.premiereDate?.slice(0, 10) ?? "",
            audioMode: video.animeEpisode.audioMode ?? "subbed",
            audioLanguage: video.animeEpisode.audioLanguage ?? "",
            ageRating: video.animeEpisode.ageRating ?? "",
            genreTags: [],
          },
  };
}

/** The label the studio shows for a `derivedStatus`. */
export const STUDIO_STATUS_LABELS: Record<StudioVideoStatus, string> = {
  failed: "Failed",
  processing: "Processing",
  "pending-review": "Pending review",
  rejected: "Rejected",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  draft: "Draft",
};
