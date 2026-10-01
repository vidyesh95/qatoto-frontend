"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import CreatableCombobox, { type ComboboxOption } from "@/components/ui/creatable-combobox";
import {
  useCreateResearchPaperCategoryMutation,
  useResearchPaperCategoriesQuery,
  useUploadProgramPaperMutation,
} from "@/hooks/rnd/research-programs";
import { newIdempotencyKey } from "@/lib/idempotency";
import { formatFileSizeFromBytes, formatIsoInstant } from "@/lib/rnd/format";
import { RESEARCH_PAPER_MODERATION_STATUS_LABELS } from "@/lib/rnd/labels";
import type {
  ResearchBranch,
  ResearchPaper,
  ResearchPaperCategory,
} from "@/lib/rnd/research-programs.schemas";
import BranchPickerField from "./branch-picker-field";
import { MutationAcceptedNotice } from "./mutation-feedback";

export function ResearchPaperUploadForm({
  programSlug,
  branches,
  canUploadPaper,
}: {
  readonly programSlug: string;
  readonly branches: ResearchBranch[];
  readonly canUploadPaper: boolean;
}) {
  const categoriesQuery = useResearchPaperCategoriesQuery();
  const uploadMutation = useUploadProgramPaperMutation(programSlug);
  const proposeCategoryMutation = useCreateResearchPaperCategoryMutation();

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [doi, setDoi] = useState("");
  const [authorAffiliation, setAuthorAffiliation] = useState("");
  const selectedFileRef = useRef<File | null>(null);
  const uploadIdempotencyKeyRef = useRef<string | null>(null);
  const [createdCategories, setCreatedCategories] = useState<ResearchPaperCategory[]>([]);

  function handleCategoryCreateRequest(typedCategoryLabel: string): void {
    proposeCategoryMutation.mutate(
      { label: typedCategoryLabel },
      {
        onSuccess: (createdCategory) => {
          setCreatedCategories((previousCategories) => [...previousCategories, createdCategory]);
          setCategoryId(createdCategory.id);
        },
      },
    );
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    selectedFileRef.current = event.target.files?.[0] ?? null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!title.trim() || !categoryId) return;

    if (uploadIdempotencyKeyRef.current === null) {
      uploadIdempotencyKeyRef.current = newIdempotencyKey();
    }

    uploadMutation.mutate(
      {
        title: title.trim(),
        categoryId,
        branchId: branchId === "" ? null : branchId,
        doi: doi.trim() === "" ? null : doi.trim(),
        authorAffiliation: authorAffiliation.trim() === "" ? null : authorAffiliation.trim(),
        abstractText: null,
        pdfFile: selectedFileRef.current,
        idempotencyKey: uploadIdempotencyKeyRef.current,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDoi("");
          setAuthorAffiliation("");
          selectedFileRef.current = null;
          uploadIdempotencyKeyRef.current = newIdempotencyKey();
        },
      },
    );
  }

  const approvedCategories = categoriesQuery.data ?? [];
  const categoryOptions: ComboboxOption[] = [
    ...approvedCategories.map((category) => ({
      optionId: category.id,
      optionName: category.displayLabel,
    })),
    ...createdCategories
      .filter((created) => !approvedCategories.some((category) => category.id === created.id))
      .map((created) => ({ optionId: created.id, optionName: created.displayLabel })),
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-outline-variant/60 bg-card p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="font-medium">Title</span>
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={300}
            className="w-full rounded-lg border border-outline-variant/60 px-3 py-2 text-sm"
            placeholder="Senolytic dosing in human trials: a meta-review"
          />
        </label>

        <div className="text-xs">
          <CreatableCombobox
            labelText="Category"
            placeholderText="Search or create a category"
            selectedOptionId={categoryId}
            options={categoryOptions}
            onOptionSelect={setCategoryId}
            onCreateRequest={handleCategoryCreateRequest}
            helpText={
              proposeCategoryMutation.isPending
                ? "Creating…"
                : "Type a name that does not exist yet to create it. New categories are reviewed later."
            }
          />
        </div>

        <BranchPickerField
          programSlug={programSlug}
          branches={branches}
          selectedBranchId={branchId}
          onBranchSelect={setBranchId}
          labelText="Research branch (optional)"
          noBranchOptionLabel="Not filed against a branch"
          canCreateBranch={canUploadPaper}
        />

        <label className="space-y-1 text-xs">
          <span className="font-medium">DOI (optional)</span>
          <input
            value={doi}
            onChange={(event) => setDoi(event.target.value)}
            maxLength={200}
            className="w-full rounded-lg border border-outline-variant/60 px-3 py-2 text-sm"
            placeholder="10.1234/example or a doi.org link"
          />
        </label>

        <label className="space-y-1 text-xs sm:col-span-2">
          <span className="font-medium">Your affiliation (optional)</span>
          <input
            value={authorAffiliation}
            onChange={(event) => setAuthorAffiliation(event.target.value)}
            maxLength={200}
            className="w-full rounded-lg border border-outline-variant/60 px-3 py-2 text-sm"
            placeholder="University of Lagos, Gerontology Lab"
          />
          <span className="text-xs text-muted-foreground">
            Shown as your own claim. Qatoto does not verify affiliations.
          </span>
        </label>
      </div>

      <label className="block space-y-1 text-xs">
        <span className="font-medium">PDF (optional)</span>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="w-full cursor-pointer rounded-lg border border-dashed border-outline-variant px-3 py-4 text-sm"
        />
        <span className="text-xs text-muted-foreground">
          Up to 25 MB. You can file a DOI now and attach the PDF later.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={uploadMutation.isPending || !title.trim() || !categoryId}
          className="cursor-pointer rounded-full bg-primary-imprint px-4 py-2 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploadMutation.isPending ? "Submitting…" : "Submit for review"}
        </button>
        {uploadMutation.isSuccess && (
          <MutationAcceptedNotice message="Paper submitted. A moderator reviews it before it appears publicly." />
        )}
      </div>
    </form>
  );
}

export function ResearchPaperListItem({
  paper,
  canDownload,
  onDownload,
  isDownloading,
  onWithdraw,
  isWithdrawing,
}: {
  readonly paper: ResearchPaper;
  readonly canDownload: boolean;
  readonly onDownload: (paperId: string) => void;
  readonly isDownloading: boolean;
  readonly onWithdraw: (paperId: string) => void;
  readonly isWithdrawing: boolean;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-outline-variant/60 bg-card p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{paper.title}</p>
          {paper.isUploadedByViewer && (
            <span className="rounded-full bg-primary-imprint/10 px-2 py-0.5 text-xs text-primary-imprint">
              You
            </span>
          )}
          {paper.moderationStatus !== "approved" && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {RESEARCH_PAPER_MODERATION_STATUS_LABELS[paper.moderationStatus]}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {paper.uploader.name}
          {paper.authorAffiliation ? ` · ${paper.authorAffiliation}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {paper.categoryDisplayLabel} · {formatIsoInstant(paper.createdAt)}
          {paper.hasFile ? ` · ${formatFileSizeFromBytes(paper.fileByteSize)}` : " · no file"}
        </p>
        {paper.doi && <p className="truncate text-xs text-muted-foreground">DOI: {paper.doi}</p>}
        {paper.reviewerNote && paper.isUploadedByViewer && (
          <p className="rounded-lg bg-muted p-2 text-xs">Reviewer: {paper.reviewerNote}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {paper.hasFile && canDownload && (
          <button
            type="button"
            disabled={isDownloading}
            onClick={() => onDownload(paper.paperId)}
            className="cursor-pointer rounded-full border border-primary-imprint px-3 py-1.5 text-xs font-medium text-primary-imprint transition-colors hover:bg-primary-imprint/10 disabled:opacity-60"
          >
            Download
          </button>
        )}
        {paper.isUploadedByViewer && paper.moderationStatus === "queued" && (
          <button
            type="button"
            disabled={isWithdrawing}
            onClick={() => onWithdraw(paper.paperId)}
            className="cursor-pointer rounded-full border border-outline-variant px-3 py-1.5 text-xs transition-colors hover:bg-muted disabled:opacity-60"
          >
            Withdraw
          </button>
        )}
      </div>
    </li>
  );
}
