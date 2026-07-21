"use client";

import { createContext, use, useState, ReactNode } from "react";

// Shared store for the Creator Studio upload flow (UI phase — mock data only).
// Holds every saved upload plus the creator's playlists so /studio (upload
// modal) and /studio/videos (list, including anime review status) stay in
// sync while navigating. Seeded rows below stand in for backend data.

export type StudioVideoType = "pitch" | "demo" | "update" | "ama" | "anime-episode";
export type StudioStageBadge = "idea" | "mvp" | "scaling" | "shipped";
export type StudioVideoVisibility = "private" | "unlisted" | "public" | "investor-only";
export type StudioPlaylistVisibility = "public" | "unlisted" | "private";

export type StudioVideoStatus =
  | { kind: "processing" }
  | { kind: "draft" }
  | { kind: "scheduled"; scheduledForLabel: string }
  | { kind: "published" }
  | { kind: "pending-review" }
  | { kind: "approved" }
  | { kind: "rejected"; rejectionReason: string };

export type VideoChapter = {
  id: string;
  timestampLabel: string;
  title: string;
};

export type AnimeEpisodeDetails = {
  seriesName: string;
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

export type StudioVideo = {
  id: string;
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
  selectedPlaylistTitles: string[];
  isMadeForKids: boolean | null;
  hasAgeRestriction: boolean;
  hasPaidPromotion: boolean;
  usesAlteredContent: boolean | null;
  commaSeparatedTags: string;
  videoLanguage: string;
  captionCertification: string;
  recordingDate: string;
  recordingLocation: string;
  license: "standard" | "creative-commons";
  isEmbeddingAllowed: boolean;
  shortsRemixing: "video-and-audio" | "audio-only";
  category: string;
  areCommentsEnabled: boolean;
  commentModeration: string;
  commentSortOrder: string;
  shouldShowLikesCount: boolean;
  relatedVideoUrl: string;
  attachedProductIds: string[];
  attachedPitchTitle: string;
  hasFundingCallToAction: boolean;
  openRoles: string[];
  teamMemberNames: string[];
  attachedDocumentNames: string[];
  milestones: string[];
  chapters: VideoChapter[];
  collaboratorEmails: string[];
  visibility: StudioVideoVisibility;
  isNdaRequired: boolean;
  scheduledPublishDate: string;
  fileName: string;
  fileSizeInBytes: number;
  // Empty for videos hosted by Qatoto; set when the creator linked a YouTube video.
  youtubeUrl: string;
  uploadedAtLabel: string;
  animeEpisodeDetails: AnimeEpisodeDetails | null;
  status: StudioVideoStatus;
};

export type StudioPlaylist = {
  title: string;
  visibility: StudioPlaylistVisibility;
};

export type StudioEpisode = {
  id: string;
  episodeNumber: number;
  episodeTitle: string;
  isPremium: boolean;
  attachedVideoId: string | null; // StudioVideo id once an upload is attached
};

export type StudioSeason = {
  id: string;
  seasonLabel: string;
  episodes: StudioEpisode[];
};

export type StudioSeries = {
  id: string;
  title: string;
  description: string;
  posterImagePath: string | null; // null renders a placeholder tile (UI phase)
  genreTags: string[];
  seasons: StudioSeason[];
};

// The upload modal edits this shape; id/status/uploadedAtLabel are stamped on save.
export type UploadDraft = Omit<StudioVideo, "id" | "status" | "uploadedAtLabel">;

export function createEmptyUploadDraft(fileName: string, fileSizeInBytes: number): UploadDraft {
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
    selectedPlaylistTitles: [],
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
    shortsRemixing: "video-and-audio",
    category: "Science & Technology",
    areCommentsEnabled: true,
    commentModeration: "Basic",
    commentSortOrder: "Top",
    shouldShowLikesCount: true,
    relatedVideoUrl: "",
    attachedProductIds: [],
    attachedPitchTitle: "",
    hasFundingCallToAction: false,
    openRoles: [],
    teamMemberNames: [],
    attachedDocumentNames: [],
    milestones: [],
    chapters: [],
    collaboratorEmails: [],
    visibility: "private",
    isNdaRequired: false,
    scheduledPublishDate: "",
    fileName,
    fileSizeInBytes,
    youtubeUrl: "",
    animeEpisodeDetails: null,
  };
}

const EMPTY_DRAFT_DEFAULTS = createEmptyUploadDraft("", 0);

function createSeededVideo(
  overrides: Partial<StudioVideo> &
    Pick<StudioVideo, "id" | "title" | "fileName" | "uploadedAtLabel" | "status">,
): StudioVideo {
  return { ...EMPTY_DRAFT_DEFAULTS, ...overrides };
}

const SEEDED_VIDEOS: StudioVideo[] = [
  createSeededVideo({
    id: "seed-video-pitch-deck-walkthrough",
    title: "Qatoto seed pitch — full deck walkthrough",
    description: "Founder walkthrough of our seed round deck.",
    videoType: "pitch",
    sectorTags: ["AI", "SaaS"],
    stageBadge: "mvp",
    visibility: "public",
    fileName: "seed-pitch-walkthrough.mp4",
    fileSizeInBytes: 214_000_000,
    uploadedAtLabel: "Jun 12, 2026",
    status: { kind: "published" },
  }),
  createSeededVideo({
    id: "seed-video-warehouse-robot-demo",
    title: "Warehouse robot arm — live picking demo",
    description: "Unedited demo of the v2 gripper picking mixed bins.",
    videoType: "demo",
    sectorTags: ["Robotics"],
    stageBadge: "scaling",
    visibility: "unlisted",
    fileName: "robot-arm-demo-take3.mp4",
    fileSizeInBytes: 512_000_000,
    uploadedAtLabel: "Jun 20, 2026",
    status: { kind: "published" },
  }),
  createSeededVideo({
    id: "seed-video-q2-investor-update",
    title: "Q2 investor update",
    description: "",
    videoType: "update",
    sectorTags: ["Fintech"],
    stageBadge: "shipped",
    visibility: "private",
    fileName: "q2-update-draft.mov",
    fileSizeInBytes: 98_000_000,
    uploadedAtLabel: "Jul 1, 2026",
    status: { kind: "draft" },
  }),
  createSeededVideo({
    id: "seed-anime-stellar-drift-ep4",
    title: "Stellar Drift — S1E4 The Silent Orbit",
    videoType: "anime-episode",
    fileName: "stellar-drift-s01e04.mkv",
    fileSizeInBytes: 1_400_000_000,
    uploadedAtLabel: "Jul 2, 2026",
    animeEpisodeDetails: {
      seriesName: "Stellar Drift",
      seasonLabel: "Season 1",
      episodeNumber: "4",
      episodeTitle: "The Silent Orbit",
      releaseScheduleDay: "Friday",
      releaseScheduleTime: "18:00",
      premiereDate: "2026-07-10",
      audioMode: "subbed",
      audioLanguage: "Japanese",
      ageRating: "PG-13",
      genreTags: ["Sci-fi", "Drama"],
    },
    status: { kind: "pending-review" },
  }),
  createSeededVideo({
    id: "seed-anime-stellar-drift-ep3",
    title: "Stellar Drift — S1E3 Gravity Well",
    videoType: "anime-episode",
    fileName: "stellar-drift-s01e03.mkv",
    fileSizeInBytes: 1_350_000_000,
    uploadedAtLabel: "Jun 26, 2026",
    animeEpisodeDetails: {
      seriesName: "Stellar Drift",
      seasonLabel: "Season 1",
      episodeNumber: "3",
      episodeTitle: "Gravity Well",
      releaseScheduleDay: "Friday",
      releaseScheduleTime: "18:00",
      premiereDate: "2026-07-03",
      audioMode: "subbed",
      audioLanguage: "Japanese",
      ageRating: "PG-13",
      genreTags: ["Sci-fi", "Drama"],
    },
    status: { kind: "approved" },
  }),
  createSeededVideo({
    id: "seed-anime-moonlit-dojo-ep1",
    title: "Moonlit Dojo — S1E1 First Stance",
    videoType: "anime-episode",
    fileName: "moonlit-dojo-s01e01.mp4",
    fileSizeInBytes: 900_000_000,
    uploadedAtLabel: "Jun 18, 2026",
    animeEpisodeDetails: {
      seriesName: "Moonlit Dojo",
      seasonLabel: "Season 1",
      episodeNumber: "1",
      episodeTitle: "First Stance",
      releaseScheduleDay: "Tuesday",
      releaseScheduleTime: "20:00",
      premiereDate: "2026-06-23",
      audioMode: "dubbed",
      audioLanguage: "English",
      ageRating: "PG",
      genreTags: ["Sports", "Slice of life"],
    },
    status: {
      kind: "rejected",
      rejectionReason: "Missing licensing documentation for episode content",
    },
  }),
];

// Seeded series correlate with the seeded anime videos above so /studio/series
// and /studio/videos tell the same story. Season 2 of Stellar Drift is empty
// on purpose to exercise the empty-season UI.
const SEEDED_SERIES: StudioSeries[] = [
  {
    id: "stellar-drift",
    title: "Stellar Drift",
    description:
      "A salvage crew drifts through a dying solar system, chasing the signal that grounded their fleet.",
    posterImagePath: null,
    genreTags: ["Sci-fi", "Drama"],
    seasons: [
      {
        id: "stellar-drift-season-1",
        seasonLabel: "Season 1",
        episodes: [
          {
            id: "stellar-drift-s1-ep1",
            episodeNumber: 1,
            episodeTitle: "Cold Launch",
            isPremium: false,
            attachedVideoId: null,
          },
          {
            id: "stellar-drift-s1-ep2",
            episodeNumber: 2,
            episodeTitle: "Debris Field",
            isPremium: false,
            attachedVideoId: null,
          },
          {
            id: "stellar-drift-s1-ep3",
            episodeNumber: 3,
            episodeTitle: "Gravity Well",
            isPremium: false,
            attachedVideoId: "seed-anime-stellar-drift-ep3",
          },
          {
            id: "stellar-drift-s1-ep4",
            episodeNumber: 4,
            episodeTitle: "The Silent Orbit",
            isPremium: true,
            attachedVideoId: "seed-anime-stellar-drift-ep4",
          },
        ],
      },
      {
        id: "stellar-drift-season-2",
        seasonLabel: "Season 2",
        episodes: [],
      },
    ],
  },
  {
    id: "moonlit-dojo",
    title: "Moonlit Dojo",
    description:
      "A retired kendo champion reopens her family dojo and trains a team that only practices after dark.",
    posterImagePath: null,
    genreTags: ["Sports", "Slice of life"],
    seasons: [
      {
        id: "moonlit-dojo-season-1",
        seasonLabel: "Season 1",
        episodes: [
          {
            id: "moonlit-dojo-s1-ep1",
            episodeNumber: 1,
            episodeTitle: "First Stance",
            isPremium: false,
            attachedVideoId: "seed-anime-moonlit-dojo-ep1",
          },
        ],
      },
    ],
  },
];

const SEEDED_PLAYLISTS: StudioPlaylist[] = [
  { title: "Car music", visibility: "public" },
  { title: "java", visibility: "private" },
  { title: "Medatation", visibility: "public" },
  { title: "Ai and Maths", visibility: "public" },
  { title: "maths", visibility: "unlisted" },
  { title: "health and fitness", visibility: "public" },
  { title: "Health", visibility: "public" },
  { title: "Watch today", visibility: "private" },
];

type StudioVideosContextType = {
  videos: StudioVideo[];
  playlists: StudioPlaylist[];
  seriesList: StudioSeries[];
  addVideo: (video: StudioVideo) => void;
  updateVideo: (updatedVideo: StudioVideo) => void;
  addPlaylist: (playlist: StudioPlaylist) => void;
  updatePlaylist: (previousTitle: string, updatedPlaylist: StudioPlaylist) => void;
  deletePlaylist: (playlistTitle: string) => void;
  addSeries: (series: StudioSeries) => void;
  updateSeries: (updatedSeries: StudioSeries) => void;
  deleteSeries: (seriesId: string) => void;
};

const StudioVideosContext = createContext<StudioVideosContextType | undefined>(undefined);

export function StudioVideosProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<StudioVideo[]>(SEEDED_VIDEOS);
  const [playlists, setPlaylists] = useState<StudioPlaylist[]>(SEEDED_PLAYLISTS);
  const [seriesList, setSeriesList] = useState<StudioSeries[]>(SEEDED_SERIES);

  const addVideo = (video: StudioVideo) =>
    setVideos((previousVideos) => [video, ...previousVideos]);

  const updateVideo = (updatedVideo: StudioVideo) =>
    setVideos((previousVideos) =>
      previousVideos.map((existingVideo) =>
        existingVideo.id === updatedVideo.id ? updatedVideo : existingVideo,
      ),
    );

  const addPlaylist = (playlist: StudioPlaylist) =>
    setPlaylists((previousPlaylists) => [...previousPlaylists, playlist]);

  // Playlists are title-keyed (no ids yet), so edits pass the previous title.
  const updatePlaylist = (previousTitle: string, updatedPlaylist: StudioPlaylist) =>
    setPlaylists((previousPlaylists) =>
      previousPlaylists.map((existingPlaylist) =>
        existingPlaylist.title === previousTitle ? updatedPlaylist : existingPlaylist,
      ),
    );

  const deletePlaylist = (playlistTitle: string) =>
    setPlaylists((previousPlaylists) =>
      previousPlaylists.filter((existingPlaylist) => existingPlaylist.title !== playlistTitle),
    );

  const addSeries = (series: StudioSeries) =>
    setSeriesList((previousSeriesList) => [series, ...previousSeriesList]);

  // Whole-object replace by id — covers metadata edits, season add/reorder,
  // and episode add/edit/remove with a single action.
  const updateSeries = (updatedSeries: StudioSeries) =>
    setSeriesList((previousSeriesList) =>
      previousSeriesList.map((existingSeries) =>
        existingSeries.id === updatedSeries.id ? updatedSeries : existingSeries,
      ),
    );

  const deleteSeries = (seriesId: string) =>
    setSeriesList((previousSeriesList) =>
      previousSeriesList.filter((existingSeries) => existingSeries.id !== seriesId),
    );

  return (
    <StudioVideosContext.Provider
      value={{
        videos,
        playlists,
        seriesList,
        addVideo,
        updateVideo,
        addPlaylist,
        updatePlaylist,
        deletePlaylist,
        addSeries,
        updateSeries,
        deleteSeries,
      }}
    >
      {children}
    </StudioVideosContext.Provider>
  );
}

export function useStudioVideos() {
  const context = use(StudioVideosContext);
  if (context === undefined) {
    throw new Error("useStudioVideos must be used within a StudioVideosProvider");
  }
  return context;
}
