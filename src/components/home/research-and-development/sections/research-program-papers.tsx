// TRANSPORT: client-query — the upload form and the download control both call hooks in
// `@/hooks/rnd/research-programs`. The first page of papers arrives as props from the server page.
"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import {
  useCreatePaperDownloadLinkMutation,
  useCreateResearchPaperCategoryMutation,
  useDeleteProgramPaperMutation,
  useResearchPaperCategoriesQuery,
  useUploadProgramPaperMutation,
} from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";
import { newIdempotencyKey } from "@/lib/rnd/idempotency";
import { formatFileSizeFromBytes, formatIsoInstant } from "@/lib/rnd/format";
import { RESEARCH_PAPER_MODERATION_STATUS_LABELS } from "@/lib/rnd/labels";
import type { ResearchBranch, ResearchPaper } from "@/lib/rnd/research-programs.schemas";

import { MutationAcceptedNotice, MutationErrorNotice } from "./mutation-feedback";

type ResearchProgramPapersProps = {
  programSlug: string;
  papers: ResearchPaper[];
  /** For the "which branch is this about?" picker. Empty is fine — the field is optional. */
  branches: ResearchBranch[];
  /** Signed in on a published program. A signed-out reader gets the library without the form. */
  canUploadPaper: boolean;
  canDownload: boolean;
};

/**
 * The formal paper library, and the upload form.
 *
 * WHAT WAS BROKEN BEFORE, and is the reason this component was rewritten rather than retyped: the
 * mock's dropzone sent NOTHING. It appended a row to local state with the category hardcoded to
 * `"longevity-biology"` and the author hardcoded to `"You"`, so a researcher who uploaded a paper
 * saw it appear, refreshed, and lost it — while believing it was filed. Backend §10 records this
 * as the worst defect on the surface.
 *
 * IT IS A TWO-STEP UPLOAD, and the hook hides that: `POST …/papers` mints the metadata row, then
 * `POST …/papers/:id/file` sends the bytes. A paper with no file is a legitimate submission — a
 * DOI with no local copy — because object storage is optional on the backend.
 *
 * THE IDEMPOTENCY KEY IS MINTED ONCE PER ATTEMPT, as a `useState` initializer, and rotated only
 * on success. A key regenerated per render would defeat its own purpose.
 */
export default function ResearchProgramPapers({
  programSlug,
  papers,
  branches,
  canUploadPaper,
  canDownload,
}: ResearchProgramPapersProps) {
  const categoriesQuery = useResearchPaperCategoriesQuery();
  const uploadMutation = useUploadProgramPaperMutation(programSlug);
  const deleteMutation = useDeleteProgramPaperMutation(programSlug);
  const downloadMutation = useCreatePaperDownloadLinkMutation(programSlug);
  const proposeCategoryMutation = useCreateResearchPaperCategoryMutation();

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [doi, setDoi] = useState("");
  const [authorAffiliation, setAuthorAffiliation] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // `newIdempotencyKey` is passed UNCALLED so it runs once per mount, not once per render.
  const [uploadIdempotencyKey, setUploadIdempotencyKey] = useState(newIdempotencyKey);
  const [proposedCategoryLabel, setProposedCategoryLabel] = useState("");
  const [isProposingCategory, setIsProposingCategory] = useState(false);

  const firstError = [
    uploadMutation.error,
    deleteMutation.error,
    downloadMutation.error,
    proposeCategoryMutation.error,
  ].find((error): error is ApiRequestError => error instanceof ApiRequestError);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!title.trim() || !categoryId) return;

    uploadMutation.mutate(
      {
        title: title.trim(),
        categoryId,
        branchId: branchId === "" ? null : branchId,
        doi: doi.trim() === "" ? null : doi.trim(),
        authorAffiliation: authorAffiliation.trim() === "" ? null : authorAffiliation.trim(),
        abstractText: null,
        pdfFile: selectedFile,
        idempotencyKey: uploadIdempotencyKey,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDoi("");
          setAuthorAffiliation("");
          setSelectedFile(null);
          // Rotated only on SUCCESS: a failed attempt must be retryable under the same key, or
          // a retry after a network timeout could file the paper twice.
          setUploadIdempotencyKey(newIdempotencyKey());
        },
      },
    );
  }

  async function handleDownload(paperId: string): Promise<void> {
    const link = await downloadMutation.mutateAsync(paperId);
    // A presigned URL expires in five minutes, so it is followed immediately rather than stored.
    window.open(link.downloadUrl, "_blank", "noopener,noreferrer");
  }

  const approvedCategories = categoriesQuery.data ?? [];

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Peer-reviewable work with citations and data. Every submission is reviewed before it is
        listed publicly — yours stays visible to you in the meantime.
      </p>

      {canUploadPaper && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="font-medium">Title</span>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={300}
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
                placeholder="Senolytic dosing in human trials: a meta-review"
              />
            </label>

            <label className="space-y-1 text-xs">
              <span className="font-medium">Category</span>
              {/*
                A REAL PICKER over the approved taxonomy, which is the defect this replaces —
                the mock hardcoded one category for every upload.
              */}
              <select
                required
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
              >
                <option value="">Choose a category…</option>
                {approvedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.displayLabel}
                  </option>
                ))}
              </select>
              {/*
                The taxonomy is a TABLE, not a fixed enum, precisely so a researcher can propose a
                category the platform has not thought of. A proposal lands `pending`, so it is NOT
                immediately selectable — which the copy says, because silently offering an
                unusable option is how a form starts lying.
              */}
              {isProposingCategory ? (
                <span className="mt-1 flex gap-2">
                  <input
                    value={proposedCategoryLabel}
                    onChange={(event) => setProposedCategoryLabel(event.target.value)}
                    maxLength={80}
                    placeholder="New category name"
                    className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={proposeCategoryMutation.isPending || !proposedCategoryLabel.trim()}
                    onClick={() =>
                      proposeCategoryMutation.mutate(
                        { label: proposedCategoryLabel.trim() },
                        {
                          onSuccess: () => {
                            setProposedCategoryLabel("");
                            setIsProposingCategory(false);
                          },
                        },
                      )
                    }
                    className="shrink-0 cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs text-white disabled:opacity-60"
                  >
                    Propose
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsProposingCategory(true)}
                  className="mt-1 cursor-pointer text-[10px] text-[#00696E] underline"
                >
                  Category not listed? Propose one
                </button>
              )}
              {proposeCategoryMutation.isSuccess && (
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  Proposed. A moderator reviews it before it can be used, so pick an existing
                  category for this upload.
                </span>
              )}
            </label>

            <label className="space-y-1 text-xs">
              <span className="font-medium">Research branch (optional)</span>
              <select
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
              >
                <option value="">Not filed against a branch</option>
                {branches.map((branch) => (
                  <option key={branch.branchId} value={branch.branchId}>
                    {branch.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs">
              <span className="font-medium">DOI (optional)</span>
              <input
                value={doi}
                onChange={(event) => setDoi(event.target.value)}
                maxLength={200}
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
                placeholder="10.1234/example or a doi.org link"
              />
            </label>

            <label className="space-y-1 text-xs sm:col-span-2">
              <span className="font-medium">Your affiliation (optional)</span>
              <input
                value={authorAffiliation}
                onChange={(event) => setAuthorAffiliation(event.target.value)}
                maxLength={200}
                className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
                placeholder="University of Lagos, Gerontology Lab"
              />
              {/* Said out loud, because nothing verifies it. */}
              <span className="text-[10px] text-muted-foreground">
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
              className="w-full cursor-pointer rounded-lg border border-dashed border-[#CAC4D0] px-3 py-4 text-sm"
            />
            <span className="text-[10px] text-muted-foreground">
              Up to 25 MB. You can file a DOI now and attach the PDF later.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={uploadMutation.isPending || !title.trim() || !categoryId}
              className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00393C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadMutation.isPending ? "Submitting…" : "Submit for review"}
            </button>
            {uploadMutation.isSuccess && (
              <MutationAcceptedNotice message="Paper submitted. A moderator reviews it before it appears publicly." />
            )}
          </div>
        </form>
      )}

      {firstError && <MutationErrorNotice error={firstError.apiError} />}

      {papers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No approved papers yet. The first one sets the standard for the rest.
        </p>
      ) : (
        <ul className="space-y-3">
          {papers.map((paper) => (
            <li
              key={paper.paperId}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{paper.title}</p>
                  {paper.isUploadedByViewer && (
                    <span className="rounded-full bg-[#00696E]/10 px-2 py-0.5 text-[10px] text-[#00696E]">
                      You
                    </span>
                  )}
                  {/* A queued or rejected paper is visible only to its uploader and staff, so
                      showing the verdict here tells them something only they can see. */}
                  {paper.moderationStatus !== "approved" && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
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
                  {paper.hasFile
                    ? ` · ${formatFileSizeFromBytes(paper.fileByteSize)}`
                    : " · no file"}
                </p>
                {paper.doi && (
                  <p className="truncate text-xs text-muted-foreground">DOI: {paper.doi}</p>
                )}
                {paper.reviewerNote && paper.isUploadedByViewer && (
                  <p className="rounded-lg bg-muted p-2 text-xs">Reviewer: {paper.reviewerNote}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {paper.hasFile && canDownload && (
                  <button
                    type="button"
                    disabled={downloadMutation.isPending}
                    onClick={() => void handleDownload(paper.paperId)}
                    className="cursor-pointer rounded-full border border-[#00696E] px-3 py-1.5 text-xs font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/10 disabled:opacity-60"
                  >
                    Download
                  </button>
                )}
                {paper.isUploadedByViewer && paper.moderationStatus === "queued" && (
                  <button
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(paper.paperId)}
                    className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs transition-colors hover:bg-muted disabled:opacity-60"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
