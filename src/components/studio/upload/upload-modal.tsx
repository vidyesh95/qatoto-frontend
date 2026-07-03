"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  StudioVideo,
  UploadDraft,
  createEmptyUploadDraft,
  useStudioVideos,
} from "@/state/studio-videos-context";
import VideoPreviewCard from "./video-preview-card";
import PlaylistsPicker from "./playlists-picker";
import CreatePlaylistModal from "./create-playlist-modal";
import StoreProductsPicker from "./store-products-picker";
import DetailsStep from "./steps/details-step";
import VideoElementsStep from "./steps/video-elements-step";
import ChecksStep from "./steps/checks-step";
import VisibilityStep from "./steps/visibility-step";

// The YouTube-style 4-step upload wizard (UPLOAD_VIDEO_STRUCTURE.md §3).
// Closing with X or Escape still commits the upload as a private draft (§2);
// only leaving via Save publishes with the chosen visibility. Sub-pickers are
// stacked overlay layers driven by one ActiveOverlay union, so a single Escape
// handler always closes the innermost layer first.
const UPLOAD_STEPS = [
  { id: "details", label: "Details" },
  { id: "video-elements", label: "Video elements" },
  { id: "checks", label: "Checks" },
  { id: "visibility", label: "Visibility" },
] as const;

type UploadStepId = (typeof UPLOAD_STEPS)[number]["id"];

type ActiveOverlay =
  | "none"
  | "playlists-picker"
  | "create-playlist"
  | "store-products-picker"
  | "invite-collaborator";

type UploadVideoModalProps = {
  videoFile: File;
  onClose: () => void;
};

export default function UploadVideoModal({ videoFile, onClose }: UploadVideoModalProps) {
  const { addVideo, addPlaylist } = useStudioVideos();
  const [draft, setDraft] = useState<UploadDraft>(() =>
    createEmptyUploadDraft(videoFile.name, videoFile.size),
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>("none");

  function applyDraftPatch(draftPatch: Partial<UploadDraft>) {
    setDraft((previousDraft) => ({ ...previousDraft, ...draftPatch }));
  }

  function commitVideo(saveMode: "explicit-save" | "close-as-draft") {
    const video = buildVideoFromDraft(draft, saveMode);
    addVideo(video);
    onClose();
  }

  function handleSaveClick() {
    if (draft.title.trim() === "") return;
    commitVideo("explicit-save");
  }

  function handleCloseAsDraft() {
    commitVideo("close-as-draft");
  }

  // Escape needs the latest draft without re-subscribing on every keystroke.
  const handleCloseAsDraftRef = useLatestCallbackRef(handleCloseAsDraft);

  // Body scroll locks for the modal's whole lifetime.
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  // One Escape handler for the whole stack: innermost overlay first, then the
  // modal itself (which commits a private draft). Re-subscribes only when the
  // overlay layer changes — rare, unlike draft keystrokes.
  useEffect(() => {
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key !== "Escape") return;
      if (activeOverlay === "create-playlist") {
        setActiveOverlay("playlists-picker");
      } else if (activeOverlay !== "none") {
        setActiveOverlay("none");
      } else {
        handleCloseAsDraftRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeOverlay, handleCloseAsDraftRef]);

  const currentStep = UPLOAD_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === UPLOAD_STEPS.length - 1;
  const isSaveDisabled = draft.title.trim() === "";
  const modalTitle = draft.title.trim() === "" ? videoFile.name : draft.title;

  function renderCurrentStep(stepId: UploadStepId) {
    switch (stepId) {
      case "details":
        return (
          <DetailsStep
            draft={draft}
            onDraftChange={applyDraftPatch}
            onOpenPlaylistsPicker={() => setActiveOverlay("playlists-picker")}
          />
        );
      case "video-elements":
        return (
          <VideoElementsStep
            draft={draft}
            onDraftChange={applyDraftPatch}
            onOpenStoreProductsPicker={() => setActiveOverlay("store-products-picker")}
            onOpenInviteCollaborator={() => setActiveOverlay("invite-collaborator")}
          />
        );
      case "checks":
        return <ChecksStep />;
      case "visibility":
        return <VisibilityStep draft={draft} onDraftChange={applyDraftPatch} />;
      default: {
        const exhaustiveCheck: never = stepId;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" />
      <div
        aria-label="Upload video"
        className="fixed inset-x-2 inset-y-4 z-50 mx-auto flex max-w-5xl flex-col rounded-2xl border border-black/10 bg-background shadow-lg sm:inset-x-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-black/10 px-6 py-4">
          <h2 className="min-w-0 truncate text-lg font-semibold text-foreground">{modalTitle}</h2>
          <button
            type="button"
            onClick={handleCloseAsDraft}
            aria-label="Close and save as private draft"
            className="shrink-0 cursor-pointer rounded-full p-2 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        </div>

        {/* Stepper */}
        <ol className="flex items-center gap-2 border-b border-black/10 px-6 py-4">
          {UPLOAD_STEPS.map((step, stepIndex) => {
            const isCompleted = stepIndex < currentStepIndex;
            const isCurrent = stepIndex === currentStepIndex;
            return (
              <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex(stepIndex)}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                      isCurrent
                        ? "bg-primary text-primary-foreground ring-2 ring-[#1DBDC5]"
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
                    className={`h-px min-w-4 flex-1 ${isCompleted ? "bg-[#1DBDC5]" : "bg-border"}`}
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* Body: form left, preview right */}
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto p-6">
            {renderCurrentStep(currentStep.id)}
          </div>
          <div className="hidden w-80 shrink-0 overflow-y-auto border-l border-black/10 p-6 lg:block">
            <VideoPreviewCard videoFile={videoFile} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-black/10 px-6 py-4">
          <p className="hidden min-w-0 truncate text-xs text-muted-foreground sm:block">
            Checks complete. No issues found.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
              className={`cursor-pointer rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 ${
                isFirstStep ? "invisible" : ""
              }`}
            >
              Back
            </button>
            {isLastStep ? (
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={isSaveDisabled}
                title={isSaveDisabled ? "Add a title to save" : undefined}
                className="cursor-pointer rounded-full bg-primary px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
              >
                Save
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setCurrentStepIndex(Math.min(UPLOAD_STEPS.length - 1, currentStepIndex + 1))
                }
                className="cursor-pointer rounded-full bg-primary px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
              >
                Next: {UPLOAD_STEPS[currentStepIndex + 1].label}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stacked overlays */}
      {activeOverlay === "playlists-picker" && (
        <PlaylistsPicker
          selectedPlaylistTitles={draft.selectedPlaylistTitles}
          onSelectedPlaylistTitlesChange={(selectedPlaylistTitles) =>
            applyDraftPatch({ selectedPlaylistTitles })
          }
          onRequestCreatePlaylist={() => setActiveOverlay("create-playlist")}
          onDone={() => setActiveOverlay("none")}
        />
      )}
      {activeOverlay === "create-playlist" && (
        <CreatePlaylistModal
          onCreate={(newPlaylist) => {
            addPlaylist(newPlaylist);
            applyDraftPatch({
              selectedPlaylistTitles: [...draft.selectedPlaylistTitles, newPlaylist.title],
            });
            setActiveOverlay("playlists-picker");
          }}
          onCancel={() => setActiveOverlay("playlists-picker")}
        />
      )}
      {activeOverlay === "store-products-picker" && (
        <StoreProductsPicker
          attachedProductIds={draft.attachedProductIds}
          onAttachedProductIdsChange={(attachedProductIds) =>
            applyDraftPatch({ attachedProductIds })
          }
          onDone={() => setActiveOverlay("none")}
        />
      )}
      {activeOverlay === "invite-collaborator" && (
        <InviteCollaboratorOverlay
          collaboratorEmails={draft.collaboratorEmails}
          onCollaboratorEmailsChange={(collaboratorEmails) =>
            applyDraftPatch({ collaboratorEmails })
          }
          onDone={() => setActiveOverlay("none")}
        />
      )}
    </>
  );
}

/* ---------- Save helpers ---------- */

function buildVideoFromDraft(
  draft: UploadDraft,
  saveMode: "explicit-save" | "close-as-draft",
): StudioVideo {
  const resolvedTitle = draft.title.trim() === "" ? draft.fileName : draft.title.trim();
  const uploadedAtLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    ...draft,
    id: crypto.randomUUID(),
    title: resolvedTitle,
    visibility: saveMode === "close-as-draft" ? "private" : draft.visibility,
    uploadedAtLabel,
    status: resolveVideoStatus(draft, saveMode),
  };
}

// Anime episodes always enter the admin review queue regardless of how the
// modal was left; normal videos publish on Save (or stay a draft on X-close).
function resolveVideoStatus(
  draft: UploadDraft,
  saveMode: "explicit-save" | "close-as-draft",
): StudioVideo["status"] {
  if (draft.videoType === "anime-episode") return { kind: "pending-review" };
  if (saveMode === "close-as-draft") return { kind: "draft" };
  if (draft.scheduledPublishDate !== "") {
    return {
      kind: "scheduled",
      scheduledForLabel: formatScheduledForLabel(draft.scheduledPublishDate),
    };
  }
  return { kind: "published" };
}

function formatScheduledForLabel(scheduledPublishDate: string) {
  const parsedDate = new Date(scheduledPublishDate);
  if (Number.isNaN(parsedDate.getTime())) return scheduledPublishDate;
  return parsedDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Stores the latest callback in a ref so a mount-once event listener can call
// current state without re-subscribing.
function useLatestCallbackRef(callback: () => void) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });
  return callbackRef;
}

/* ---------- Invite collaborator overlay ---------- */

type InviteCollaboratorOverlayProps = {
  collaboratorEmails: string[];
  onCollaboratorEmailsChange: (collaboratorEmails: string[]) => void;
  onDone: () => void;
};

function InviteCollaboratorOverlay({
  collaboratorEmails,
  onCollaboratorEmailsChange,
  onDone,
}: InviteCollaboratorOverlayProps) {
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
      <div className="fixed inset-x-4 top-1/2 z-70 mx-auto flex max-h-[70dvh] w-auto max-w-sm -translate-y-1/2 flex-col gap-4 rounded-2xl border border-black/10 bg-background p-6 shadow-lg">
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
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
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
