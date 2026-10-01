"use client";

import Image from "next/image";
import type { VideoDocument } from "@/lib/videos/schemas";
import { formatByteSizeLabel, MAX_DOCUMENTS_PER_VIDEO } from "./video-elements-constants";

export function RemovableChip({
  label,
  onRemove,
}: {
  readonly label: string;
  readonly onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-1 rounded-full bg-secondary py-1 pr-1 pl-3">
      <span className="max-w-56 truncate text-xs font-medium text-secondary-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
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
  );
}

export function CheckboxRow({
  label,
  isChecked,
  onToggle,
}: {
  readonly label: string;
  readonly isChecked: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex cursor-pointer items-start gap-3 text-left"
    >
      <span
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${
          isChecked ? "border-foreground bg-foreground" : "border-border"
        }`}
      >
        {isChecked && (
          <Image
            src="/icons/check_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"
            alt=""
            width={14}
            height={14}
          />
        )}
      </span>
      <span className="text-sm text-foreground">{label}</span>
    </button>
  );
}

export function ChipListInput({
  fieldId,
  label,
  helperText,
  placeholder,
  inputValue,
  onInputValueChange,
  onAddClick,
  chips,
  onRemoveChip,
}: {
  readonly fieldId: string;
  readonly label: string;
  readonly helperText: string;
  readonly placeholder: string;
  readonly inputValue: string;
  readonly onInputValueChange: (value: string) => void;
  readonly onAddClick: () => void;
  readonly chips: readonly string[];
  readonly onRemoveChip: (chip: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <RemovableChip key={chip} label={chip} onRemove={() => onRemoveChip(chip)} />
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={fieldId}
          type="text"
          value={inputValue}
          onChange={(event) => onInputValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddClick();
            }
          }}
          placeholder={placeholder}
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
        />
        <button
          type="button"
          onClick={onAddClick}
          className="shrink-0 cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
        >
          Add
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}

export function MilestonesEditor({
  milestones,
  newMilestoneText,
  onNewMilestoneTextChange,
  onAddMilestone,
  onRemoveMilestone,
}: {
  readonly milestones: readonly string[];
  readonly newMilestoneText: string;
  readonly onNewMilestoneTextChange: (text: string) => void;
  readonly onAddMilestone: () => void;
  readonly onRemoveMilestone: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="upload-new-milestone" className="text-sm font-medium text-foreground">
        Milestones / roadmap
      </label>
      {milestones.length > 0 && (
        <ul className="flex flex-col gap-2">
          {milestones.map((milestone, milestoneIndex) => (
            <li
              key={`${milestone}-${milestoneIndex}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{milestone}</span>
              <button
                type="button"
                onClick={() => onRemoveMilestone(milestoneIndex)}
                aria-label={`Remove milestone: ${milestone}`}
                className="shrink-0 cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
              >
                <Image
                  src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={16}
                  height={16}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id="upload-new-milestone"
          type="text"
          value={newMilestoneText}
          onChange={(event) => onNewMilestoneTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddMilestone();
            }
          }}
          placeholder="e.g. Pilot with 3 warehouses — Aug 2026"
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
        />
        <button
          type="button"
          onClick={onAddMilestone}
          className="shrink-0 cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
        >
          Add
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Build → ship progress shown to viewers and backers.
      </p>
    </div>
  );
}

export function DocumentAttachmentsField({
  savedDocuments,
  pendingDocumentFiles,
  documentRejectionMessage,
  onAttachClick,
  onRemoveSavedDocument,
  onRemovePendingFile,
}: {
  readonly savedDocuments: readonly VideoDocument[];
  readonly pendingDocumentFiles: readonly File[];
  readonly documentRejectionMessage: string | null;
  readonly onAttachClick: () => void;
  readonly onRemoveSavedDocument: (documentId: string) => void;
  readonly onRemovePendingFile: (fileName: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">Pitch deck / documents</span>
      <div>
        <button
          type="button"
          onClick={onAttachClick}
          disabled={savedDocuments.length + pendingDocumentFiles.length >= MAX_DOCUMENTS_PER_VIDEO}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Image
            src="/icons/description_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Attach documents
        </button>
      </div>

      {savedDocuments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {savedDocuments.map((savedDocument) => (
            <RemovableChip
              key={savedDocument.id}
              label={`${savedDocument.fileName} · ${formatByteSizeLabel(savedDocument.byteSize)}`}
              onRemove={() => onRemoveSavedDocument(savedDocument.id)}
            />
          ))}
        </ul>
      )}

      {pendingDocumentFiles.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {pendingDocumentFiles.map((pendingFile) => (
            <RemovableChip
              key={pendingFile.name}
              label={`${pendingFile.name} · ${formatByteSizeLabel(pendingFile.size)} · uploads on save`}
              onRemove={() => onRemovePendingFile(pendingFile.name)}
            />
          ))}
        </ul>
      )}

      {documentRejectionMessage !== null && (
        <p className="text-xs text-destructive">{documentRejectionMessage}</p>
      )}

      <p className="text-xs text-muted-foreground">
        PDF, up to 25 MB, {MAX_DOCUMENTS_PER_VIDEO} per video. Shown as a download under the video
        once it is published.
      </p>
    </div>
  );
}

export function MoreElementsSection({
  relatedVideoUrl,
  collaboratorEmails,
  onRelatedVideoUrlChange,
  onOpenInviteCollaborator,
  onRemoveCollaboratorEmail,
}: {
  readonly relatedVideoUrl: string;
  readonly collaboratorEmails: readonly string[];
  readonly onRelatedVideoUrlChange: (url: string) => void;
  readonly onOpenInviteCollaborator: () => void;
  readonly onRemoveCollaboratorEmail: (email: string) => void;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-border p-6">
      <h3 className="text-base font-semibold text-foreground">More elements</h3>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="upload-related-video" className="text-sm font-medium text-foreground">
          Related video
        </label>
        <input
          id="upload-related-video"
          type="text"
          value={relatedVideoUrl}
          onChange={(event) => onRelatedVideoUrlChange(event.target.value)}
          placeholder="Paste a Qatoto video link"
          className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary-imprint"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Subtitles</p>
          <p className="text-xs text-muted-foreground">Coming soon.</p>
        </div>
        <Image
          src="/icons/subtitles_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Collaboration</span>
        <div>
          <button
            type="button"
            onClick={onOpenInviteCollaborator}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
          >
            <Image
              src="/icons/group_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
            />
            Invite collaborator
          </button>
        </div>
        {collaboratorEmails.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {collaboratorEmails.map((collaboratorEmail) => (
              <RemovableChip
                key={collaboratorEmail}
                label={collaboratorEmail}
                onRemove={() => onRemoveCollaboratorEmail(collaboratorEmail)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
