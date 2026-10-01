"use client";

// TRANSPORT: client-query — `POST /videos` on create, `PATCH /videos/:videoId` on edit, and
// `GET /videos/:videoId` to hydrate the edit form.

import { useUploadVideoModalState } from "@/hooks/studio/use-upload-video-modal-state";
import { UPLOAD_STEPS, type UploadVideoModalProps } from "./upload-modal-types";
import {
  UploadModalFooter,
  UploadModalHeader,
  UploadModalOverlays,
  UploadModalPreview,
  UploadModalStepper,
} from "./upload-modal-views";
import { UploadModalStepContent } from "./upload-modal-steps";

export default function UploadVideoModal(props: UploadVideoModalProps) {
  const {
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
  } = useUploadVideoModalState(props);

  const currentStep = UPLOAD_STEPS[currentStepIndex];
  const isSaveDisabled = draft.title.trim() === "" || isSaving;
  const modalTitle = draft.title.trim() === "" ? draft.youtubeUrl || "New video" : draft.title;
  const isHydrating = props.mode === "edit" && !hasHydratedFromServer;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" />
      <div
        aria-label="Upload video"
        className="fixed inset-x-2 inset-y-4 z-50 mx-auto flex max-w-5xl flex-col rounded-2xl border border-border bg-background shadow-lg sm:inset-x-6"
      >
        <UploadModalHeader
          modalTitle={modalTitle}
          isSaving={isSaving}
          mode={props.mode}
          onDismiss={() => void handleModalDismiss()}
        />

        <UploadModalStepper
          currentStepIndex={currentStepIndex}
          onStepSelect={setCurrentStepIndex}
        />

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto p-6">
            {isHydrating ? (
              <p className="text-sm text-muted-foreground">Loading this video…</p>
            ) : (
              <UploadModalStepContent
                stepId={currentStep.id}
                draft={draft}
                currentThumbnailUrl={editedVideo?.thumbnailUrl ?? null}
                selectedThumbnailFile={selectedThumbnailFile}
                pendingDocumentFiles={pendingDocumentFiles}
                pendingTranscriptChange={pendingTranscriptChange}
                onApplyDraftPatch={applyDraftPatch}
                onOpenPlaylistsPicker={() => setActiveOverlay("playlists-picker")}
                onThumbnailFileSelected={setSelectedThumbnailFile}
                onOpenStoreProductsPicker={() => setActiveOverlay("store-products-picker")}
                onOpenInviteCollaborator={() => setActiveOverlay("invite-collaborator")}
                onPendingDocumentFilesChange={setPendingDocumentFiles}
                onRemoveSavedDocument={handleRemoveSavedDocument}
                onPendingTranscriptChangeChange={setPendingTranscriptChange}
              />
            )}
          </div>
          <div className="hidden w-80 shrink-0 overflow-y-auto border-l border-border p-6 lg:block">
            <UploadModalPreview props={props} draft={draft} />
          </div>
        </div>

        <UploadModalFooter
          saveErrorMessage={saveErrorMessage}
          currentStepIndex={currentStepIndex}
          isSaving={isSaving}
          isSaveDisabled={isSaveDisabled}
          draftTitle={draft.title}
          draftVisibility={draft.visibility}
          onBack={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
          onNext={() =>
            setCurrentStepIndex(Math.min(UPLOAD_STEPS.length - 1, currentStepIndex + 1))
          }
          onSave={() => void handleSaveClick()}
          onSaveAndPublish={() => void handleSaveAndPublishClick()}
        />
      </div>

      <UploadModalOverlays
        activeOverlay={activeOverlay}
        draft={draft}
        onCloseOverlay={() => setActiveOverlay("none")}
        onRequestCreatePlaylist={() => setActiveOverlay("create-playlist")}
        onApplyDraftPatch={applyDraftPatch}
      />
    </>
  );
}
