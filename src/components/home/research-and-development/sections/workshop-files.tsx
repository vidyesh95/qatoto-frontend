// TRANSPORT: props-only — client island. Holds interaction state only; all data
// arrives as props from a server parent. Fetches nothing, so it needs no
// QueryProvider. If this ever calls a hook in src/hooks/rnd, relabel it client-query.
"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";

import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import type { TeamMember, WorkshopFile, WorkshopFileKind } from "@/types/research-and-development";

// Lettered squares instead of per-kind icon assets — no new binaries this phase.
const FILE_KIND_GLYPHS: Record<WorkshopFileKind, { letter: string; className: string }> = {
  document: { letter: "D", className: "bg-[#D6E3FF] text-[#191C1C]" },
  spreadsheet: { letter: "S", className: "bg-[#00696E]/10 text-[#00696E]" },
  "cad-model": { letter: "C", className: "bg-muted text-foreground" },
  image: { letter: "I", className: "bg-[#8A6116]/10 text-[#8A6116]" },
  video: { letter: "V", className: "bg-[#BA1A1A]/10 text-[#BA1A1A]" },
};

const FILE_KIND_ORDER: WorkshopFileKind[] = [
  "document",
  "spreadsheet",
  "cad-model",
  "image",
  "video",
];

const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * 1024;

const formatFileSizeLabel = (sizeInBytes: number) =>
  sizeInBytes < BYTES_PER_MEGABYTE
    ? `${Math.max(1, Math.round(sizeInBytes / BYTES_PER_KILOBYTE))} KB`
    : `${(sizeInBytes / BYTES_PER_MEGABYTE).toFixed(1)} MB`;

type WorkshopFilesProps = {
  initialFiles: WorkshopFile[];
  teamMembers: TeamMember[];
};

// Shared files with local writes (§14.5): attach a file, or link one hosted
// elsewhere. A linked file shows no size on purpose — the backend never
// measures a Drive URL, so inventing a number here would be a lie the
// integration phase has to unpick.
export default function WorkshopFiles({ initialFiles, teamMembers }: WorkshopFilesProps) {
  const [files, setFiles] = useState<WorkshopFile[]>(initialFiles);
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [draftLinkName, setDraftLinkName] = useState("");
  const [draftLinkKind, setDraftLinkKind] = useState<WorkshopFileKind>("document");

  const findUploader = (uploadedByMemberId: string) =>
    teamMembers.find((teamMember) => teamMember.id === uploadedByMemberId);

  const handleFileInputChange = (changeEvent: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = changeEvent.target.files?.[0];
    if (!selectedFile) return;
    setFiles((currentFiles) => [
      {
        id: `local-file-${currentFiles.length}`,
        fileName: selectedFile.name,
        fileKind: "document",
        fileSizeLabel: formatFileSizeLabel(selectedFile.size),
        uploadedByMemberId: "viewer",
        uploadedDateLabel: "Just now",
      },
      ...currentFiles,
    ]);
    // Reset so re-picking the same file fires change again.
    changeEvent.target.value = "";
  };

  const handleLinkSubmit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (draftLinkName.trim() === "") return;
    setFiles((currentFiles) => [
      {
        id: `local-link-${currentFiles.length}`,
        fileName: draftLinkName.trim(),
        fileKind: draftLinkKind,
        fileSizeLabel: "Linked · size unknown",
        uploadedByMemberId: "viewer",
        uploadedDateLabel: "Just now",
      },
      ...currentFiles,
    ]);
    setDraftLinkName("");
    setIsLinkFormOpen(false);
  };

  return (
    <div className="space-y-3 px-4 lg:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-[#00696E]">
          <Image
            src="/icons/upload_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={20}
            height={20}
            alt=""
          />
          Add a file
          <input type="file" className="sr-only" onChange={handleFileInputChange} />
        </label>
        <button
          type="button"
          onClick={() => setIsLinkFormOpen((isOpen) => !isOpen)}
          className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium"
        >
          {isLinkFormOpen ? "Cancel" : "Link a hosted file"}
        </button>
      </div>

      {isLinkFormOpen && (
        <form
          onSubmit={handleLinkSubmit}
          className="flex flex-col gap-3 rounded-2xl border border-dashed border-[#CAC4D0] p-4 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={LABEL_CLASS}>File name</span>
            <input
              type="text"
              value={draftLinkName}
              onChange={(changeEvent) => setDraftLinkName(changeEvent.target.value)}
              placeholder="Thermal test results"
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={LABEL_CLASS}>Kind</span>
            <select
              value={draftLinkKind}
              onChange={(changeEvent) => {
                // Look the value up rather than asserting it — a <select> value
                // is a string, and the union is only true because we wrote the
                // options. Matching against the source list keeps that honest.
                const matchedFileKind = FILE_KIND_ORDER.find(
                  (fileKind) => fileKind === changeEvent.target.value,
                );
                if (matchedFileKind) setDraftLinkKind(matchedFileKind);
              }}
              className={INPUT_CLASS}
            >
              {FILE_KIND_ORDER.map((fileKind) => (
                <option key={fileKind} value={fileKind}>
                  {fileKind}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Add link
          </button>
        </form>
      )}

      <ul className="divide-y divide-border/50 rounded-2xl border border-[#CAC4D0]/60">
        {files.map((workshopFile) => {
          const fileKindGlyph = FILE_KIND_GLYPHS[workshopFile.fileKind];
          const uploader = findUploader(workshopFile.uploadedByMemberId);
          return (
            <li key={workshopFile.id} className="flex items-center gap-3 p-3">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold ${fileKindGlyph.className}`}
              >
                {fileKindGlyph.letter}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{workshopFile.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {workshopFile.fileSizeLabel} · Uploaded {workshopFile.uploadedDateLabel}
                </p>
              </div>
              {uploader ? (
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Image
                    src={uploader.avatarImageSrc}
                    width={20}
                    height={20}
                    alt={uploader.name}
                    className="size-5 rounded-full object-cover"
                  />
                  <span className="hidden sm:inline">{uploader.name}</span>
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-[#00696E]/10 px-2.5 py-0.5 text-xs text-[#00696E]">
                  You
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Nothing uploads — files added here live in this session only. Storage and virus scanning are
        backend-owned later.
      </p>
    </div>
  );
}
