import Image from "next/image";

import type { TeamMember, WorkshopFile, WorkshopFileKind } from "@/types/research-and-development";

// Lettered squares instead of per-kind icon assets — no new binaries this phase.
const FILE_KIND_GLYPHS: Record<WorkshopFileKind, { letter: string; className: string }> = {
  document: { letter: "D", className: "bg-[#D6E3FF] text-[#191C1C]" },
  spreadsheet: { letter: "S", className: "bg-[#00696E]/10 text-[#00696E]" },
  "cad-model": { letter: "C", className: "bg-muted text-foreground" },
  image: { letter: "I", className: "bg-[#8A6116]/10 text-[#8A6116]" },
  video: { letter: "V", className: "bg-[#BA1A1A]/10 text-[#BA1A1A]" },
};

type WorkshopFilesProps = {
  files: WorkshopFile[];
  teamMembers: TeamMember[];
};

// Shared-files panel: static list of the project's working documents with
// uploader attribution. Display-only mock — storage is backend-owned later.
export default function WorkshopFiles({ files, teamMembers }: WorkshopFilesProps) {
  const findUploader = (uploadedByMemberId: string) =>
    teamMembers.find((teamMember) => teamMember.id === uploadedByMemberId);

  return (
    <div className="px-4 lg:px-6">
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
              {uploader && (
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
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
