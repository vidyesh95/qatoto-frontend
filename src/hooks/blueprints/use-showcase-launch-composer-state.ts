import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useMyDraftQuery } from "@/hooks/blueprints/drafts";
import { useBlueprintDraftAutosave } from "@/hooks/blueprints/use-draft-autosave";
import {
  buildMiddayInstantForDate,
  buildWriteUpImageAltText,
  classifyShowcaseLaunchRefusal,
  collectShowcaseSubmission,
  describeWriteUpImageCheckFailure,
  describeWriteUpImageUploadRefusal,
  EMPTY_SHOWCASE_LAUNCH_FORM_DRAFT,
  findShowcaseFieldPosition,
  insertMarkdownImageAtSelection,
  readShowcaseLaunchRefusalFieldErrors,
  restoreShowcaseLaunchFormDraft,
  splitTagsText,
  type ShowcaseLaunchFormDraft,
  type ShowcaseLaunchRefusal,
  type TeamMemberDraftRow,
  type WriteUpTextSelection,
} from "@/components/home/blueprints/showcase/authoring/showcase-launch-shared";
import { useHeadingImagePick } from "@/components/home/blueprints/showcase/authoring/use-heading-image-pick";
import {
  useSubmitShowcaseMutation,
  useUploadShowcaseHeadingImageMutation,
  useUploadShowcaseWriteUpImageMutation,
} from "@/hooks/blueprints/showcase-authoring";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  describeLaunchStatementGap,
  type ShowcaseSubmissionReceipt,
} from "@/lib/blueprints/showcase-authoring.schemas";
import { ApiRequestError } from "@/lib/http";
import { checkImageFile } from "@/lib/image-file-check";
import type {
  WriteUpImageUploadState,
  WriteUpPane,
} from "@/components/home/blueprints/showcase/authoring/showcase-launch-composer-sections";

export type ShowcaseLaunchViewState =
  | { readonly status: "editing" }
  | { readonly status: "submitted"; readonly receipt: ShowcaseSubmissionReceipt };

export type ShowcaseLaunchSubmitState =
  | { readonly status: "idle" }
  | { readonly status: "posting" }
  | { readonly status: "refused"; readonly refusal: ShowcaseLaunchRefusal };

function computeRowPreviewProps(
  formDraft: ShowcaseLaunchFormDraft,
  headingImagePickState: ReturnType<typeof useHeadingImagePick>["pickState"],
) {
  const headingImageUrl =
    headingImagePickState.status === "ready"
      ? headingImagePickState.previewUrl
      : (formDraft.stagedHeadingImage?.url ?? null);
  const launchedAtIsoInstant =
    formDraft.launchedOnDate === "" ? null : buildMiddayInstantForDate(formDraft.launchedOnDate);

  return {
    title: formDraft.title,
    tagline: formDraft.tagline,
    headingImageUrl,
    launchedAtIsoInstant,
    isBuiltFromTeardown: formDraft.builtFromBlueprintSlug !== "",
    tags: splitTagsText(formDraft.tagsText),
  };
}

function computeSubmitState(isPending: boolean, error: Error | null): ShowcaseLaunchSubmitState {
  if (isPending) return { status: "posting" };
  if (error === null) return { status: "idle" };
  const refusal =
    error instanceof ApiRequestError
      ? classifyShowcaseLaunchRefusal(error.apiError)
      : { kind: "unexpected" as const, code: "CLIENT", message: error.message };
  return { status: "refused", refusal };
}

function computePostBlockedReason(
  isWriteUpImageBusy: boolean,
  isUploadingHeadingImage: boolean,
  hasStagedHeadingImage: boolean,
  acceptedLaunchStatementIds: ShowcaseLaunchFormDraft["acceptedLaunchStatementIds"],
): string | null {
  if (isWriteUpImageBusy) {
    return "Wait for the image to finish uploading into the write-up.";
  }
  if (isUploadingHeadingImage) {
    return "Wait for the cover image to finish uploading.";
  }
  if (!hasStagedHeadingImage) {
    return "Add a square heading image under Heading image.";
  }
  return describeLaunchStatementGap(acceptedLaunchStatementIds);
}

function computeDisplayedFieldErrors(
  submitState: ShowcaseLaunchSubmitState,
  fieldErrors: Readonly<Record<string, string[]>>,
): Readonly<Record<string, string[]>> {
  if (submitState.status === "refused") {
    const refusalErrors = readShowcaseLaunchRefusalFieldErrors(submitState.refusal);
    if (refusalErrors !== null) return refusalErrors;
  }
  return fieldErrors;
}

export function useShowcaseLaunchComposerState() {
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
  const uploadHeadingImageMutation = useUploadShowcaseHeadingImageMutation();

  const resumeDraftId = useSearchParams().get("draftId");
  const resumeDraftQuery = useMyDraftQuery(resumeDraftId);
  const resumedDraft = resumeDraftQuery.data;

  const [hasMakerEdited, setHasMakerEdited] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [headingImageUploadMessage, setHeadingImageUploadMessage] = useState<string | null>(null);

  const [seededDraftId, setSeededDraftId] = useState<string | null>(null);
  if (resumedDraft !== undefined && seededDraftId !== resumedDraft.draftId) {
    setSeededDraftId(resumedDraft.draftId);
    const restored = restoreShowcaseLaunchFormDraft(resumedDraft.document);
    if (restored === null) {
      setResumeError(
        "That saved draft could not be reopened. It may have been saved by an older version of this form.",
      );
    } else {
      setFormDraft(restored);
    }
  }

  const autosaveState = useBlueprintDraftAutosave({
    arm: "showcase_launch",
    documentJson: JSON.stringify(formDraft),
    label: formDraft.title.trim() || formDraft.tagline.trim() || "Untitled launch",
    isSavable: hasMakerEdited,
    resumedDraft,
  });

  const stagedDraftId = resumeDraftId ?? seededDraftId;
  const writeUpTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const writeUpImageInputRef = useRef<HTMLInputElement>(null);
  const pendingImageSelectionRef = useRef<WriteUpTextSelection | null>(null);
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  function applyFormUpdate(
    buildNextFormDraft: (previousFormDraft: ShowcaseLaunchFormDraft) => ShowcaseLaunchFormDraft,
  ): void {
    if (submitMutation.isPending) return;
    setHasMakerEdited(true);
    resetIdempotencyKey();
    setFormDraft(buildNextFormDraft);
    setFieldErrors({});
    if (submitMutation.error !== null) submitMutation.reset();
  }

  function applyFormPatch(formPatch: Partial<ShowcaseLaunchFormDraft>): void {
    applyFormUpdate((previousFormDraft) => ({ ...previousFormDraft, ...formPatch }));
  }

  const headingImagePickState = headingImagePick.pickState;
  const rowPreviewProps = computeRowPreviewProps(formDraft, headingImagePickState);
  const submitState = computeSubmitState(submitMutation.isPending, submitMutation.error);
  const isPosting = submitState.status === "posting";
  const isWriteUpImageBusy =
    writeUpImageUploadState.status === "checking" || writeUpImageUploadState.status === "uploading";

  const postBlockedReason = computePostBlockedReason(
    isWriteUpImageBusy,
    uploadHeadingImageMutation.isPending,
    formDraft.stagedHeadingImage !== null,
    formDraft.acceptedLaunchStatementIds,
  );

  const displayedFieldErrors = computeDisplayedFieldErrors(submitState, fieldErrors);
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
    const writeUpTextArea = writeUpTextAreaRef.current;
    const writeUpLength = formDraft.writeUp.length;
    pendingImageSelectionRef.current =
      writeUpTextArea === null
        ? { startOffset: writeUpLength, endOffset: writeUpLength }
        : { startOffset: writeUpTextArea.selectionStart, endOffset: writeUpTextArea.selectionEnd };
    writeUpImageInputRef.current?.click();
  }

  async function handleHeadingImagePicked(file: File): Promise<void> {
    setHeadingImageUploadMessage(null);
    const acceptedFile = await headingImagePick.pickFile(file);
    if (acceptedFile === null) return;

    const uploadResult = await uploadHeadingImageMutation.mutateAsync({
      imageFile: acceptedFile,
      ...(stagedDraftId === null ? {} : { draftId: stagedDraftId }),
    });
    if (!uploadResult.success) {
      setHeadingImageUploadMessage(uploadResult.error.message);
      return;
    }
    applyFormPatch({ stagedHeadingImage: uploadResult.data });
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
    uploadWriteUpImageMutation.mutate(
      { imageFile, ...(stagedDraftId === null ? {} : { draftId: stagedDraftId }) },
      {
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
      },
    );
  }

  function handlePostClick(): void {
    if (formDraft.stagedHeadingImage === null) return;

    const collected = collectShowcaseSubmission(formDraft);
    if (!collected.ok) {
      setFieldErrors(collected.fieldErrors);
      return;
    }

    setFieldErrors({});
    submitMutation.mutate(
      { draft: collected.submission, idempotencyKey: getIdempotencyKey() },
      {
        onSuccess: (receipt) => {
          resetIdempotencyKey();
          setViewState({ status: "submitted", receipt });
        },
      },
    );
  }

  function handleResetForm(): void {
    setFormDraft(EMPTY_SHOWCASE_LAUNCH_FORM_DRAFT);
    setFieldErrors({});
    setWriteUpImageUploadState({ status: "idle" });
    submitMutation.reset();
    headingImagePick.clearPick();
    setViewState({ status: "editing" });
  }

  return {
    formDraft,
    viewState,
    writeUpPane,
    setWriteUpPane,
    writeUpImageUploadState,
    headingImagePickState,
    headingImageUploadMessage,
    setHeadingImageUploadMessage,
    isUploadingHeadingImage: uploadHeadingImageMutation.isPending,
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
  };
}
