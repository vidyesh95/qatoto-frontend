"use client";

import { useEffect, useRef, useState } from "react";
import {
  useAttachVideoDocumentMutation,
  useCreateVideoMutation,
  useDeleteVideoTranscriptMutation,
  useDetachVideoDocumentMutation,
  useMyVideoQuery,
  usePublishVideoMutation,
  useReplaceVideoChaptersMutation,
  useReplaceVideoPlaylistsMutation,
  useReplaceVideoThumbnailMutation,
  useReplaceVideoTranscriptMutation,
  useUpdateVideoMutation,
} from "@/hooks/videos";
import { ApiRequestError, isForbidden, isUnauthorized } from "@/lib/http";
import { describePublishRefusal } from "@/lib/videos/publish-refusal";
import {
  createEmptyUploadDraft,
  toChapterInput,
  toCreateVideoInput,
  toUpdateVideoInput,
  toUploadDraft,
  type UploadDraft,
} from "@/lib/videos/studio-view";
import type {
  ActiveOverlay,
  SaveOutcome,
  UploadVideoModalProps,
} from "@/components/studio/upload/upload-modal-types";
import type { PendingTranscriptChange } from "@/components/studio/upload/transcript-field";
import { createDraftFromSource, describeSaveError } from "@/lib/videos/upload-modal-helpers";

function useLatestCallbackRef(callback: () => void) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });
  return callbackRef;
}

export function useUploadVideoModalState(props: UploadVideoModalProps) {
  const { onClose } = props;

  const editedVideoQuery = useMyVideoQuery(
    props.mode === "edit" ? props.videoIdToEdit : "",
    props.mode === "edit",
  );

  const [draft, setDraft] = useState<UploadDraft>(() =>
    props.mode === "create" ? createDraftFromSource(props.source) : createEmptyUploadDraft(),
  );
  const [hasHydratedFromServer, setHasHydratedFromServer] = useState(props.mode === "create");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>("none");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [pendingDocumentFiles, setPendingDocumentFiles] = useState<File[]>([]);
  const [pendingTranscriptChange, setPendingTranscriptChange] = useState<PendingTranscriptChange>({
    kind: "unchanged",
  });
  const [createdVideoId, setCreatedVideoId] = useState<string | null>(null);

  const createVideoMutation = useCreateVideoMutation();
  const updateVideoMutation = useUpdateVideoMutation();
  const replaceChaptersMutation = useReplaceVideoChaptersMutation();
  const replacePlaylistsMutation = useReplaceVideoPlaylistsMutation();
  const replaceThumbnailMutation = useReplaceVideoThumbnailMutation();
  const attachDocumentMutation = useAttachVideoDocumentMutation();
  const detachDocumentMutation = useDetachVideoDocumentMutation();
  const replaceTranscriptMutation = useReplaceVideoTranscriptMutation();
  const deleteTranscriptMutation = useDeleteVideoTranscriptMutation();
  const publishMutation = usePublishVideoMutation();

  const isSaving =
    createVideoMutation.isPending ||
    updateVideoMutation.isPending ||
    replaceChaptersMutation.isPending ||
    replacePlaylistsMutation.isPending ||
    replaceThumbnailMutation.isPending ||
    attachDocumentMutation.isPending ||
    replaceTranscriptMutation.isPending ||
    deleteTranscriptMutation.isPending ||
    publishMutation.isPending;

  const editedVideo = editedVideoQuery.data;
  if (!hasHydratedFromServer && editedVideo !== undefined) {
    setDraft(toUploadDraft(editedVideo));
    setHasHydratedFromServer(true);
  }

  function applyDraftPatch(draftPatch: Partial<UploadDraft>) {
    setDraft((previousDraft) => ({ ...previousDraft, ...draftPatch }));
  }

  async function handleRemoveSavedDocument(documentId: string) {
    if (props.mode !== "edit") return;
    setSaveErrorMessage(null);
    try {
      await detachDocumentMutation.mutateAsync({ videoId: props.videoIdToEdit, documentId });
      setDraft((previousDraft) => ({
        ...previousDraft,
        savedDocuments: previousDraft.savedDocuments.filter(
          (savedDocument) => savedDocument.id !== documentId,
        ),
      }));
    } catch (error) {
      setSaveErrorMessage(`The document was not removed: ${describeSaveError(error)}`);
    }
  }

  async function saveDraft(options: { readonly asPrivateDraft: boolean }): Promise<SaveOutcome> {
    setSaveErrorMessage(null);
    const draftToSave: UploadDraft = options.asPrivateDraft
      ? { ...draft, visibility: "private" }
      : draft;

    const existingVideoId = props.mode === "edit" ? props.videoIdToEdit : createdVideoId;

    let savedVideoId: string;
    try {
      if (existingVideoId === null) {
        const created = await createVideoMutation.mutateAsync(toCreateVideoInput(draftToSave));
        savedVideoId = created.video.id;
        setCreatedVideoId(savedVideoId);
      } else {
        const updated = await updateVideoMutation.mutateAsync({
          videoId: existingVideoId,
          input: toUpdateVideoInput(draftToSave),
        });
        savedVideoId = updated.id;
      }
    } catch (error) {
      setSaveErrorMessage(describeSaveError(error));
      return { kind: "create_failed", error };
    }

    const chapterInput = toChapterInput(draftToSave.chapters);
    try {
      if (chapterInput.length > 0 || existingVideoId !== null) {
        await replaceChaptersMutation.mutateAsync({
          videoId: savedVideoId,
          input: { chapters: chapterInput },
        });
      }
    } catch (error) {
      setSaveErrorMessage(`Video saved, but the chapters were not: ${describeSaveError(error)}`);
      return { kind: "saved_with_problem", videoId: savedVideoId };
    }

    try {
      if (draftToSave.selectedPlaylistIds.length > 0) {
        await replacePlaylistsMutation.mutateAsync({
          videoId: savedVideoId,
          playlistIds: draftToSave.selectedPlaylistIds,
        });
      }
    } catch (error) {
      setSaveErrorMessage(`Video saved, but the playlists were not: ${describeSaveError(error)}`);
      return { kind: "saved_with_problem", videoId: savedVideoId };
    }

    try {
      if (selectedThumbnailFile !== null) {
        await replaceThumbnailMutation.mutateAsync({
          videoId: savedVideoId,
          imageFile: selectedThumbnailFile,
        });
      }
    } catch (error) {
      setSaveErrorMessage(`Video saved, but the thumbnail was not: ${describeSaveError(error)}`);
      return { kind: "saved_with_problem", videoId: savedVideoId };
    }

    try {
      if (pendingDocumentFiles.length > 0) {
        await Promise.all(
          pendingDocumentFiles.map((documentFile) =>
            attachDocumentMutation.mutateAsync({ videoId: savedVideoId, documentFile }),
          ),
        );
        setPendingDocumentFiles([]);
      }
    } catch (error) {
      setSaveErrorMessage(`Video saved, but a document was not: ${describeSaveError(error)}`);
      return { kind: "saved_with_problem", videoId: savedVideoId };
    }

    try {
      if (pendingTranscriptChange.kind === "replace") {
        await replaceTranscriptMutation.mutateAsync({
          videoId: savedVideoId,
          transcriptFile: pendingTranscriptChange.transcriptFile,
        });
        setPendingTranscriptChange({ kind: "unchanged" });
      } else if (pendingTranscriptChange.kind === "remove") {
        await deleteTranscriptMutation.mutateAsync(savedVideoId);
        setPendingTranscriptChange({ kind: "unchanged" });
      }
    } catch (error) {
      setSaveErrorMessage(`Video saved, but the transcript was not: ${describeSaveError(error)}`);
      return { kind: "saved_with_problem", videoId: savedVideoId };
    }

    return { kind: "saved", videoId: savedVideoId };
  }

  async function handleSaveClick() {
    if (draft.title.trim() === "") return;
    const outcome = await saveDraft({ asPrivateDraft: false });
    if (outcome.kind === "saved") {
      onClose();
    }
  }

  async function handleSaveAndPublishClick() {
    if (draft.title.trim() === "") return;
    if (draft.visibility !== "public") {
      setSaveErrorMessage(
        "Visibility is not Public. Go to the Visibility step and select Public before clicking Save & publish.",
      );
      return;
    }

    const outcome = await saveDraft({ asPrivateDraft: false });
    if (outcome.kind !== "saved") return;

    try {
      await publishMutation.mutateAsync(outcome.videoId);
      onClose();
    } catch (error) {
      const refusal = describePublishRefusal(error);
      setSaveErrorMessage(`Video saved, but not published: ${refusal.message}`);
    }
  }

  async function handleModalDismiss() {
    if (props.mode !== "create" || draft.youtubeUrl.trim() === "") {
      onClose();
      return;
    }
    const outcome = await saveDraft({ asPrivateDraft: true });
    if (
      outcome.kind !== "create_failed" ||
      (outcome.error instanceof ApiRequestError &&
        (isUnauthorized(outcome.error.apiError) || isForbidden(outcome.error.apiError)))
    ) {
      onClose();
    }
  }

  const handleModalDismissRef = useLatestCallbackRef(() => void handleModalDismiss());

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key !== "Escape") return;
      if (activeOverlay === "create-playlist") {
        setActiveOverlay("playlists-picker");
      } else if (activeOverlay !== "none") {
        setActiveOverlay("none");
      } else {
        handleModalDismissRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeOverlay, handleModalDismissRef]);

  return {
    draft,
    editedVideo,
    hasHydratedFromServer,
    currentStepIndex,
    setCurrentStepIndex,
    activeOverlay,
    setActiveOverlay,
    saveErrorMessage,
    selectedThumbnailFile,
    setSelectedThumbnailFile,
    pendingDocumentFiles,
    setPendingDocumentFiles,
    pendingTranscriptChange,
    setPendingTranscriptChange,
    isSaving,
    applyDraftPatch,
    handleRemoveSavedDocument,
    handleSaveClick,
    handleSaveAndPublishClick,
    handleModalDismiss,
  };
}
