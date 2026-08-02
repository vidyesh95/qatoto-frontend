"use client";

// TRANSPORT: client-query — `POST /videos` on create, `PATCH /videos/:videoId` on edit, and
// `GET /videos/:videoId` to hydrate the edit form.
//
// THE SAVE PATH USED TO BE SYNCHRONOUS AND COULD NOT FAIL. `useStudioVideos().addVideo` pushed
// onto a `useState` array, so this modal closed itself on the same tick it "saved". Three
// things follow from making it a real request, and all three are visible in the UI now:
//
//   1. SAVE IS PENDING, THEN DONE OR FAILED. The modal stays open on failure with the backend's
//      own message — a 422 here names the field the creator has to fix, and swallowing it would
//      leave a Save button that appears to do nothing.
//   2. X-CLOSE STILL COMMITS A PRIVATE DRAFT (UPLOAD_VIDEO_STRUCTURE §2) but now AWAITS it. A
//      fire-and-forget draft save that 422s would lose the creator's work silently, which is
//      the exact failure the draft behaviour exists to prevent.
//   3. THE SERVER OWNS THE ID AND THE STATUS. No more `crypto.randomUUID()` and no local
//      `resolveVideoStatus` — whether an anime episode needs review is the backend's call.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import ChecksStep from "./steps/checks-step";
import CreatePlaylistModal from "./create-playlist-modal";
import DetailsStep from "./steps/details-step";
import PlaylistsPicker from "./playlists-picker";
import StoreProductsPicker from "./store-products-picker";
import VideoElementsStep from "./steps/video-elements-step";
import VideoPreviewCard from "./video-preview-card";
import VisibilityStep from "./steps/visibility-step";
import {
  useCreateVideoMutation,
  useMyVideoQuery,
  usePublishVideoMutation,
  useReplaceVideoChaptersMutation,
  useReplaceVideoPlaylistsMutation,
  useReplaceVideoThumbnailMutation,
  useUpdateVideoMutation,
} from "@/hooks/videos";
import { ApiRequestError } from "@/lib/http";
import { describePublishRefusal } from "@/lib/videos/publish-refusal";
import {
  createEmptyUploadDraft,
  toChapterInput,
  toCreateVideoInput,
  toUpdateVideoInput,
  toUploadDraft,
  type UploadDraft,
} from "@/lib/videos/studio-view";

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

/**
 * What the new video is sourced from.
 *
 * ONLY THE YOUTUBE PATH REACHES THE BACKEND. `POST /videos` requires a `youtubeUrl` and there is
 * no video-file upload route anywhere on the platform — self-hosting is deferred (Studio
 * Appendix A). The `file` variant is kept because the entry UI still offers it, and it now
 * fails honestly at save time instead of appearing to work.
 */
type UploadSource = { kind: "file"; videoFile: File } | { kind: "youtube"; youtubeUrl: string };

/**
 * What a save actually did, returned rather than read back off state.
 *
 * The video and its three follow-up routes can fail INDEPENDENTLY — the row is written and the
 * chapters are not — so "did it save" and "is everything saved" are different questions. The
 * caller needs the second one to decide whether to close, and needs the id to publish.
 */
type SaveOutcome =
  | { readonly kind: "create_failed" }
  | { readonly kind: "saved_with_problem"; readonly videoId: string }
  | { readonly kind: "saved"; readonly videoId: string };

type UploadVideoModalProps =
  | { mode: "create"; source: UploadSource; onClose: () => void }
  | { mode: "edit"; videoIdToEdit: string; onClose: () => void };

export default function UploadVideoModal(props: UploadVideoModalProps) {
  const { onClose } = props;

  // Edit mode hydrates from the DETAIL read, not from the list row: the list carries thirteen
  // fields and the form needs sixty. `enabled` keeps create mode from firing it.
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
  /**
   * Held here rather than in the draft, because a `File` is not JSON and never goes to
   * `POST /videos`. The thumbnail is its own multipart route against a videoId that does not
   * exist until after create, so the modal keeps the file and uploads it in the follow-up pass.
   */
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);

  const createVideoMutation = useCreateVideoMutation();
  const updateVideoMutation = useUpdateVideoMutation();
  const replaceChaptersMutation = useReplaceVideoChaptersMutation();
  const replacePlaylistsMutation = useReplaceVideoPlaylistsMutation();
  const replaceThumbnailMutation = useReplaceVideoThumbnailMutation();
  const publishMutation = usePublishVideoMutation();
  const isSaving =
    createVideoMutation.isPending ||
    updateVideoMutation.isPending ||
    replaceChaptersMutation.isPending ||
    replacePlaylistsMutation.isPending ||
    replaceThumbnailMutation.isPending ||
    publishMutation.isPending;

  // Fills the form once the detail read lands. Guarded so a background refetch cannot throw
  // away edits the creator has made since.
  const editedVideo = editedVideoQuery.data;
  useEffect(() => {
    if (hasHydratedFromServer || editedVideo === undefined) return;
    setDraft(toUploadDraft(editedVideo));
    setHasHydratedFromServer(true);
  }, [hasHydratedFromServer, editedVideo]);

  function applyDraftPatch(draftPatch: Partial<UploadDraft>) {
    setDraft((previousDraft) => ({ ...previousDraft, ...draftPatch }));
  }

  /**
   * Saves the draft and everything that rides its own route, returning the saved video's id.
   *
   * THREE FOLLOW-UP CALLS, AND THEY ARE NOT OPTIONAL EXTRAS. Chapters, playlist membership and
   * the thumbnail each have their own endpoint — `POST /videos` is `.strict()` and accepts none
   * of them — so without this pass the wizard collects all three and silently discards them.
   * That was the shipped behaviour and it was a bug: three working editors, none of them saving.
   *
   * SEQUENTIAL, NOT PARALLEL, so a failure names its own step. And the video IS SAVED even when
   * a follow-up fails, so the message says which part did not stick rather than implying the
   * whole thing was lost.
   */
  async function saveDraft(options: { readonly asPrivateDraft: boolean }): Promise<SaveOutcome> {
    setSaveErrorMessage(null);
    const draftToSave: UploadDraft = options.asPrivateDraft
      ? { ...draft, visibility: "private" }
      : draft;

    let savedVideoId: string;
    try {
      if (props.mode === "create") {
        const created = await createVideoMutation.mutateAsync(toCreateVideoInput(draftToSave));
        savedVideoId = created.video.id;
      } else {
        const updated = await updateVideoMutation.mutateAsync({
          videoId: props.videoIdToEdit,
          input: toUpdateVideoInput(draftToSave),
        });
        savedVideoId = updated.id;
      }
    } catch (error) {
      setSaveErrorMessage(describeSaveError(error));
      return { kind: "create_failed" };
    }

    const chapterInput = toChapterInput(draftToSave.chapters);
    try {
      if (chapterInput.length > 0) {
        await replaceChaptersMutation.mutateAsync({
          videoId: savedVideoId,
          input: { chapters: chapterInput },
        });
      }
    } catch (error) {
      // The backend validates the whole LIST, not each row: 1-2 chapters is a 422, the first
      // must start at 0:00, and consecutive starts must be >= 10s apart. Its message already
      // names the offending chapter, so it is passed through untouched.
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

    return { kind: "saved", videoId: savedVideoId };
  }

  async function handleSaveClick() {
    if (draft.title.trim() === "") return;
    const outcome = await saveDraft({ asPrivateDraft: false });
    // Only a fully clean save closes the modal. `saveErrorMessage` cannot be read here —
    // it was set during this same tick and the closure still holds the previous value, which
    // is why the outcome is RETURNED rather than inferred from state.
    if (outcome.kind === "saved") onClose();
  }

  /**
   * Save, then publish.
   *
   * WITHOUT THIS BUTTON A VIDEO NEVER LEAVES `draft`, and a draft is not in the feed's candidate
   * pool — which is exactly why an uploaded video did not appear on the homepage.
   *
   * Publishing does NOT make a private video visible: `publishVideo` writes `publishStatus` and
   * never touches `visibility`, so the check below happens before the request rather than
   * letting a 200 imply something it did not do.
   */
  async function handleSaveAndPublishClick() {
    if (draft.title.trim() === "") return;
    if (draft.visibility !== "public") {
      setSaveErrorMessage(
        "Set visibility to Public on the last step before publishing — a private video stays hidden even once published.",
      );
      return;
    }

    const outcome = await saveDraft({ asPrivateDraft: false });
    // A follow-up failure stops the publish: chapters or a thumbnail that did not save are
    // worth fixing before the video goes live, and the message already says which.
    if (outcome.kind !== "saved") return;

    try {
      const published = await publishMutation.mutateAsync(outcome.videoId);
      // An anime episode is SUBMITTED, not published — the backend leaves `publishStatus` at
      // draft and moves `reviewStatus` to pending. Closing with a "published" impression would
      // send the creator looking for it on the homepage.
      if (published.reviewStatus === "pending") {
        setSaveErrorMessage(
          "Saved and submitted for review. It goes live once a moderator approves it.",
        );
        return;
      }
      onClose();
    } catch (error) {
      const refusal = describePublishRefusal(error);
      setSaveErrorMessage(`Video saved, but not published: ${refusal.message}`);
    }
  }

  /**
   * X / Escape at the top level.
   *
   * CREATE commits a private draft, EDIT discards — unchanged behaviour. What changed is that a
   * failed draft save now KEEPS THE MODAL OPEN with the reason, because the alternative is
   * closing over the creator's unsaved work and telling them nothing.
   *
   * A draft with no YouTube link cannot be saved at all (the API requires one), so that case
   * closes rather than trapping the creator in a modal they can never dismiss.
   */
  async function handleModalDismiss() {
    if (props.mode !== "create" || draft.youtubeUrl.trim() === "") {
      onClose();
      return;
    }
    // The draft path closes on ANY outcome that produced a row — a chapter list that failed
    // validation must not trap the creator in a modal they are trying to dismiss.
    const outcome = await saveDraft({ asPrivateDraft: true });
    if (outcome.kind !== "create_failed") onClose();
  }

  // Escape needs the latest callback without re-subscribing on every keystroke.
  const handleModalDismissRef = useLatestCallbackRef(() => void handleModalDismiss());

  // Body scroll locks for the modal's whole lifetime.
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  // One Escape handler for the whole stack: innermost overlay first, then the modal itself.
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

  const currentStep = UPLOAD_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === UPLOAD_STEPS.length - 1;
  const isSaveDisabled = draft.title.trim() === "" || isSaving;
  const modalTitle = draft.title.trim() === "" ? draft.youtubeUrl || "New video" : draft.title;

  function renderCurrentStep(stepId: UploadStepId) {
    switch (stepId) {
      case "details":
        return (
          <DetailsStep
            draft={draft}
            onDraftChange={applyDraftPatch}
            onOpenPlaylistsPicker={() => setActiveOverlay("playlists-picker")}
            currentThumbnailUrl={editedVideo?.thumbnailUrl ?? null}
            selectedThumbnailFile={selectedThumbnailFile}
            onThumbnailFileSelected={setSelectedThumbnailFile}
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

  const isHydrating = props.mode === "edit" && !hasHydratedFromServer;

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
            onClick={() => void handleModalDismiss()}
            disabled={isSaving}
            aria-label={
              props.mode === "create"
                ? "Close and save as private draft"
                : "Close without saving changes"
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
            {isHydrating ? (
              <p className="text-sm text-muted-foreground">Loading this video…</p>
            ) : (
              renderCurrentStep(currentStep.id)
            )}
          </div>
          <div className="hidden w-80 shrink-0 overflow-y-auto border-l border-black/10 p-6 lg:block">
            {renderPreviewCard(props, draft)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-black/10 px-6 py-4">
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
              onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
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
                  onClick={() => void handleSaveClick()}
                  disabled={isSaveDisabled}
                  title={draft.title.trim() === "" ? "Add a title to save" : undefined}
                  className="cursor-pointer rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-default disabled:opacity-40"
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
                {/*
                  SAVE ALONE LEAVES THE VIDEO A DRAFT, and a draft is not in the feed's candidate
                  pool. This is the control whose absence kept uploaded videos off the homepage.
                */}
                <button
                  type="button"
                  onClick={() => void handleSaveAndPublishClick()}
                  disabled={isSaveDisabled}
                  title={
                    draft.visibility === "public"
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
          selectedPlaylistIds={draft.selectedPlaylistIds}
          onSelectedPlaylistIdsChange={(selectedPlaylistIds) =>
            applyDraftPatch({ selectedPlaylistIds })
          }
          onRequestCreatePlaylist={() => setActiveOverlay("create-playlist")}
          onDone={() => setActiveOverlay("none")}
        />
      )}
      {activeOverlay === "create-playlist" && (
        <CreatePlaylistModal
          onCreated={(createdPlaylist) => {
            // The id comes back from the server, so the new playlist is selectable immediately
            // and by the same key the picker uses. The mock selected it by title, which merged
            // two playlists the moment a creator reused a name.
            applyDraftPatch({
              selectedPlaylistIds: [...draft.selectedPlaylistIds, createdPlaylist.id],
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

/**
 * The backend's own message, verbatim.
 *
 * A 422 here names the field the creator must fix ("Not a YouTube video link", "You can only
 * attach products you own"), and replacing that with a generic apology turns a fixable form
 * into a dead end.
 */
function describeSaveError(error: unknown): string {
  if (error instanceof ApiRequestError) return error.apiError.message;
  return "Couldn't save this video. Please try again.";
}

function createDraftFromSource(source: UploadSource): UploadDraft {
  const emptyDraft = createEmptyUploadDraft();
  switch (source.kind) {
    case "file":
      // No `youtubeUrl`, so this draft cannot be saved — `POST /videos` requires one. The Save
      // button surfaces the backend's refusal rather than this code inventing a link.
      return emptyDraft;
    case "youtube":
      return { ...emptyDraft, youtubeUrl: source.youtubeUrl };
    default: {
      const exhaustiveCheck: never = source;
      return exhaustiveCheck;
    }
  }
}

function renderPreviewCard(props: UploadVideoModalProps, draft: UploadDraft) {
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

// Stores the latest callback in a ref so a mount-once event listener can call current state
// without re-subscribing.
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
