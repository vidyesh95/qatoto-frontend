// TRANSPORT: props-only — presentational server component. Fetches nothing; files and
// the roster arrive as props from a parent that read GET …/workshop.
import Image from "next/image";

import { formatFileSizeFromBytes, formatIsoInstant } from "@/lib/rnd/format";
import type { ProjectTeamMember } from "@/lib/rnd/projects.schemas";
import type { WorkshopFile, WorkshopFileKind } from "@/lib/rnd/workshop.schemas";

// Lettered squares instead of per-kind icon assets — no new binaries this phase.
const FILE_KIND_GLYPHS: Record<WorkshopFileKind, { letter: string; className: string }> = {
  document: { letter: "D", className: "bg-[#D6E3FF] text-[#191C1C]" },
  spreadsheet: { letter: "S", className: "bg-[#00696E]/10 text-[#00696E]" },
  cad_model: { letter: "C", className: "bg-muted text-foreground" },
  image: { letter: "I", className: "bg-[#8A6116]/10 text-[#8A6116]" },
  video: { letter: "V", className: "bg-[#BA1A1A]/10 text-[#BA1A1A]" },
  archive: { letter: "Z", className: "bg-muted text-foreground" },
  other: { letter: "?", className: "bg-muted text-muted-foreground" },
};

type WorkshopFilesProps = {
  files: WorkshopFile[];
  teamMembers: ProjectTeamMember[];
};

/**
 * Shared files, read-only.
 *
 * THE UPLOAD BUTTON AND THE LINK FORM ARE GONE, and the component stopped being a
 * client island with them. Neither sent anything: the upload input read a local file
 * and pushed a row into `useState` labelled "Just now", which is a file that does not
 * exist anywhere. `POST …/workshop/files` is shipped and this pass is reads-only.
 *
 * A LINKED FILE SHOWS NO SIZE, and that is the wire's answer rather than a gap in it:
 * nobody measures a Drive URL, so `sizeBytes` is NULL and `formatFileSizeFromBytes`
 * renders an em dash. "0 B" or "unknown size" would both assert a measurement.
 * `externalHost` is derived server-side so the row can badge the host without
 * re-parsing the URL.
 */
export default function WorkshopFiles({ files, teamMembers }: WorkshopFilesProps) {
  function findUploader(uploadedByMemberId: string): ProjectTeamMember | undefined {
    return teamMembers.find((teamMember) => teamMember.memberId === uploadedByMemberId);
  }

  return (
    <div className="space-y-3 px-4 lg:px-6">
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
                {workshopFile.externalUrl ? (
                  <a
                    href={workshopFile.externalUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block truncate text-sm font-medium text-[#00696E] underline"
                  >
                    {workshopFile.fileName}
                  </a>
                ) : (
                  <p className="truncate text-sm font-medium">{workshopFile.fileName}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {workshopFile.externalHost ?? formatFileSizeFromBytes(workshopFile.sizeBytes)} ·
                  Added {formatIsoInstant(workshopFile.createdAt)}
                </p>
              </div>
              {uploader && (
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {uploader.avatarImageUrl && (
                    <Image
                      src={uploader.avatarImageUrl}
                      width={20}
                      height={20}
                      alt={uploader.name}
                      className="size-5 rounded-full object-cover"
                    />
                  )}
                  <span className="hidden sm:inline">{uploader.name}</span>
                </span>
              )}
            </li>
          );
        })}
        {files.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No files shared yet.</li>
        )}
      </ul>
    </div>
  );
}
