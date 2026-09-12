// TRANSPORT: client-query — the one "use client" file that owns the launch flow. Posts through
// `useSubmitShowcaseMutation` and uploads write-up images through
// `useUploadShowcaseWriteUpImageMutation`, both against the Express backend.
"use client";

import { useRef, useState } from "react";

import LaunchStatements, {
  describeLaunchStatementGap,
} from "@/components/home/blueprints/showcase/authoring/launch-statements";
import ShowcaseLaunchReceipt from "@/components/home/blueprints/showcase/authoring/showcase-launch-receipt";
import ShowcaseLaunchRefusalNotice from "@/components/home/blueprints/showcase/authoring/showcase-launch-refusal-notice";
import ShowcaseLaunchRowPreview from "@/components/home/blueprints/showcase/authoring/showcase-launch-row-preview";
import ShowcaseWriteUp from "@/components/home/blueprints/showcase/sections/showcase-write-up";
import {
  buildMiddayInstantForDate,
  buildWriteUpImageAltText,
  classifyShowcaseLaunchRefusal,
  collectShowcaseSubmission,
  describeShowcaseFieldPath,
  describeWriteUpImageCheckFailure,
  describeWriteUpImageUploadRefusal,
  EMPTY_SHOWCASE_LAUNCH_FORM_DRAFT,
  findShowcaseFieldPosition,
  insertMarkdownImageAtSelection,
  readShowcaseLaunchRefusalFieldErrors,
  splitTagsText,
  type ShowcaseLaunchFormDraft,
  type ShowcaseLaunchRefusal,
  type TeamMemberDraftRow,
  type WriteUpTextSelection,
} from "@/components/home/blueprints/showcase/authoring/showcase-launch-shared";
import SquareImagePicker from "@/components/home/blueprints/showcase/authoring/square-image-picker";
import { useHeadingImagePick } from "@/components/home/blueprints/showcase/authoring/use-heading-image-pick";
import {
  LabeledEnumSelect,
  LabeledTextArea,
  LabeledTextInput,
  RepeatableRowShell,
} from "@/components/home/blueprints/authoring/form-fields";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import {
  useSubmitShowcaseMutation,
  useUploadShowcaseWriteUpImageMutation,
} from "@/hooks/blueprints/showcase-authoring";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  BLUEPRINT_DIFFICULTIES,
  BLUEPRINT_DIFFICULTY_LABELS,
  type TeardownOption,
} from "@/lib/blueprints/schemas";
import {
  SHOWCASE_TAGLINE_MAXIMUM_CHARACTERS,
  type ShowcaseSubmissionReceipt,
} from "@/lib/blueprints/showcase-authoring.schemas";
import { buildInitialsFromName } from "@/lib/format-initials";
import { ApiRequestError } from "@/lib/http";
import { ACCEPTED_IMAGE_INPUT_ACCEPT, checkImageFile } from "@/lib/image-file-check";

/**
 * THE COMPOSER'S OWN STATE, AS A UNION: editing, or submitted with a receipt. Never "editing and
 * already submitted", which a step index beside a nullable receipt could express.
 */
type ShowcaseLaunchViewState =
  | { readonly status: "editing" }
  | { readonly status: "submitted"; readonly receipt: ShowcaseSubmissionReceipt };

/** Where the post request stands, derived from the mutation each render. */
type ShowcaseLaunchSubmitState =
  | { readonly status: "idle" }
  | { readonly status: "posting" }
  | { readonly status: "refused"; readonly refusal: ShowcaseLaunchRefusal };

/**
 * One write-up image at a time: checked in the browser, then uploaded, then inserted. The button is
 * disabled outside `idle` and `refused`, so two uploads can never race each other into the text.
 */
type WriteUpImageUploadState =
  | { readonly status: "idle" }
  | { readonly status: "checking"; readonly fileName: string }
  | { readonly status: "uploading"; readonly fileName: string }
  | { readonly status: "refused"; readonly message: string };

/**
 * Which half of the write-up field is showing: the textarea, or the rendered Markdown. The preview
 * uses `ShowcaseWriteUp`, the same renderer the launch page uses, so what a maker previews is what a
 * reader gets.
 */
type WriteUpPane = "write" | "preview";

const WRITE_UP_PANE_LABELS: Record<WriteUpPane, string> = { write: "Write", preview: "Preview" };
const WRITE_UP_PANES: readonly WriteUpPane[] = ["write", "preview"];

/** The id the heading image's hidden file input carries; the section label points at it. */
const HEADING_IMAGE_INPUT_ID = "showcase-heading-image";

function newTeamMemberDraftRow(): TeamMemberDraftRow {
  // Client-side key only, minted in a click handler, never during render.
  return { rowId: crypto.randomUUID(), displayName: "", handle: "", role: "" };
}

/** One titled part of the form. A hairline above every section after the first, so the page scans. */
function FormSection({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {description === undefined ? null : (
        <p className="mt-1 max-w-prose text-xs text-muted-foreground">{description}</p>
      )}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** The line under the write-up field for the current upload, or `null` when there is nothing to say. */
function WriteUpImageUploadStatus({
  uploadState,
}: {
  readonly uploadState: WriteUpImageUploadState;
}) {
  switch (uploadState.status) {
    case "idle":
      return null;
    case "checking":
    case "uploading":
      return (
        <output aria-live="polite" className="block text-xs text-muted-foreground">
          Uploading {uploadState.fileName}…
        </output>
      );
    case "refused":
      return (
        <p role="alert" className="text-xs text-destructive">
          {uploadState.message}
        </p>
      );
    default: {
      const exhaustiveCheck: never = uploadState;
      return exhaustiveCheck;
    }
  }
}

/**
 * Post a launch: one page, one set of statements, one Post button.
 *
 * ⚠️ ONE PAGE, NOT STEPPED, as the maker chose. A launch is about a dozen fields, far lighter than a
 * teardown, and the live row preview only helps if the name, pitch and image are on screen together.
 *
 * ⚠️ NOTHING IS OPTIMISTIC AND NOTHING POLLS. The post answers 201 with a `pending_review` receipt; a
 * moderator decides, and `showcase-launch-receipt.tsx` says so.
 */
export default function ShowcaseLaunchComposer({
  teardownOptions,
}: {
  readonly teardownOptions: readonly TeardownOption[];
}) {
  const [formDraft, setFormDraft] = useState<ShowcaseLaunchFormDraft>(
    EMPTY_SHOWCASE_LAUNCH_FORM_DRAFT,
  );
  const [viewState, setViewState] = useState<ShowcaseLaunchViewState>({ status: "editing" });
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string[]>>>({});
  const [writeUpPane, setWriteUpPane] = useState<WriteUpPane>("write");
  const [writeUpImageUploadState, setWriteUpImageUploadState] = useState<WriteUpImageUploadState>({
    status: "idle",
  });
  const headingImagePick = useHeadingImagePick();
  const submitMutation = useSubmitShowcaseMutation();
  const uploadWriteUpImageMutation = useUploadShowcaseWriteUpImageMutation();
  // Read and written only in handlers, never during render.
  const writeUpTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const writeUpImageInputRef = useRef<HTMLInputElement>(null);
  const pendingImageSelectionRef = useRef<WriteUpTextSelection | null>(null);
  // The lazy, ref-backed key: a `useState(crypto.randomUUID())` initializer would run during the
  // server prerender, which `cacheComponents` refuses.
  //
  // ⚠️ ONE KEY PER ATTEMPT, AND AN ATTEMPT IS ONE DRAFT. The key is read once, when Post is pressed,
  // and that value rides with the request. It rotates after a success, and whenever the idle draft or
  // image actually changes, so a retry of an unchanged draft carries the same key while an edited one
  // never reuses it with a different body (which the server answers with a 409). An edit cannot
  // land mid-flight: the whole form is a disabled fieldset while posting.
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  /**
   * THE ONE WAY THE DRAFT CHANGES, as a function of the previous draft. Functional, so an image that
   * finishes uploading inserts into the text as it is NOW, not as it was when the upload started.
   */
  function applyFormUpdate(
    buildNextFormDraft: (previousFormDraft: ShowcaseLaunchFormDraft) => ShowcaseLaunchFormDraft,
  ): void {
    if (submitMutation.isPending) return;
    resetIdempotencyKey();
    setFormDraft(buildNextFormDraft);
    // EDITING ANYTHING CLEARS THE LAST VERDICT: the errors describe a draft that no longer exists, and
    // a 409 about a name is about a name nobody is posting any more.
    setFieldErrors({});
    if (submitMutation.error !== null) submitMutation.reset();
  }

  function applyFormPatch(formPatch: Partial<ShowcaseLaunchFormDraft>): void {
    applyFormUpdate((previousFormDraft) => ({ ...previousFormDraft, ...formPatch }));
  }

  const headingImagePickState = headingImagePick.pickState;
  const rowPreviewProps = {
    title: formDraft.title,
    tagline: formDraft.tagline,
    headingImageUrl:
      headingImagePickState.status === "ready" ? headingImagePickState.previewUrl : null,
    launchedAtIsoInstant:
      formDraft.launchedOnDate === "" ? null : buildMiddayInstantForDate(formDraft.launchedOnDate),
    isBuiltFromTeardown: formDraft.builtFromBlueprintSlug !== "",
    tags: splitTagsText(formDraft.tagsText),
  };

  if (viewState.status === "submitted") {
    return (
      <ShowcaseLaunchReceipt
        receipt={viewState.receipt}
        rowPreviewProps={rowPreviewProps}
        onPostAnother={() => {
          setFormDraft(EMPTY_SHOWCASE_LAUNCH_FORM_DRAFT);
          setFieldErrors({});
          setWriteUpImageUploadState({ status: "idle" });
          submitMutation.reset();
          headingImagePick.clearPick();
          setViewState({ status: "editing" });
        }}
      />
    );
  }

  const submitState: ShowcaseLaunchSubmitState = submitMutation.isPending
    ? { status: "posting" }
    : submitMutation.error === null
      ? { status: "idle" }
      : {
          status: "refused",
          refusal:
            submitMutation.error instanceof ApiRequestError
              ? classifyShowcaseLaunchRefusal(submitMutation.error.apiError)
              : { kind: "unexpected", code: "CLIENT", message: submitMutation.error.message },
        };
  const isPosting = submitState.status === "posting";
  const isWriteUpImageBusy =
    writeUpImageUploadState.status === "checking" || writeUpImageUploadState.status === "uploading";

  /**
   * Why Post is unavailable, in words beside the button, or `null`.
   *
   * ORDER: an upload in flight first, because posting now would send a write-up missing its image;
   * then the heading image, further up the page; the statements last, because they sit right above
   * the button and are the obvious last step.
   */
  const postBlockedReason = isWriteUpImageBusy
    ? "Wait for the image to finish uploading into the write-up."
    : headingImagePickState.status !== "ready"
      ? "Add a square heading image under Heading image."
      : describeLaunchStatementGap(formDraft.acceptedLaunchStatementIds);

  // The server's field refusals replace the client's, which were cleared when Post was pressed.
  const displayedFieldErrors =
    (submitState.status === "refused"
      ? readShowcaseLaunchRefusalFieldErrors(submitState.refusal)
      : null) ?? fieldErrors;
  const fieldErrorEntries = Object.entries(displayedFieldErrors).toSorted(
    ([firstFieldPath], [secondFieldPath]) =>
      findShowcaseFieldPosition(firstFieldPath) - findShowcaseFieldPosition(secondFieldPath),
  );

  function readFieldError(fieldPath: string): string | null {
    return displayedFieldErrors[fieldPath]?.join(" ") ?? null;
  }

  function updateTeamRow(rowId: string, teamRowPatch: Partial<TeamMemberDraftRow>): void {
    applyFormPatch({
      teamRows: formDraft.teamRows.map((teamRow) =>
        teamRow.rowId === rowId ? { ...teamRow, ...teamRowPatch } : teamRow,
      ),
    });
  }

  function handleAddWriteUpImageClick(): void {
    // Captured now, because opening the file dialog takes focus from the textarea.
    const writeUpTextArea = writeUpTextAreaRef.current;
    const writeUpLength = formDraft.writeUp.length;
    pendingImageSelectionRef.current =
      writeUpTextArea === null
        ? { startOffset: writeUpLength, endOffset: writeUpLength }
        : { startOffset: writeUpTextArea.selectionStart, endOffset: writeUpTextArea.selectionEnd };
    writeUpImageInputRef.current?.click();
  }

  async function handleWriteUpImageFilePicked(imageFile: File): Promise<void> {
    const writeUpLength = formDraft.writeUp.length;
    const insertionSelection = pendingImageSelectionRef.current ?? {
      startOffset: writeUpLength,
      endOffset: writeUpLength,
    };
    pendingImageSelectionRef.current = null;

    setWriteUpImageUploadState({ status: "checking", fileName: imageFile.name });
    const fileCheck = await checkImageFile(imageFile);
    if (!fileCheck.success) {
      setWriteUpImageUploadState({
        status: "refused",
        message: describeWriteUpImageCheckFailure(fileCheck.failure),
      });
      return;
    }

    setWriteUpImageUploadState({ status: "uploading", fileName: imageFile.name });
    uploadWriteUpImageMutation.mutate(imageFile, {
      onSuccess: (uploadResult) => {
        if (!uploadResult.success) {
          setWriteUpImageUploadState({
            status: "refused",
            message: describeWriteUpImageUploadRefusal(uploadResult.error),
          });
          return;
        }
        const uploadedImage = uploadResult.data;
        applyFormUpdate((previousFormDraft) => ({
          ...previousFormDraft,
          writeUp: insertMarkdownImageAtSelection(
            previousFormDraft.writeUp,
            insertionSelection,
            buildWriteUpImageAltText(imageFile.name),
            uploadedImage.url,
          ),
          uploadedWriteUpImages: [...previousFormDraft.uploadedWriteUpImages, uploadedImage],
        }));
        setWriteUpImageUploadState({ status: "idle" });
      },
      onError: () =>
        setWriteUpImageUploadState({
          status: "refused",
          message: "The image could not be uploaded. Check your connection and try again.",
        }),
    });
  }

  function handlePostClick(): void {
    if (headingImagePickState.status !== "ready") return;

    const collected = collectShowcaseSubmission(formDraft);
    if (!collected.ok) {
      // The contract refused it. Show every field it named and stay put.
      setFieldErrors(collected.fieldErrors);
      return;
    }

    setFieldErrors({});
    submitMutation.mutate(
      {
        draft: collected.submission,
        headingImageFile: headingImagePickState.file,
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: (receipt) => {
          resetIdempotencyKey();
          setViewState({ status: "submitted", receipt });
        },
      },
    );
  }

  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-medium tracking-[0.5px] text-[#00696E] uppercase">Showcase</p>
      <h1 className="mt-1 text-xl font-medium text-foreground lg:text-2xl">Post a launch</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        A launch is a working prototype or a finished build, and what it proved. Say what you made,
        show it, and name the people who made it with you.
      </p>

      {/* A DISABLED FIELDSET WHILE POSTING locks every input, select and button inside in one place,
          so nothing can change the draft a running request was built from. */}
      <fieldset disabled={isPosting} className="mt-8 min-w-0 space-y-8">
        <FormSection title="The build">
          <LabeledTextInput
            label="Name"
            value={formDraft.title}
            onValueChange={(title) => applyFormPatch({ title })}
            placeholder="Solar cold store running for 90 days in Nakuru"
            hint="What it is, the way somebody would search for it."
            errorMessage={readFieldError("title")}
          />
          <LabeledTextInput
            label="One-line pitch"
            value={formDraft.tagline}
            onValueChange={(tagline) => applyFormPatch({ tagline })}
            placeholder="Holds 4 °C for 62 hours with no sun"
            hint="The line under the name in the feed. Lead with what it does or what it proved."
            characterLimit={SHOWCASE_TAGLINE_MAXIMUM_CHARACTERS}
            errorMessage={readFieldError("tagline")}
          />
          <LabeledTextArea
            label="What is it?"
            value={formDraft.summary}
            onValueChange={(summary) => applyFormPatch({ summary })}
            rowCount={3}
            hint="One paragraph: what it is, and what it proved."
            errorMessage={readFieldError("summary")}
          />
        </FormSection>

        <FormSection title="Heading image">
          <SquareImagePicker
            inputId={HEADING_IMAGE_INPUT_ID}
            pickState={headingImagePickState}
            isDisabled={isPosting}
            onFilePicked={(file) => {
              // A different image is a different attempt, for the reason the key's comment gives.
              resetIdempotencyKey();
              void headingImagePick.pickFile(file);
            }}
            onRemove={() => {
              resetIdempotencyKey();
              headingImagePick.clearPick();
            }}
          />
          {/* THE LIVE PREVIEW SITS WITH THE IMAGE, because the image is the one field a maker cannot
              judge from the form alone: what matters is how it reads beside the name at 64px. */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
              How it will look in the feed
            </p>
            <div className="mt-3">
              <ShowcaseLaunchRowPreview {...rowPreviewProps} />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="The story"
          description="Optional. Markdown, as on GitHub: ## for a heading, **bold**, - for a list, [words](https://…) for a link. Paste a YouTube link on a line of its own to embed the video. Add an image to place it where your cursor is."
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* WRITE AND PREVIEW, THE GITHUB SHAPE. Two pressed-state buttons rather than a tab
                widget: there are two views of one field, and a pill that reports state is the house
                control for that. */}
            <fieldset className="flex gap-1">
              <legend className="sr-only">Write-up view</legend>
              {WRITE_UP_PANES.map((pane) => (
                <button
                  key={pane}
                  type="button"
                  aria-pressed={writeUpPane === pane}
                  onClick={() => setWriteUpPane(pane)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] ${
                    writeUpPane === pane
                      ? "bg-[#CCE8E9] text-[#041F21]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {WRITE_UP_PANE_LABELS[pane]}
                </button>
              ))}
            </fieldset>
            {/* Only beside the textarea, because an image goes where the cursor is. */}
            {writeUpPane === "write" ? (
              <button
                type="button"
                onClick={handleAddWriteUpImageClick}
                disabled={isWriteUpImageBusy}
                className="ml-auto rounded-full border border-[#00696E]/40 px-3 py-1 text-xs font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isWriteUpImageBusy ? "Uploading…" : "Add an image"}
              </button>
            ) : null}
            <input
              ref={writeUpImageInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              onChange={(changeEvent) => {
                const pickedFile = changeEvent.target.files?.[0];
                // Cleared, so picking the same file twice still fires a change.
                changeEvent.target.value = "";
                if (pickedFile !== undefined) void handleWriteUpImageFilePicked(pickedFile);
              }}
            />
          </div>
          {writeUpPane === "write" ? (
            <LabeledTextArea
              label="Write-up"
              value={formDraft.writeUp}
              onValueChange={(writeUp) => applyFormPatch({ writeUp })}
              rowCount={12}
              textAreaRef={writeUpTextAreaRef}
              // Read-only while an image uploads, so the cursor the image will land at stays put.
              isReadOnly={isWriteUpImageBusy}
              errorMessage={readFieldError("writeUp")}
            />
          ) : (
            <div
              aria-label="Write-up preview"
              className="min-h-40 rounded-xl border border-border bg-card px-4 pb-4"
            >
              {formDraft.writeUp.trim() === "" ? (
                <p className="pt-4 text-sm text-muted-foreground">Nothing to preview yet.</p>
              ) : (
                // The uploads' recorded sizes, so the preview reserves each image's box exactly as
                // the published page will. An image typed in by address has no size and shows the
                // "Image not shown" note, as it would there.
                <ShowcaseWriteUp
                  markdown={formDraft.writeUp}
                  imageSizes={formDraft.uploadedWriteUpImages}
                />
              )}
            </div>
          )}
          <WriteUpImageUploadStatus uploadState={writeUpImageUploadState} />
        </FormSection>

        <FormSection title="Link">
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledTextInput
              label="Link label"
              value={formDraft.callToActionLabel}
              onValueChange={(callToActionLabel) => applyFormPatch({ callToActionLabel })}
              placeholder="Order a unit"
              errorMessage={readFieldError("callToAction.label")}
            />
            <LabeledTextInput
              label="Link address"
              inputType="url"
              value={formDraft.callToActionUrl}
              onValueChange={(callToActionUrl) => applyFormPatch({ callToActionUrl })}
              placeholder="https://…"
              errorMessage={readFieldError("callToAction.url")}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Optional. Where somebody can order one, buy one or read more. Leave both empty for none.
          </p>
        </FormSection>

        <FormSection
          title="Team"
          description="The people who built it, you included. Handles are free text and are not verified, so each person shows as their initials rather than a photo."
        >
          {formDraft.teamRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one added yet. A launch with no team shows only the person who posted it.
            </p>
          ) : (
            <div className="space-y-3">
              {formDraft.teamRows.map((teamRow, teamRowIndex) => {
                const initials = buildInitialsFromName(teamRow.displayName);
                return (
                  <RepeatableRowShell
                    key={teamRow.rowId}
                    rowLabel={`Team member ${teamRowIndex + 1}`}
                    onRemoveRow={() =>
                      applyFormPatch({
                        teamRows: formDraft.teamRows.filter(
                          (existingTeamRow) => existingTeamRow.rowId !== teamRow.rowId,
                        ),
                      })
                    }
                  >
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <span
                        aria-hidden="true"
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-[#D6E3FF] text-xs font-medium text-[#00696E]"
                      >
                        {initials}
                      </span>
                      <span className="truncate text-sm text-foreground">
                        {teamRow.displayName.trim() === "" ? (
                          <span className="text-muted-foreground">New team member</span>
                        ) : (
                          teamRow.displayName
                        )}
                      </span>
                    </div>
                    <LabeledTextInput
                      label="Name"
                      value={teamRow.displayName}
                      onValueChange={(displayName) => updateTeamRow(teamRow.rowId, { displayName })}
                      errorMessage={readFieldError(`team.${teamRowIndex}.displayName`)}
                    />
                    <LabeledTextInput
                      label="Handle"
                      value={teamRow.handle}
                      onValueChange={(handle) => updateTeamRow(teamRow.rowId, { handle })}
                      placeholder="amara-builds"
                      errorMessage={readFieldError(`team.${teamRowIndex}.handle`)}
                    />
                    <div className="sm:col-span-2">
                      <LabeledTextInput
                        label="Role"
                        value={teamRow.role}
                        onValueChange={(role) => updateTeamRow(teamRow.rowId, { role })}
                        placeholder="Electronics"
                        errorMessage={readFieldError(`team.${teamRowIndex}.role`)}
                      />
                    </div>
                  </RepeatableRowShell>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              applyFormPatch({ teamRows: [...formDraft.teamRows, newTeamMemberDraftRow()] })
            }
            className="rounded-full border border-[#00696E]/40 px-4 py-2 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
          >
            Add a team member
          </button>
        </FormSection>

        <FormSection title="Built from a teardown">
          <label className="block">
            <span className={LABEL_CLASS}>Teardown</span>
            <select
              value={formDraft.builtFromBlueprintSlug}
              onChange={(changeEvent) =>
                applyFormPatch({
                  // Checked against the real options rather than trusted: a `<select>` hands back a
                  // string, and only a listed slug or "" may reach the draft.
                  builtFromBlueprintSlug:
                    teardownOptions.find(
                      (teardownOption) => teardownOption.slug === changeEvent.target.value,
                    )?.slug ?? "",
                })
              }
              className={`${INPUT_CLASS} mt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]`}
            >
              <option value="">Not built from a teardown on Qatoto</option>
              {teardownOptions.map((teardownOption) => (
                <option key={teardownOption.slug} value={teardownOption.slug}>
                  {teardownOption.title}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-muted-foreground">
              Optional. Pick the teardown you worked from, if it is published here.
            </span>
          </label>
        </FormSection>

        <FormSection title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledTextInput
              label="Launch date"
              inputType="date"
              value={formDraft.launchedOnDate}
              onValueChange={(launchedOnDate) => applyFormPatch({ launchedOnDate })}
              hint="Leave it empty to use today."
              errorMessage={readFieldError("launchedAt")}
            />
            <LabeledEnumSelect
              label="How hard to build again"
              value={formDraft.difficulty}
              options={BLUEPRINT_DIFFICULTIES}
              optionLabels={BLUEPRINT_DIFFICULTY_LABELS}
              onValueChange={(difficulty) => applyFormPatch({ difficulty })}
              emptyOptionLabel="Choose one"
              errorMessage={readFieldError("difficulty")}
            />
            <LabeledTextInput
              label="Parts cost, lowest (US dollars)"
              value={formDraft.costMinimumText}
              onValueChange={(costMinimumText) => applyFormPatch({ costMinimumText })}
              placeholder="45"
              errorMessage={readFieldError("billOfMaterialsCostRange.minimumInCents")}
            />
            <LabeledTextInput
              label="Parts cost, highest (US dollars)"
              value={formDraft.costMaximumText}
              onValueChange={(costMaximumText) => applyFormPatch({ costMaximumText })}
              placeholder="60"
              errorMessage={readFieldError("billOfMaterialsCostRange.maximumInCents")}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Parts cost is optional: what one unit&apos;s parts cost, as a range. Leave both empty if
            nobody costed it.
          </p>
          <LabeledTextInput
            label="Tags"
            value={formDraft.tagsText}
            onValueChange={(tagsText) => applyFormPatch({ tagsText })}
            placeholder="cold-chain, solar, field-trial"
            hint="Separated by commas. These are how somebody browsing finds you."
          />
        </FormSection>

        <FormSection title="Before you post">
          <LaunchStatements
            acceptedStatementIds={formDraft.acceptedLaunchStatementIds}
            onAcceptedStatementIdsChange={(acceptedLaunchStatementIds) =>
              applyFormPatch({ acceptedLaunchStatementIds })
            }
          />
        </FormSection>
      </fieldset>

      {/*
        THE REFUSALS THAT NAME A FIELD — the contract's own in the browser, and the server's after a
        post — named by the label a maker can see and listed in page order.
      */}
      {fieldErrorEntries.length > 0 ? (
        <div
          role="alert"
          className="mt-8 space-y-1 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
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
          className="rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00393C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPosting ? "Posting…" : "Post launch"}
        </button>
        {/* A DISABLED BUTTON SAYS WHY, beside itself. */}
        {postBlockedReason === null ? null : (
          <p className="max-w-md text-xs text-muted-foreground">{postBlockedReason}</p>
        )}
      </div>
    </div>
  );
}
