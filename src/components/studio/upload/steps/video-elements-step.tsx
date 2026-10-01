"use client";

import type { UploadDraft } from "@/lib/videos/studio-view";
import ChaptersEditor from "../chapters-editor";
import TranscriptField, { type PendingTranscriptChange } from "../transcript-field";
import { ProductJourneySection } from "./product-journey-section";
import { MoreElementsSection } from "./video-elements-step-subcomponents";

type VideoElementsStepProps = {
  readonly draft: UploadDraft;
  readonly onDraftChange: (patch: Partial<UploadDraft>) => void;
  readonly onOpenStoreProductsPicker: () => void;
  readonly onOpenInviteCollaborator: () => void;
  readonly pendingDocumentFiles: readonly File[];
  readonly onPendingDocumentFilesChange: (files: File[]) => void;
  readonly onRemoveSavedDocument: (documentId: string) => void;
  readonly pendingTranscriptChange: PendingTranscriptChange;
  readonly onPendingTranscriptChangeChange: (nextChange: PendingTranscriptChange) => void;
};

export default function VideoElementsStep({
  draft,
  onDraftChange,
  onOpenStoreProductsPicker,
  onOpenInviteCollaborator,
  pendingDocumentFiles,
  onPendingDocumentFilesChange,
  onRemoveSavedDocument,
  pendingTranscriptChange,
  onPendingTranscriptChangeChange,
}: VideoElementsStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <ProductJourneySection
        draft={draft}
        onDraftChange={onDraftChange}
        onOpenStoreProductsPicker={onOpenStoreProductsPicker}
        pendingDocumentFiles={pendingDocumentFiles}
        onPendingDocumentFilesChange={onPendingDocumentFilesChange}
        onRemoveSavedDocument={onRemoveSavedDocument}
      />

      <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Chapters</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manual chapters render as segments on the player scrubber.
          </p>
        </div>
        <ChaptersEditor
          chapters={draft.chapters}
          onChaptersChange={(chapters) => onDraftChange({ chapters })}
        />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Transcript (optional)</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your own subtitle file or text, for viewers who would rather read.
          </p>
        </div>
        <TranscriptField
          savedTranscript={draft.savedTranscript}
          pendingChange={pendingTranscriptChange}
          onPendingChangeChange={onPendingTranscriptChangeChange}
        />
      </section>

      <MoreElementsSection
        relatedVideoUrl={draft.relatedVideoUrl}
        collaboratorEmails={draft.collaboratorEmails}
        onRelatedVideoUrlChange={(relatedVideoUrl) => onDraftChange({ relatedVideoUrl })}
        onOpenInviteCollaborator={onOpenInviteCollaborator}
        onRemoveCollaboratorEmail={(collaboratorEmail) =>
          onDraftChange({
            collaboratorEmails: draft.collaboratorEmails.filter(
              (existingEmail) => existingEmail !== collaboratorEmail,
            ),
          })
        }
      />
    </div>
  );
}
