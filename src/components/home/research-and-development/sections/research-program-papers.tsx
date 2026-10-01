// TRANSPORT: client-query — the upload form and the download control both call hooks in
// `@/hooks/rnd/research-programs`. The first page of papers arrives as props from the server page.
"use client";

import {
  ResearchPaperListItem,
  ResearchPaperUploadForm,
} from "@/components/home/research-and-development/sections/research-paper-components";
import {
  useCreatePaperDownloadLinkMutation,
  useDeleteProgramPaperMutation,
} from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";
import type { ResearchBranch, ResearchPaper } from "@/lib/rnd/research-programs.schemas";

import { MutationErrorNotice } from "./mutation-feedback";

type ResearchProgramPapersProps = {
  readonly programSlug: string;
  readonly papers: ResearchPaper[];
  readonly branches: ResearchBranch[];
  readonly canUploadPaper: boolean;
  readonly canDownload: boolean;
};

export default function ResearchProgramPapers({
  programSlug,
  papers,
  branches,
  canUploadPaper,
  canDownload,
}: ResearchProgramPapersProps) {
  const deleteMutation = useDeleteProgramPaperMutation(programSlug);
  const downloadMutation = useCreatePaperDownloadLinkMutation(programSlug);

  const firstError = [deleteMutation.error, downloadMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  async function handleDownload(paperId: string): Promise<void> {
    const link = await downloadMutation.mutateAsync(paperId);
    window.open(link.downloadUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Peer-reviewable work with citations and data. Every submission is reviewed before it is
        listed publicly — yours stays visible to you in the meantime.
      </p>

      {canUploadPaper && (
        <ResearchPaperUploadForm
          programSlug={programSlug}
          branches={branches}
          canUploadPaper={canUploadPaper}
        />
      )}

      {firstError && <MutationErrorNotice error={firstError.apiError} />}

      {papers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No approved papers yet. The first one sets the standard for the rest.
        </p>
      ) : (
        <ul className="space-y-3">
          {papers.map((paper) => (
            <ResearchPaperListItem
              key={paper.paperId}
              paper={paper}
              canDownload={canDownload}
              onDownload={(id) => void handleDownload(id)}
              isDownloading={downloadMutation.isPending}
              onWithdraw={(id) => deleteMutation.mutate(id)}
              isWithdrawing={deleteMutation.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
