"use client";

// TRANSPORT: client-query — React Query over `@/lib/videos/api`.
//
// REPLACES `src/state/studio-videos-context.tsx`, which held every studio video in a `useState`
// array seeded from 300 lines of fixtures and never called `fetch`. Two shape changes fall out
// of that and both are load-bearing:
//
//   1. EVERY MUTATION IS ASYNC AND CAN FAIL. The context's `addVideo` was synchronous with no
//      error path, so `upload-modal.tsx` closed its dialog on a write that had not happened.
//      Callers here must render `isPending` and surface `error`.
//   2. THE SERVER'S ROW IS THE ROW. The context invented ids with `crypto.randomUUID()` and a
//      status from a local `resolveVideoStatus` helper; both now come back from the backend,
//      which is the only thing that knows whether a video needs anime review.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createVideo,
  deleteVideo,
  getMyVideo,
  listMyVideos,
  publishVideo,
  replaceVideoChapters,
  replaceVideoPlaylists,
  attachVideoDocument,
  detachVideoDocument,
  replaceVideoThumbnail,
  unpublishVideo,
  updateVideo,
} from "@/lib/videos/api";
import type {
  CreateVideoInput,
  ListMyVideosFilter,
  ReplaceChaptersInput,
  UpdateVideoInput,
} from "@/lib/videos/schemas";
import { unwrap } from "@/lib/http";

/**
 * Its own key namespace rather than an entry in `rndKeys` or `feedKeys` — the studio reads a
 * different projection of the same table than the feed does, and invalidating one must not
 * blow away the other.
 */
export const studioVideoKeys = {
  all: ["studio-videos"] as const,
  listRoot: () => ["studio-videos", "list"] as const,
  list: (filter: ListMyVideosFilter) =>
    [
      "studio-videos",
      "list",
      filter.page,
      filter.limit,
      filter.publishStatus,
      filter.reviewStatus,
    ] as const,
  detail: (videoId: string) => ["studio-videos", "detail", videoId] as const,
};

/** `GET /videos/mine`. */
export function useMyVideosQuery(filter: ListMyVideosFilter = {}) {
  return useQuery({
    queryKey: studioVideoKeys.list(filter),
    queryFn: async () => unwrap(await listMyVideos(filter)),
  });
}

/**
 * `GET /videos/:videoId` — the full owner payload.
 *
 * `isEnabled` exists so an edit modal that has not been opened fires nothing. `retry: false`
 * because a 404 here means "not yours or not there", which is an answer, not a flake.
 */
export function useMyVideoQuery(videoId: string, isEnabled = true) {
  return useQuery({
    queryKey: studioVideoKeys.detail(videoId),
    queryFn: async () => unwrap(await getMyVideo(videoId)),
    enabled: isEnabled && videoId !== "",
    retry: false,
  });
}

/**
 * Invalidates the list, and optionally one detail row.
 *
 * Every studio mutation touches the list — a title edit changes a row, a publish changes a
 * status filter's membership — so no mutation below skips it.
 */
function useStudioVideoInvalidation() {
  const queryClient = useQueryClient();
  return {
    invalidateList: (): void => {
      void queryClient.invalidateQueries({ queryKey: studioVideoKeys.listRoot() });
    },
    invalidateDetail: (videoId: string): void => {
      void queryClient.invalidateQueries({ queryKey: studioVideoKeys.detail(videoId) });
    },
  };
}

/** `POST /videos`. Returns `{ video, suggestedTitle }` — the one nested result on this API. */
export function useCreateVideoMutation() {
  const { invalidateList } = useStudioVideoInvalidation();
  return useMutation({
    mutationFn: async (input: CreateVideoInput) => unwrap(await createVideo(input)),
    onSuccess: invalidateList,
  });
}

/** `PATCH /videos/:videoId`. Send only what changed — the schema is `.strict()`. */
export function useUpdateVideoMutation() {
  const { invalidateList, invalidateDetail } = useStudioVideoInvalidation();
  return useMutation({
    mutationFn: async (variables: { readonly videoId: string; readonly input: UpdateVideoInput }) =>
      unwrap(await updateVideo(variables.videoId, variables.input)),
    onSuccess: (_data, variables) => {
      invalidateList();
      invalidateDetail(variables.videoId);
    },
  });
}

/**
 * `POST /videos/:videoId/publish`.
 *
 * THE RESULT IS NOT ALWAYS "PUBLISHED". An anime episode comes back with
 * `reviewStatus: "pending"` and `publishStatus` unchanged — it was submitted for review. The
 * caller must branch on the returned row rather than assuming success means live, and must
 * treat a 409 (`SOURCE_NOT_VERIFIED`) as "try again shortly", not as a hard failure.
 */
export function usePublishVideoMutation() {
  const { invalidateList, invalidateDetail } = useStudioVideoInvalidation();
  return useMutation({
    mutationFn: async (videoId: string) => unwrap(await publishVideo(videoId)),
    onSuccess: (_data, videoId) => {
      invalidateList();
      invalidateDetail(videoId);
    },
  });
}

export function useUnpublishVideoMutation() {
  const { invalidateList, invalidateDetail } = useStudioVideoInvalidation();
  return useMutation({
    mutationFn: async (videoId: string) => unwrap(await unpublishVideo(videoId)),
    onSuccess: (_data, videoId) => {
      invalidateList();
      invalidateDetail(videoId);
    },
  });
}

/** `PUT /videos/:videoId/chapters` — full replace, with server-side shape rules. */
export function useReplaceVideoChaptersMutation() {
  const { invalidateDetail } = useStudioVideoInvalidation();
  return useMutation({
    mutationFn: async (variables: {
      readonly videoId: string;
      readonly input: ReplaceChaptersInput;
    }) => unwrap(await replaceVideoChapters(variables.videoId, variables.input)),
    onSuccess: (_data, variables) => invalidateDetail(variables.videoId),
  });
}

/** `PUT /videos/:videoId/playlists` — appends; it does not order. */
export function useReplaceVideoPlaylistsMutation() {
  const { invalidateDetail } = useStudioVideoInvalidation();
  return useMutation({
    mutationFn: async (variables: {
      readonly videoId: string;
      readonly playlistIds: readonly string[];
    }) => unwrap(await replaceVideoPlaylists(variables.videoId, variables.playlistIds)),
    onSuccess: (_data, variables) => invalidateDetail(variables.videoId),
  });
}

/** `POST /videos/:videoId/thumbnail` — multipart, 5 MB, images only. */
export function useReplaceVideoThumbnailMutation() {
  const { invalidateList, invalidateDetail } = useStudioVideoInvalidation();
  return useMutation({
    mutationFn: async (variables: { readonly videoId: string; readonly imageFile: File }) =>
      unwrap(await replaceVideoThumbnail(variables.videoId, variables.imageFile)),
    onSuccess: (_data, variables) => {
      invalidateList();
      invalidateDetail(variables.videoId);
    },
  });
}

/**
 * `POST /videos/:videoId/documents` — multipart, 25 MB, PDF only.
 *
 * Invalidates the DETAIL read alone, not the list: a document changes nothing on a video card, and
 * the wizard re-reads the detail to show the saved chips.
 */
export function useAttachVideoDocumentMutation() {
  const { invalidateDetail } = useStudioVideoInvalidation();
  return useMutation({
    mutationFn: async (variables: { readonly videoId: string; readonly documentFile: File }) =>
      unwrap(await attachVideoDocument(variables.videoId, variables.documentFile)),
    // NOT `retry`-ed, like every other write in this file. It would be SAFE to retry — the backend
    // keys the row on a hash of the bytes, so a duplicate request converges — but a 25 MB re-send
    // on a slow connection is a cost the creator should choose, not one a hook chooses for them.
    retry: false,
    onSuccess: (_data, variables) => invalidateDetail(variables.videoId),
  });
}

/** `DELETE /videos/:videoId/documents/:documentId`. */
export function useDetachVideoDocumentMutation() {
  const { invalidateDetail } = useStudioVideoInvalidation();
  return useMutation({
    mutationFn: async (variables: { readonly videoId: string; readonly documentId: string }) =>
      unwrap(await detachVideoDocument(variables.videoId, variables.documentId)),
    retry: false,
    onSuccess: (_data, variables) => invalidateDetail(variables.videoId),
  });
}

export function useDeleteVideoMutation() {
  const { invalidateList } = useStudioVideoInvalidation();
  return useMutation({
    mutationFn: async (videoId: string) => unwrap(await deleteVideo(videoId)),
    onSuccess: invalidateList,
  });
}
