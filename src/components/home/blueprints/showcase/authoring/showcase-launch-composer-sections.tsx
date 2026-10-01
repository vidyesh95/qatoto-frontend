"use client";

import type { ComponentProps, ReactNode, RefObject } from "react";
import LaunchStatements from "@/components/home/blueprints/showcase/authoring/launch-statements";
import ShowcaseLaunchRowPreview from "@/components/home/blueprints/showcase/authoring/showcase-launch-row-preview";
import ShowcaseWriteUp from "@/components/home/blueprints/showcase/sections/showcase-write-up";

export type ShowcaseLaunchRowPreviewProps = ComponentProps<typeof ShowcaseLaunchRowPreview>;
import type {
  ShowcaseLaunchFormDraft,
  TeamMemberDraftRow,
} from "@/components/home/blueprints/showcase/authoring/showcase-launch-shared";
import SquareImagePicker from "@/components/home/blueprints/showcase/authoring/square-image-picker";
import type { HeadingImagePickState } from "@/components/home/blueprints/showcase/authoring/use-heading-image-pick";
import {
  LabeledEnumSelect,
  LabeledTextArea,
  LabeledTextInput,
  RepeatableRowShell,
} from "@/components/home/blueprints/authoring/form-fields";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import {
  BLUEPRINT_DIFFICULTIES,
  BLUEPRINT_DIFFICULTY_LABELS,
  type TeardownOption,
} from "@/lib/blueprints/schemas";
import { SHOWCASE_TAGLINE_MAXIMUM_CHARACTERS } from "@/lib/blueprints/showcase-authoring.schemas";
import { buildInitialsFromName } from "@/lib/format-initials";
import { ACCEPTED_IMAGE_INPUT_ACCEPT } from "@/lib/image-file-check";

export type WriteUpImageUploadState =
  | { readonly status: "idle" }
  | { readonly status: "checking"; readonly fileName: string }
  | { readonly status: "uploading"; readonly fileName: string }
  | { readonly status: "refused"; readonly message: string };

export type WriteUpPane = "write" | "preview";

const WRITE_UP_PANE_LABELS: Record<WriteUpPane, string> = { write: "Write", preview: "Preview" };
const WRITE_UP_PANES: readonly WriteUpPane[] = ["write", "preview"];

const HEADING_IMAGE_INPUT_ID = "showcase-heading-image";

function newTeamMemberDraftRow(): TeamMemberDraftRow {
  return { rowId: crypto.randomUUID(), displayName: "", handle: "", role: "" };
}

/** One titled part of the form. A hairline above every section after the first, so the page scans. */
export function FormSection({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
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
export function WriteUpImageUploadStatus({
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

export function ShowcaseBuildAndImageFields({
  formDraft,
  applyFormPatch,
  readFieldError,
  isPosting,
  headingImagePickState,
  resetIdempotencyKey,
  onHeadingImagePicked,
  onRemoveHeadingImage,
  headingImageUploadMessage,
  isUploadingHeadingImage,
  rowPreviewProps,
}: {
  readonly formDraft: ShowcaseLaunchFormDraft;
  readonly applyFormPatch: (formPatch: Partial<ShowcaseLaunchFormDraft>) => void;
  readonly readFieldError: (fieldPath: string) => string | null;
  readonly isPosting: boolean;
  readonly headingImagePickState: HeadingImagePickState;
  readonly resetIdempotencyKey: () => void;
  readonly onHeadingImagePicked: (file: File) => void;
  readonly onRemoveHeadingImage: () => void;
  readonly headingImageUploadMessage: string | null;
  readonly isUploadingHeadingImage: boolean;
  readonly rowPreviewProps: ShowcaseLaunchRowPreviewProps;
}) {
  return (
    <>
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
            resetIdempotencyKey();
            onHeadingImagePicked(file);
          }}
          onRemove={onRemoveHeadingImage}
        />
        {headingImageUploadMessage === null ? null : (
          <p role="alert" className="text-xs leading-4 text-destructive">
            {headingImageUploadMessage}
          </p>
        )}
        {isUploadingHeadingImage ? (
          <p className="text-xs text-muted-foreground">Uploading the cover image…</p>
        ) : null}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs tracking-wider text-muted-foreground uppercase">
            How it will look in the feed
          </p>
          <div className="mt-3">
            <ShowcaseLaunchRowPreview {...rowPreviewProps} />
          </div>
        </div>
      </FormSection>
    </>
  );
}

export function ShowcaseStoryAndLinksFields({
  formDraft,
  applyFormPatch,
  readFieldError,
  writeUpPane,
  setWriteUpPane,
  onAddWriteUpImageClick,
  isWriteUpImageBusy,
  writeUpImageInputRef,
  onWriteUpImageFilePicked,
  writeUpTextAreaRef,
  writeUpImageUploadState,
}: {
  readonly formDraft: ShowcaseLaunchFormDraft;
  readonly applyFormPatch: (formPatch: Partial<ShowcaseLaunchFormDraft>) => void;
  readonly readFieldError: (fieldPath: string) => string | null;
  readonly writeUpPane: WriteUpPane;
  readonly setWriteUpPane: (pane: WriteUpPane) => void;
  readonly onAddWriteUpImageClick: () => void;
  readonly isWriteUpImageBusy: boolean;
  readonly writeUpImageInputRef: RefObject<HTMLInputElement | null>;
  readonly onWriteUpImageFilePicked: (file: File) => void;
  readonly writeUpTextAreaRef: RefObject<HTMLTextAreaElement | null>;
  readonly writeUpImageUploadState: WriteUpImageUploadState;
}) {
  return (
    <>
      <FormSection
        title="The story"
        description="Optional. Markdown, as on GitHub: ## for a heading, **bold**, - for a list, [words](https://…) for a link. Paste a YouTube link on a line of its own to embed the video. Add an image to place it where your cursor is."
      >
        <div className="flex flex-wrap items-center gap-2">
          <fieldset className="flex gap-1">
            <legend className="sr-only">Write-up view</legend>
            {WRITE_UP_PANES.map((pane) => (
              <button
                key={pane}
                type="button"
                aria-pressed={writeUpPane === pane}
                onClick={() => setWriteUpPane(pane)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint ${
                  writeUpPane === pane
                    ? "bg-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {WRITE_UP_PANE_LABELS[pane]}
              </button>
            ))}
          </fieldset>
          {writeUpPane === "write" ? (
            <button
              type="button"
              onClick={onAddWriteUpImageClick}
              disabled={isWriteUpImageBusy}
              className="ml-auto rounded-full border border-primary-imprint/40 px-3 py-1 text-xs font-medium text-primary-imprint transition-colors hover:bg-primary-imprint/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-not-allowed disabled:opacity-40"
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
              changeEvent.target.value = "";
              if (pickedFile !== undefined) onWriteUpImageFilePicked(pickedFile);
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
    </>
  );
}

export function ShowcaseTeamAndDetailsFields({
  formDraft,
  applyFormPatch,
  readFieldError,
  updateTeamRow,
  teardownOptions,
}: {
  readonly formDraft: ShowcaseLaunchFormDraft;
  readonly applyFormPatch: (formPatch: Partial<ShowcaseLaunchFormDraft>) => void;
  readonly readFieldError: (fieldPath: string) => string | null;
  readonly updateTeamRow: (rowId: string, teamRowPatch: Partial<TeamMemberDraftRow>) => void;
  readonly teardownOptions: readonly TeardownOption[];
}) {
  return (
    <>
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
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-medium text-primary-imprint"
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
          className="rounded-full border border-primary-imprint/40 px-4 py-2 text-sm font-medium text-primary-imprint transition-colors hover:bg-primary-imprint/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
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
                builtFromBlueprintSlug:
                  teardownOptions.find(
                    (teardownOption) => teardownOption.slug === changeEvent.target.value,
                  )?.slug ?? "",
              })
            }
            className={`${INPUT_CLASS} mt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint`}
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
    </>
  );
}
