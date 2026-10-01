"use client";

import type { UploadDraft } from "@/lib/videos/studio-view";
import type { UploadStepId } from "./upload-modal-types";
import type { PendingTranscriptChange } from "./transcript-field";
import ChecksStep from "./steps/checks-step";
import DetailsStep from "./steps/details-step";
import VideoElementsStep from "./steps/video-elements-step";
import VisibilityStep from "./steps/visibility-step";

export function UploadModalStepContent({
  stepId,
  draft,
  currentThumbnailUrl,
  selectedThumbnailFile,
  pendingDocumentFiles,
  pendingTranscriptChange,
  onApplyDraftPatch,
  onOpenPlaylistsPicker,
  onThumbnailFileSelected,
  onOpenStoreProductsPicker,
  onOpenInviteCollaborator,
  onPendingDocumentFilesChange,
  onRemoveSavedDocument,
  onPendingTranscriptChangeChange,
}: {
  readonly stepId: UploadStepId;
  readonly draft: UploadDraft;
  readonly currentThumbnailUrl: string | null;
  readonly selectedThumbnailFile: File | null;
  readonly pendingDocumentFiles: readonly File[];
  readonly pendingTranscriptChange: PendingTranscriptChange;
  readonly onApplyDraftPatch: (patch: Partial<UploadDraft>) => void;
  readonly onOpenPlaylistsPicker: () => void;
  readonly onThumbnailFileSelected: (file: File | null) => void;
  readonly onOpenStoreProductsPicker: () => void;
  readonly onOpenInviteCollaborator: () => void;
  readonly onPendingDocumentFilesChange: (files: File[]) => void;
  readonly onRemoveSavedDocument: (documentId: string) => void;
  readonly onPendingTranscriptChangeChange: (change: PendingTranscriptChange) => void;
}) {
  switch (stepId) {
    case "details":
      return (
        <DetailsStep
          draft={draft}
          onDraftChange={onApplyDraftPatch}
          onOpenPlaylistsPicker={onOpenPlaylistsPicker}
          currentThumbnailUrl={currentThumbnailUrl}
          selectedThumbnailFile={selectedThumbnailFile}
          onThumbnailFileSelected={onThumbnailFileSelected}
        />
      );
    case "video-elements":
      return (
        <VideoElementsStep
          draft={draft}
          onDraftChange={onApplyDraftPatch}
          onOpenStoreProductsPicker={onOpenStoreProductsPicker}
          onOpenInviteCollaborator={onOpenInviteCollaborator}
          pendingDocumentFiles={pendingDocumentFiles}
          onPendingDocumentFilesChange={onPendingDocumentFilesChange}
          onRemoveSavedDocument={onRemoveSavedDocument}
          pendingTranscriptChange={pendingTranscriptChange}
          onPendingTranscriptChangeChange={onPendingTranscriptChangeChange}
        />
      );
    case "checks":
      return <ChecksStep />;
    case "visibility":
      return <VisibilityStep draft={draft} onDraftChange={onApplyDraftPatch} />;
    default: {
      const exhaustiveCheck: never = stepId;
      return exhaustiveCheck;
    }
  }
}
