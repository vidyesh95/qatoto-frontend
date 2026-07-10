"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";

import { IMMORTAL_PAPER_CATEGORY_LABELS } from "@/lib/project-immortal-mocks";
import type {
  ImmortalPaperCategory,
  ImmortalResearchPaper,
} from "@/types/research-and-development";

// Lettered squares instead of per-category icon assets — no new binaries this
// phase (same convention as workshop-files.tsx).
const PAPER_CATEGORY_GLYPHS: Record<ImmortalPaperCategory, { letter: string; className: string }> =
  {
    "longevity-biology": { letter: "L", className: "bg-[#00696E]/10 text-[#00696E]" },
    "cellular-reprogramming": { letter: "C", className: "bg-[#D6E3FF] text-[#191C1C]" },
    "ai-drug-discovery": { letter: "A", className: "bg-muted text-foreground" },
    "organ-regeneration": { letter: "O", className: "bg-[#8A6116]/10 text-[#8A6116]" },
    "ethics-and-society": { letter: "E", className: "bg-[#BA1A1A]/10 text-[#BA1A1A]" },
  };

const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * 1024;

const formatFileSizeLabel = (sizeInBytes: number) =>
  sizeInBytes < BYTES_PER_MEGABYTE
    ? `${Math.max(1, Math.round(sizeInBytes / BYTES_PER_KILOBYTE))} KB`
    : `${(sizeInBytes / BYTES_PER_MEGABYTE).toFixed(1)} MB`;

type ProjectImmortalPapersProps = {
  initialPapers: ImmortalResearchPaper[];
};

// Formal paper library. Picking a file prepends a row to the local list — no
// upload happens, storage and validation are backend-owned later.
export default function ProjectImmortalPapers({ initialPapers }: ProjectImmortalPapersProps) {
  const [papers, setPapers] = useState<ImmortalResearchPaper[]>(initialPapers);

  const handlePaperFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const uploadedPaper: ImmortalResearchPaper = {
      id: `paper-uploaded-${Date.now()}`,
      title: selectedFile.name.replace(/\.[^.]+$/, ""),
      authorName: "You",
      authorAffiliation: "Qatoto netizen",
      category: "longevity-biology",
      fileSizeLabel: formatFileSizeLabel(selectedFile.size),
      uploadedDateLabel: "Just now",
      isUploadedByViewer: true,
    };

    setPapers((currentPapers) => [uploadedPaper, ...currentPapers]);
    // Reset so re-picking the same file fires change again.
    event.target.value = "";
  };

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-[#00696E]/40 bg-[#00696E]/5 p-4 transition-colors hover:bg-[#00696E]/10 has-focus-visible:ring-2 has-focus-visible:ring-[#00696E]">
        <Image
          src="/icons/upload_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
          width={24}
          height={24}
          alt=""
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Upload a formal research paper</span>
          <span className="block text-xs text-muted-foreground">
            PDF or DOC · citations expected · shared with the whole program
          </span>
        </span>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          className="sr-only"
          onChange={handlePaperFileInputChange}
        />
      </label>

      <ul className="divide-y divide-border/50 rounded-2xl border border-[#CAC4D0]/60">
        {papers.map((paper) => {
          const paperCategoryGlyph = PAPER_CATEGORY_GLYPHS[paper.category];
          return (
            <li key={paper.id} className="flex items-center gap-3 p-3">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold ${paperCategoryGlyph.className}`}
              >
                {paperCategoryGlyph.letter}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{paper.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {paper.authorName} · {paper.authorAffiliation}
                </p>
                <p className="text-xs text-muted-foreground">
                  {paper.fileSizeLabel} · Uploaded {paper.uploadedDateLabel}
                </p>
              </div>
              {paper.isUploadedByViewer && (
                <span className="shrink-0 rounded-full bg-[#00696E]/10 px-2.5 py-0.5 text-xs text-[#00696E]">
                  You
                </span>
              )}
              <span className="hidden shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs sm:inline">
                {IMMORTAL_PAPER_CATEGORY_LABELS[paper.category]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
