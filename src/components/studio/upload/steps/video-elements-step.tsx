"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { UploadDraft } from "@/lib/videos/studio-view";
import ChaptersEditor from "../chapters-editor";
import { useMyProductsQuery } from "@/hooks/products";
import { useAttachableProjectsQuery, useProjectOpenRolesQuery } from "@/hooks/rnd/projects";
import { centsToPriceLabel } from "@/lib/products/schemas";

// Step 2 — video elements. Qatoto's thesis rows (pitch / funding / recruit /
// team) come first; YouTube-carryover rows sit below them.
//
// THE VENTURE SELECT USED TO BE THREE HARDCODED STRINGS. `MOCK_PITCH_PROJECT_TITLES` fed a
// control whose value was a project TITLE, which the wire had no field for — `attachedPitchId`
// is not client-writable — so picking one did nothing at all. It now writes a real
// `researchProjectId`, and the options come from `GET /research-projects/attachable`, which
// answers with exactly the ventures the server will accept: active membership of an active
// project. An option this list offers cannot be refused by the save.

type VideoElementsStepProps = {
  draft: UploadDraft;
  onDraftChange: (patch: Partial<UploadDraft>) => void;
  onOpenStoreProductsPicker: () => void;
  onOpenInviteCollaborator: () => void;
};

export default function VideoElementsStep({
  draft,
  onDraftChange,
  onOpenStoreProductsPicker,
  onOpenInviteCollaborator,
}: VideoElementsStepProps) {
  const documentFileInputRef = useRef<HTMLInputElement>(null);
  const [newOpenRoleText, setNewOpenRoleText] = useState("");
  const [newTeamMemberText, setNewTeamMemberText] = useState("");
  const [newMilestoneText, setNewMilestoneText] = useState("");

  // RESOLVED FROM THE CREATOR'S OWN LISTINGS, not a fixture. An id the draft carries that is no
  // longer in the list — deleted since it was attached — simply does not resolve to a chip, and the
  // backend refuses it on save anyway. Rendering a chip for it from stale local state would tell the
  // creator a product is attached that cannot be.
  const myProductsQuery = useMyProductsQuery(1);
  const attachedProducts = (myProductsQuery.data?.rows ?? []).filter((product) =>
    draft.attachedProductIds.includes(product.id),
  );

  // Same discipline as the products above: the options are the server's answer to "what may
  // this caller attach", so the picker cannot offer something the save will refuse.
  const attachableProjectsQuery = useAttachableProjectsQuery();
  const attachableProjects = attachableProjectsQuery.data?.rows ?? [];

  // Only the CHOSEN venture's roles. Disabled until one is picked — the server refuses a role
  // link on a video with no venture, so there is nothing honest to offer before then.
  const ventureOpenRolesQuery = useProjectOpenRolesQuery(draft.researchProjectSlug);
  const ventureOpenRoles = (ventureOpenRolesQuery.data ?? []).filter(
    (role) => role.status === "open" && role.slotsFilledCount < role.slotsTotal,
  );

  function handleRemoveAttachedProductClick(productId: string) {
    onDraftChange({
      attachedProductIds: draft.attachedProductIds.filter((attachedId) => attachedId !== productId),
    });
  }

  // FREE TEXT — a blurb that points at nothing, which is still the right shape for a video
  // with no venture. Deduped by title, as it always was.
  function handleAddOpenRoleClick() {
    const openRoleName = newOpenRoleText.trim();
    if (openRoleName === "" || draft.openRoles.some((role) => role.roleTitle === openRoleName)) {
      return;
    }
    onDraftChange({
      openRoles: [
        ...draft.openRoles,
        { roleTitle: openRoleName, roleDescription: null, openRoleId: null },
      ],
    });
    setNewOpenRoleText("");
  }

  // THE REAL THING — a blurb that names an actual `projectOpenRole`, which is what puts an
  // Apply button under the video. Deduped by id so one role cannot be advertised twice.
  function handleLinkOpenRole(openRoleId: string) {
    const pickedRole = ventureOpenRoles.find((role) => role.id === openRoleId);
    if (!pickedRole) return;
    if (draft.openRoles.some((role) => role.openRoleId === openRoleId)) return;
    onDraftChange({
      openRoles: [
        ...draft.openRoles,
        {
          roleTitle: pickedRole.roleTitle,
          roleDescription: pickedRole.description,
          openRoleId: pickedRole.id,
        },
      ],
    });
  }

  function handleAddTeamMemberClick() {
    const teamMemberName = newTeamMemberText.trim();
    if (teamMemberName === "" || draft.teamMemberNames.includes(teamMemberName)) return;
    onDraftChange({ teamMemberNames: [...draft.teamMemberNames, teamMemberName] });
    setNewTeamMemberText("");
  }

  function handleAddMilestoneClick() {
    const milestoneText = newMilestoneText.trim();
    if (milestoneText === "") return;
    onDraftChange({ milestones: [...draft.milestones, milestoneText] });
    setNewMilestoneText("");
  }

  function handleDocumentFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedDocuments = event.target.files;
    if (!selectedDocuments) return;
    const newDocumentNames = Array.from(selectedDocuments)
      .map((documentFile) => documentFile.name)
      .filter((documentName) => !draft.attachedDocumentNames.includes(documentName));
    onDraftChange({
      attachedDocumentNames: [...draft.attachedDocumentNames, ...newDocumentNames],
    });
    event.target.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5 rounded-2xl border border-border p-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Product journey</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect this video to your pitch, funding, roles, and team — idea → team → fund → build
            → ship.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Store products</span>
          <div>
            <button
              type="button"
              onClick={onOpenStoreProductsPicker}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
            >
              <Image
                src="/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
              />
              Attach store products
            </button>
          </div>
          {attachedProducts.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {attachedProducts.map((product) => (
                <RemovableChip
                  key={product.id}
                  label={`${product.title} · ${centsToPriceLabel(product.priceInCents)}`}
                  onRemove={() => handleRemoveAttachedProductClick(product.id)}
                />
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Viewers can buy attached products from the watch page. Ownership, price, and inventory
            are re-validated by the backend.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="upload-research-project" className="text-sm font-medium text-foreground">
            Venture
          </label>
          <div className="relative sm:w-80">
            <select
              id="upload-research-project"
              value={draft.researchProjectSlug ?? ""}
              onChange={(event) =>
                onDraftChange({ researchProjectSlug: event.target.value || null })
              }
              disabled={attachableProjectsQuery.isPending}
              className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5] disabled:opacity-50"
            >
              <option value="">None</option>
              {attachableProjects.map((project) => (
                <option key={project.slug} value={project.slug}>
                  {project.name}
                </option>
              ))}
            </select>
            <Image
              src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {attachableProjectsQuery.isPending
              ? "Loading your ventures…"
              : attachableProjects.length === 0
                ? "You are not on a published venture yet. Publish one to link videos to it."
                : "Shows this video on the venture's page, and puts a link back to it under the player."}
          </p>
        </div>

        <CheckboxRow
          label='Show a funding call-to-action ("Back this") on the watch page'
          isChecked={draft.hasFundingCallToAction}
          onToggle={() => onDraftChange({ hasFundingCallToAction: !draft.hasFundingCallToAction })}
        />

        <ChipListInput
          fieldId="upload-open-roles"
          label="Open roles"
          helperText={
            draft.researchProjectSlug === null
              ? "Plain text. Pick a venture above to link these to real roles viewers can apply to."
              : "Plain text. Use the picker below to link a real role instead — that is what gets an Apply button."
          }
          placeholder="e.g. Founding engineer"
          inputValue={newOpenRoleText}
          onInputValueChange={setNewOpenRoleText}
          onAddClick={handleAddOpenRoleClick}
          chips={draft.openRoles.map((role) =>
            role.openRoleId === null ? role.roleTitle : `${role.roleTitle} · linked`,
          )}
          onRemoveChip={(chipLabel) =>
            onDraftChange({
              openRoles: draft.openRoles.filter(
                (existingRole) =>
                  (existingRole.openRoleId === null
                    ? existingRole.roleTitle
                    : `${existingRole.roleTitle} · linked`) !== chipLabel,
              ),
            })
          }
        />

        {/*
          THE PICKER THAT MAKES THE LABEL REAL. Only rendered once a venture is chosen, because
          the server refuses an `openRoleId` on a video with no venture — offering one before
          then would dangle an option the save rejects.

          Adding from here copies the role's OWN title and description, so the blurb and the
          role cannot disagree the moment one of them is edited.
        */}
        {draft.researchProjectSlug !== null && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="upload-link-open-role" className="text-sm font-medium text-foreground">
              Link a real role
            </label>
            <div className="relative sm:w-80">
              <select
                id="upload-link-open-role"
                value=""
                onChange={(event) => {
                  if (event.target.value !== "") handleLinkOpenRole(event.target.value);
                }}
                disabled={ventureOpenRolesQuery.isPending || ventureOpenRoles.length === 0}
                className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5] disabled:opacity-50"
              >
                <option value="">
                  {ventureOpenRolesQuery.isPending
                    ? "Loading roles…"
                    : ventureOpenRoles.length === 0
                      ? "This venture has no open role"
                      : "Choose a role to link"}
                </option>
                {ventureOpenRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.roleTitle}
                  </option>
                ))}
              </select>
              <Image
                src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A linked role shows its real skills and remaining slots under the video, with an Apply
              button wired to this venture&apos;s applicant inbox.
            </p>
          </div>
        )}

        <ChipListInput
          fieldId="upload-team-members"
          label="Team members"
          helperText="Credit founders and team on the watch page."
          placeholder="e.g. Priya Sharma — CTO"
          inputValue={newTeamMemberText}
          onInputValueChange={setNewTeamMemberText}
          onAddClick={handleAddTeamMemberClick}
          chips={draft.teamMemberNames}
          onRemoveChip={(teamMemberName) =>
            onDraftChange({
              teamMemberNames: draft.teamMemberNames.filter(
                (existingName) => existingName !== teamMemberName,
              ),
            })
          }
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Pitch deck / documents</span>
          <div>
            <input
              ref={documentFileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              multiple
              onChange={handleDocumentFilesChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => documentFileInputRef.current?.click()}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
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
          {draft.attachedDocumentNames.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {draft.attachedDocumentNames.map((documentName) => (
                <RemovableChip
                  key={documentName}
                  label={documentName}
                  onRemove={() =>
                    onDraftChange({
                      attachedDocumentNames: draft.attachedDocumentNames.filter(
                        (existingName) => existingName !== documentName,
                      ),
                    })
                  }
                />
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Deck or whitepaper shown as a download under the video.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="upload-new-milestone" className="text-sm font-medium text-foreground">
            Milestones / roadmap
          </label>
          {draft.milestones.length > 0 && (
            <ul className="flex flex-col gap-2">
              {draft.milestones.map((milestone, milestoneIndex) => (
                <li
                  key={`${milestone}-${milestoneIndex}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {milestone}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onDraftChange({
                        milestones: draft.milestones.filter(
                          (_, existingIndex) => existingIndex !== milestoneIndex,
                        ),
                      })
                    }
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
              onChange={(event) => setNewMilestoneText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddMilestoneClick();
                }
              }}
              placeholder="e.g. Pilot with 3 warehouses — Aug 2026"
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
            />
            <button
              type="button"
              onClick={handleAddMilestoneClick}
              className="shrink-0 cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Build → ship progress shown to viewers and backers.
          </p>
        </div>
      </section>

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

      <section className="flex flex-col gap-5 rounded-2xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground">More elements</h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="upload-related-video" className="text-sm font-medium text-foreground">
            Related video
          </label>
          <input
            id="upload-related-video"
            type="text"
            value={draft.relatedVideoUrl}
            onChange={(event) => onDraftChange({ relatedVideoUrl: event.target.value })}
            placeholder="Paste a Qatoto video link"
            className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
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
          {draft.collaboratorEmails.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {draft.collaboratorEmails.map((collaboratorEmail) => (
                <RemovableChip
                  key={collaboratorEmail}
                  label={collaboratorEmail}
                  onRemove={() =>
                    onDraftChange({
                      collaboratorEmails: draft.collaboratorEmails.filter(
                        (existingEmail) => existingEmail !== collaboratorEmail,
                      ),
                    })
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------- Local helpers ---------- */

function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
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

function CheckboxRow({
  label,
  isChecked,
  onToggle,
}: {
  label: string;
  isChecked: boolean;
  onToggle: () => void;
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

function ChipListInput({
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
  fieldId: string;
  label: string;
  helperText: string;
  placeholder: string;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  onAddClick: () => void;
  chips: string[];
  onRemoveChip: (chip: string) => void;
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
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
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
