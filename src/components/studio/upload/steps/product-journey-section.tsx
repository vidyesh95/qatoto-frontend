"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { UploadDraft } from "@/lib/videos/studio-view";
import { useMyProductsQuery } from "@/hooks/products";
import { useAttachableProjectsQuery, useProjectOpenRolesQuery } from "@/hooks/rnd/projects";
import { centsToPriceLabel } from "@/lib/products/schemas";
import { MAX_DOCUMENTS_PER_VIDEO, MAX_DOCUMENT_BYTES } from "./video-elements-constants";
import {
  CheckboxRow,
  ChipListInput,
  DocumentAttachmentsField,
  MilestonesEditor,
  RemovableChip,
} from "./video-elements-step-subcomponents";

function AttachedStoreProductsSubSection({
  attachedProducts,
  onOpenStoreProductsPicker,
  onRemoveAttachedProduct,
}: {
  readonly attachedProducts: readonly { id: string; title: string; priceInCents: number }[];
  readonly onOpenStoreProductsPicker: () => void;
  readonly onRemoveAttachedProduct: (productId: string) => void;
}) {
  return (
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
              onRemove={() => onRemoveAttachedProduct(product.id)}
            />
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Viewers can buy attached products from the watch page. Ownership, price, and inventory are
        re-validated by the backend.
      </p>
    </div>
  );
}

function VentureSelectorSubSection({
  researchProjectSlug,
  onResearchProjectSlugChange,
  attachableProjects,
  isAttachableProjectsPending,
}: {
  readonly researchProjectSlug: string | null;
  readonly onResearchProjectSlugChange: (slug: string | null) => void;
  readonly attachableProjects: readonly { slug: string; name: string }[];
  readonly isAttachableProjectsPending: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="upload-research-project" className="text-sm font-medium text-foreground">
        Venture
      </label>
      <div className="relative sm:w-80">
        <select
          id="upload-research-project"
          value={researchProjectSlug ?? ""}
          onChange={(event) => onResearchProjectSlugChange(event.target.value || null)}
          disabled={isAttachableProjectsPending}
          className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary-imprint disabled:opacity-50"
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
        {isAttachableProjectsPending
          ? "Loading your ventures…"
          : attachableProjects.length === 0
            ? "You are not on a published venture yet. Publish one to link videos to it."
            : "Shows this video on the venture's page, and puts a link back to it under the player."}
      </p>
    </div>
  );
}

function LinkedOpenRoleSubSection({
  ventureOpenRoles,
  isVentureOpenRolesPending,
  onLinkOpenRole,
}: {
  readonly ventureOpenRoles: readonly { id: string; roleTitle: string }[];
  readonly isVentureOpenRolesPending: boolean;
  readonly onLinkOpenRole: (roleId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="upload-link-open-role" className="text-sm font-medium text-foreground">
        Link a real role
      </label>
      <div className="relative sm:w-80">
        <select
          id="upload-link-open-role"
          value=""
          onChange={(event) => {
            if (event.target.value !== "") onLinkOpenRole(event.target.value);
          }}
          disabled={isVentureOpenRolesPending || ventureOpenRoles.length === 0}
          className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-primary-imprint disabled:opacity-50"
        >
          <option value="">
            {isVentureOpenRolesPending
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
  );
}

export function ProductJourneySection({
  draft,
  onDraftChange,
  onOpenStoreProductsPicker,
  pendingDocumentFiles,
  onPendingDocumentFilesChange,
  onRemoveSavedDocument,
}: {
  readonly draft: UploadDraft;
  readonly onDraftChange: (patch: Partial<UploadDraft>) => void;
  readonly onOpenStoreProductsPicker: () => void;
  readonly pendingDocumentFiles: readonly File[];
  readonly onPendingDocumentFilesChange: (files: File[]) => void;
  readonly onRemoveSavedDocument: (documentId: string) => void;
}) {
  const [documentRejectionMessage, setDocumentRejectionMessage] = useState<string | null>(null);
  const documentFileInputRef = useRef<HTMLInputElement>(null);
  const [newOpenRoleText, setNewOpenRoleText] = useState("");
  const [newTeamMemberText, setNewTeamMemberText] = useState("");
  const [newMilestoneText, setNewMilestoneText] = useState("");

  const myProductsQuery = useMyProductsQuery(1);
  const attachedProductIdsSet = new Set(draft.attachedProductIds);
  const attachedProducts = (myProductsQuery.data?.rows ?? []).filter((product) =>
    attachedProductIdsSet.has(product.id),
  );

  const attachableProjectsQuery = useAttachableProjectsQuery();
  const attachableProjects = attachableProjectsQuery.data?.rows ?? [];

  const ventureOpenRolesQuery = useProjectOpenRolesQuery(draft.researchProjectSlug);
  const ventureOpenRoles = (ventureOpenRolesQuery.data ?? []).filter(
    (role) => role.status === "open" && role.slotsFilledCount < role.slotsTotal,
  );

  function handleRemoveAttachedProductClick(productId: string) {
    onDraftChange({
      attachedProductIds: draft.attachedProductIds.filter((attachedId) => attachedId !== productId),
    });
  }

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

  function handleLinkOpenRole(roleId: string) {
    const targetRole = ventureOpenRoles.find((role) => role.id === roleId);
    if (!targetRole) return;
    if (draft.openRoles.some((role) => role.openRoleId === targetRole.id)) return;
    onDraftChange({
      openRoles: [
        ...draft.openRoles,
        {
          roleTitle: targetRole.roleTitle,
          roleDescription: targetRole.description,
          openRoleId: targetRole.id,
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

    const alreadyChosenNames = new Set(pendingDocumentFiles.map((file) => file.name));
    const savedNames = new Set(draft.savedDocuments.map((document) => document.fileName));
    const rejections: string[] = [];
    const acceptedFiles: File[] = [];

    for (const documentFile of Array.from(selectedDocuments)) {
      if (documentFile.type !== "application/pdf") {
        rejections.push(`${documentFile.name} is not a PDF`);
        continue;
      }
      if (documentFile.size > MAX_DOCUMENT_BYTES) {
        rejections.push(`${documentFile.name} is over 25 MB`);
        continue;
      }
      if (alreadyChosenNames.has(documentFile.name) || savedNames.has(documentFile.name)) continue;
      acceptedFiles.push(documentFile);
    }

    const roomLeft =
      MAX_DOCUMENTS_PER_VIDEO - draft.savedDocuments.length - pendingDocumentFiles.length;
    const withinCap = acceptedFiles.slice(0, Math.max(roomLeft, 0));
    if (withinCap.length < acceptedFiles.length) {
      rejections.push(`a video may carry at most ${String(MAX_DOCUMENTS_PER_VIDEO)} documents`);
    }

    setDocumentRejectionMessage(rejections.length > 0 ? rejections.join("; ") : null);
    if (withinCap.length > 0) {
      onPendingDocumentFilesChange([...pendingDocumentFiles, ...withinCap]);
    }
    event.target.value = "";
  }

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-border p-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Product journey</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect this video to your pitch, funding, roles, and team — idea → team → fund → build →
          ship.
        </p>
      </div>

      <AttachedStoreProductsSubSection
        attachedProducts={attachedProducts}
        onOpenStoreProductsPicker={onOpenStoreProductsPicker}
        onRemoveAttachedProduct={handleRemoveAttachedProductClick}
      />

      <VentureSelectorSubSection
        researchProjectSlug={draft.researchProjectSlug}
        onResearchProjectSlugChange={(slug) => onDraftChange({ researchProjectSlug: slug })}
        attachableProjects={attachableProjects}
        isAttachableProjectsPending={attachableProjectsQuery.isPending}
      />

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

      {draft.researchProjectSlug !== null && (
        <LinkedOpenRoleSubSection
          ventureOpenRoles={ventureOpenRoles}
          isVentureOpenRolesPending={ventureOpenRolesQuery.isPending}
          onLinkOpenRole={handleLinkOpenRole}
        />
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

      <input
        ref={documentFileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleDocumentFilesChange}
        className="hidden"
      />

      <DocumentAttachmentsField
        savedDocuments={draft.savedDocuments}
        pendingDocumentFiles={pendingDocumentFiles}
        documentRejectionMessage={documentRejectionMessage}
        onAttachClick={() => documentFileInputRef.current?.click()}
        onRemoveSavedDocument={onRemoveSavedDocument}
        onRemovePendingFile={(fileName) =>
          onPendingDocumentFilesChange(
            pendingDocumentFiles.filter((file) => file.name !== fileName),
          )
        }
      />

      <MilestonesEditor
        milestones={draft.milestones}
        newMilestoneText={newMilestoneText}
        onNewMilestoneTextChange={setNewMilestoneText}
        onAddMilestone={handleAddMilestoneClick}
        onRemoveMilestone={(milestoneIndex) =>
          onDraftChange({
            milestones: draft.milestones.filter(
              (_, existingIndex) => existingIndex !== milestoneIndex,
            ),
          })
        }
      />
    </section>
  );
}
