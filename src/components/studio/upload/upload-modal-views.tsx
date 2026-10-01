"use client";

import Image from "next/image";
import { useState } from "react";
import CreatePlaylistModal from "./create-playlist-modal";
import PlaylistsPicker from "./playlists-picker";
import StoreProductsPicker from "./store-products-picker";
import VideoPreviewCard from "./video-preview-card";
import type { UploadDraft } from "@/lib/videos/studio-view";
import { UPLOAD_STEPS, type ActiveOverlay, type UploadVideoModalProps } from "./upload-modal-types";

export function UploadModalHeader({
  modalTitle,
  isSaving,
  mode,
  onDismiss,
}: {
  readonly modalTitle: string;
  readonly isSaving: boolean;
  readonly mode: "create" | "edit";
  readonly onDismiss: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
      <h2 className="min-w-0 truncate text-lg font-semibold text-foreground">{modalTitle}</h2>
      <button
        type="button"
        onClick={onDismiss}
        disabled={isSaving}
        aria-label={
          mode === "create" ? "Close and save as private draft" : "Close without saving changes"
        }
        className="shrink-0 cursor-pointer rounded-full p-2 transition-colors hover:bg-muted disabled:opacity-40"
      >
        <Image
          src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
        />
      </button>
    </div>
  );
}

export function UploadModalStepper({
  currentStepIndex,
  onStepSelect,
}: {
  readonly currentStepIndex: number;
  readonly onStepSelect: (stepIndex: number) => void;
}) {
  return (
    <ol className="flex items-center gap-2 border-b border-border px-6 py-4">
      {UPLOAD_STEPS.map((step, stepIndex) => {
        const isCompleted = stepIndex < currentStepIndex;
        const isCurrent = stepIndex === currentStepIndex;
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
            <button
              type="button"
              onClick={() => onStepSelect(stepIndex)}
              className="flex cursor-pointer items-center gap-2"
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                  isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary-imprint"
                    : isCompleted
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Image
                    src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={18}
                    height={18}
                  />
                ) : (
                  stepIndex + 1
                )}
              </span>
              <span
                className={`hidden text-sm md:block ${
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </button>
            {stepIndex < UPLOAD_STEPS.length - 1 && (
              <span
                className={`h-px min-w-4 flex-1 ${isCompleted ? "bg-primary-imprint" : "bg-border"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function UploadModalFooter({
  saveErrorMessage,
  currentStepIndex,
  isSaving,
  isSaveDisabled,
  draftTitle,
  draftVisibility,
  onBack,
  onNext,
  onSave,
  onSaveAndPublish,
}: {
  readonly saveErrorMessage: string | null;
  readonly currentStepIndex: number;
  readonly isSaving: boolean;
  readonly isSaveDisabled: boolean;
  readonly draftTitle: string;
  readonly draftVisibility: string;
  readonly onBack: () => void;
  readonly onNext: () => void;
  readonly onSave: () => void;
  readonly onSaveAndPublish: () => void;
}) {
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === UPLOAD_STEPS.length - 1;

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-6 py-4">
      {saveErrorMessage === null ? (
        <p className="hidden min-w-0 truncate text-xs text-muted-foreground sm:block">
          Checks complete. No issues found.
        </p>
      ) : (
        <p role="alert" className="min-w-0 flex-1 text-xs text-destructive">
          {saveErrorMessage}
        </p>
      )}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className={`cursor-pointer rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 ${
            isFirstStep ? "invisible" : ""
          }`}
        >
          Back
        </button>
        {isLastStep ? (
          <>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaveDisabled}
              title={draftTitle.trim() === "" ? "Add a title to save" : undefined}
              className="cursor-pointer rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-default disabled:opacity-40"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={onSaveAndPublish}
              disabled={isSaveDisabled}
              title={
                draftVisibility === "public"
                  ? undefined
                  : "Set visibility to Public — a private video stays hidden even once published"
              }
              className="cursor-pointer rounded-full bg-primary px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
            >
              {isSaving ? "Working…" : "Save & publish"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="cursor-pointer rounded-full bg-primary px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Next: {UPLOAD_STEPS[currentStepIndex + 1]?.label}
          </button>
        )}
      </div>
    </div>
  );
}

export function UploadModalPreview({
  props,
  draft,
}: {
  readonly props: UploadVideoModalProps;
  readonly draft: UploadDraft;
}) {
  if (props.mode === "edit") {
    return draft.youtubeUrl === "" ? (
      <VideoPreviewCard fileName={draft.title} />
    ) : (
      <VideoPreviewCard youtubeUrl={draft.youtubeUrl} />
    );
  }
  return props.source.kind === "file" ? (
    <VideoPreviewCard videoFile={props.source.videoFile} />
  ) : (
    <VideoPreviewCard youtubeUrl={props.source.youtubeUrl} />
  );
}

export function InviteCollaboratorOverlay({
  collaboratorEmails,
  onCollaboratorEmailsChange,
  onDone,
}: {
  readonly collaboratorEmails: readonly string[];
  readonly onCollaboratorEmailsChange: (collaboratorEmails: string[]) => void;
  readonly onDone: () => void;
}) {
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");

  function handleAddCollaboratorClick() {
    const collaboratorEmail = newCollaboratorEmail.trim();
    if (collaboratorEmail === "" || collaboratorEmails.includes(collaboratorEmail)) return;
    onCollaboratorEmailsChange([...collaboratorEmails, collaboratorEmail]);
    setNewCollaboratorEmail("");
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close invite collaborator"
        onClick={onDone}
        className="fixed inset-0 z-60 cursor-default bg-black/40"
      />
      <div className="fixed inset-x-4 top-1/2 z-70 mx-auto flex max-h-[70dvh] w-auto max-w-sm -translate-y-1/2 flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Invite collaborator</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Collaborators are credited on the video and can be shown as part of the team.
          </p>
        </div>

        {collaboratorEmails.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {collaboratorEmails.map((collaboratorEmail) => (
              <li
                key={collaboratorEmail}
                className="flex items-center gap-1 rounded-full bg-secondary py-1 pr-1 pl-3"
              >
                <span className="max-w-56 truncate text-xs font-medium text-secondary-foreground">
                  {collaboratorEmail}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onCollaboratorEmailsChange(
                      collaboratorEmails.filter(
                        (existingEmail) => existingEmail !== collaboratorEmail,
                      ),
                    )
                  }
                  aria-label={`Remove ${collaboratorEmail}`}
                  className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
                >
                  <Image
                    src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={14}
                    height={14}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            type="email"
            value={newCollaboratorEmail}
            onChange={(event) => setNewCollaboratorEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAddCollaboratorClick();
              }
            }}
            placeholder="collaborator@company.com"
            aria-label="Collaborator email"
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
          />
          <button
            type="button"
            onClick={handleAddCollaboratorClick}
            className="shrink-0 cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
          >
            Add
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDone}
            className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

export function UploadModalOverlays({
  activeOverlay,
  draft,
  onCloseOverlay,
  onRequestCreatePlaylist,
  onApplyDraftPatch,
}: {
  readonly activeOverlay: ActiveOverlay;
  readonly draft: UploadDraft;
  readonly onCloseOverlay: () => void;
  readonly onRequestCreatePlaylist: () => void;
  readonly onApplyDraftPatch: (patch: Partial<UploadDraft>) => void;
}) {
  return (
    <>
      {activeOverlay === "playlists-picker" && (
        <PlaylistsPicker
          selectedPlaylistIds={draft.selectedPlaylistIds}
          onSelectedPlaylistIdsChange={(selectedPlaylistIds) =>
            onApplyDraftPatch({ selectedPlaylistIds })
          }
          onRequestCreatePlaylist={onRequestCreatePlaylist}
          onDone={onCloseOverlay}
        />
      )}
      {activeOverlay === "create-playlist" && (
        <CreatePlaylistModal
          onCreated={(createdPlaylist) => {
            onApplyDraftPatch({
              selectedPlaylistIds: [...draft.selectedPlaylistIds, createdPlaylist.id],
            });
            onRequestCreatePlaylist();
          }}
          onCancel={onRequestCreatePlaylist}
        />
      )}
      {activeOverlay === "store-products-picker" && (
        <StoreProductsPicker
          attachedProductIds={draft.attachedProductIds}
          onAttachedProductIdsChange={(attachedProductIds) =>
            onApplyDraftPatch({ attachedProductIds })
          }
          onDone={onCloseOverlay}
        />
      )}
      {activeOverlay === "invite-collaborator" && (
        <InviteCollaboratorOverlay
          collaboratorEmails={draft.collaboratorEmails}
          onCollaboratorEmailsChange={(collaboratorEmails) =>
            onApplyDraftPatch({ collaboratorEmails })
          }
          onDone={onCloseOverlay}
        />
      )}
    </>
  );
}
