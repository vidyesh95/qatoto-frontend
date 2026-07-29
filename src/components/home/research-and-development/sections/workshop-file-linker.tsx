// TRANSPORT: client-query — "use client" island calling useWorkshopFileMutation. One
// write: POST …/workshop/files.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { useWorkshopFileMutation } from "@/hooks/rnd/workshop";
import { ApiRequestError } from "@/lib/http";
import {
  WORKSHOP_FILE_KINDS,
  WorkshopFileKindSchema,
  type WorkshopFileKind,
} from "@/lib/rnd/workshop.schemas";

/**
 * Link a file — and it is a LINK, not an upload.
 *
 * THERE IS NO FILE PICKER HERE AND THERE MUST NOT BE ONE. Object storage is deferred
 * (Appendix A2), so the endpoint takes a URL and `sizeBytes` stays NULL because nobody
 * measured the bytes. A picker would offer a capability that does not exist and would
 * leave a team believing Qatoto held a copy of their CAD file.
 *
 * THE URL IS IMMUTABLE AFTER CREATION. Renaming and re-kinding are allowed; repointing is
 * not, because a changed target is a different file with the same label — which is how a
 * reviewed document quietly becomes an unreviewed one.
 */
export default function WorkshopFileLinker({ projectSlug }: { projectSlug: string }) {
  const fileMutation = useWorkshopFileMutation(projectSlug);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [fileKind, setFileKind] = useState<WorkshopFileKind>(WORKSHOP_FILE_KINDS[0]);

  const fileError =
    fileMutation.error instanceof ApiRequestError ? fileMutation.error.apiError : null;

  if (!isFormOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsFormOpen(true)}
        className="cursor-pointer rounded-full border border-[#6F7979] px-3 py-1.5 text-xs font-medium text-[#00696E]"
      >
        Link a file
      </button>
    );
  }

  return (
    <form
      className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-3"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        fileMutation.mutate(
          { action: "link", fileName, fileKind, externalUrl },
          {
            onSuccess: () => {
              setFileName("");
              setExternalUrl("");
            },
          },
        );
      }}
    >
      <input
        required
        value={fileName}
        onChange={(changeEvent) => setFileName(changeEvent.target.value)}
        placeholder="What is it called?"
        className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
      />
      <input
        required
        type="url"
        value={externalUrl}
        onChange={(changeEvent) => setExternalUrl(changeEvent.target.value)}
        placeholder="https://…"
        className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
      />
      <select
        value={fileKind}
        onChange={(changeEvent) => {
          const parsed = WorkshopFileKindSchema.safeParse(changeEvent.target.value);
          if (parsed.success) setFileKind(parsed.data);
        }}
        className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
      >
        {WORKSHOP_FILE_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {kind.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        Qatoto stores the link, not the file. The document stays wherever your team already keeps
        it, and its address cannot be changed afterwards — a new target is a new file.
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={fileMutation.isPending}
          className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {fileMutation.isPending ? "Linking…" : "Link it"}
        </button>
        <button
          type="button"
          onClick={() => setIsFormOpen(false)}
          className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium"
        >
          Cancel
        </button>
      </div>
      {fileError !== null && <MutationErrorNotice error={fileError} />}
    </form>
  );
}
