// TRANSPORT: client-query — the one "use client" file that owns the launch flow. Posts through
// `useSubmitShowcaseMutation` and uploads write-up images through
// `useUploadShowcaseWriteUpImageMutation`, both against the Express backend.
"use client";

import DraftAutosaveStatus from "@/components/home/blueprints/shared/draft-autosave-status";
import ShowcaseLaunchReceipt from "@/components/home/blueprints/showcase/authoring/showcase-launch-receipt";
import ShowcaseLaunchRefusalNotice from "@/components/home/blueprints/showcase/authoring/showcase-launch-refusal-notice";
import {
  ShowcaseBuildAndImageFields,
  ShowcaseStoryAndLinksFields,
  ShowcaseTeamAndDetailsFields,
} from "@/components/home/blueprints/showcase/authoring/showcase-launch-composer-sections";
import { describeShowcaseFieldPath } from "@/components/home/blueprints/showcase/authoring/showcase-launch-shared";
import type { TeardownOption } from "@/lib/blueprints/schemas";
import { useShowcaseLaunchComposerState } from "@/hooks/blueprints/use-showcase-launch-composer-state";

export default function ShowcaseLaunchComposer({
  teardownOptions,
}: {
  readonly teardownOptions: readonly TeardownOption[];
}) {
  const {
    formDraft,
    viewState,
    writeUpPane,
    setWriteUpPane,
    writeUpImageUploadState,
    headingImagePickState,
    headingImageUploadMessage,
    setHeadingImageUploadMessage,
    isUploadingHeadingImage,
    isPosting,
    isWriteUpImageBusy,
    resumeError,
    postBlockedReason,
    fieldErrorEntries,
    readFieldError,
    rowPreviewProps,
    submitState,
    autosaveState,
    applyFormPatch,
    updateTeamRow,
    handleAddWriteUpImageClick,
    handleHeadingImagePicked,
    handleWriteUpImageFilePicked,
    handlePostClick,
    handleResetForm,
    resetIdempotencyKey,
    headingImagePick,
    writeUpTextAreaRef,
    writeUpImageInputRef,
  } = useShowcaseLaunchComposerState();

  if (viewState.status === "submitted") {
    return (
      <ShowcaseLaunchReceipt
        receipt={viewState.receipt}
        rowPreviewProps={rowPreviewProps}
        onPostAnother={handleResetForm}
      />
    );
  }

  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium tracking-wider text-primary-imprint uppercase">Showcase</p>
      <h1 className="mt-1 text-xl font-medium text-foreground lg:text-2xl">Launch a project</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        A launch is a working prototype or a finished build, and what it proved. Say what you made,
        show it, and name the people who made it with you.
      </p>

      {resumeError === null ? null : (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {resumeError}
        </div>
      )}

      <fieldset disabled={isPosting} className="mt-8 min-w-0 space-y-8">
        <ShowcaseBuildAndImageFields
          formDraft={formDraft}
          applyFormPatch={applyFormPatch}
          readFieldError={readFieldError}
          isPosting={isPosting}
          headingImagePickState={headingImagePickState}
          resetIdempotencyKey={resetIdempotencyKey}
          onHeadingImagePicked={(file) => {
            void handleHeadingImagePicked(file);
          }}
          onRemoveHeadingImage={() => {
            resetIdempotencyKey();
            headingImagePick.clearPick();
            setHeadingImageUploadMessage(null);
            applyFormPatch({ stagedHeadingImage: null });
          }}
          headingImageUploadMessage={headingImageUploadMessage}
          isUploadingHeadingImage={isUploadingHeadingImage}
          rowPreviewProps={rowPreviewProps}
        />

        <ShowcaseStoryAndLinksFields
          formDraft={formDraft}
          applyFormPatch={applyFormPatch}
          readFieldError={readFieldError}
          writeUpPane={writeUpPane}
          setWriteUpPane={setWriteUpPane}
          onAddWriteUpImageClick={handleAddWriteUpImageClick}
          isWriteUpImageBusy={isWriteUpImageBusy}
          writeUpImageInputRef={writeUpImageInputRef}
          onWriteUpImageFilePicked={(file) => {
            void handleWriteUpImageFilePicked(file);
          }}
          writeUpTextAreaRef={writeUpTextAreaRef}
          writeUpImageUploadState={writeUpImageUploadState}
        />

        <ShowcaseTeamAndDetailsFields
          formDraft={formDraft}
          applyFormPatch={applyFormPatch}
          readFieldError={readFieldError}
          updateTeamRow={updateTeamRow}
          teardownOptions={teardownOptions}
        />
      </fieldset>

      {fieldErrorEntries.length > 0 ? (
        <div
          role="alert"
          className="mt-8 space-y-1 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <p>This launch can&apos;t be posted yet:</p>
          <ul className="list-inside list-disc text-xs">
            {fieldErrorEntries.map(([fieldPath, messages]) => (
              <li key={fieldPath}>
                <span className="font-medium">{describeShowcaseFieldPath(fieldPath)}</span>:{" "}
                {messages.join(" ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {submitState.status === "refused" ? (
        <div className="mt-8 empty:hidden">
          <ShowcaseLaunchRefusalNotice refusal={submitState.refusal} />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={handlePostClick}
          disabled={postBlockedReason !== null || isPosting}
          className="rounded-full bg-primary-imprint px-5 py-2.5 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPosting ? "Posting…" : "Post launch"}
        </button>
        {postBlockedReason === null ? null : (
          <p className="max-w-md text-xs text-muted-foreground">{postBlockedReason}</p>
        )}
      </div>

      <div className="mt-3">
        <DraftAutosaveStatus state={autosaveState} />
      </div>
    </div>
  );
}
