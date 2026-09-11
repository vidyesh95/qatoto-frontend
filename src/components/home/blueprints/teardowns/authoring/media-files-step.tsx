// TRANSPORT: props-only — a dumb view over the wizard draft.

import {
  LabeledEnumSelect,
  LabeledTextInput,
  RepeatableRowShell,
  RepeatableRowsShell,
} from "@/components/home/blueprints/authoring/form-fields";
import { isYoutubeLinkFieldUsable } from "@/components/home/blueprints/authoring/youtube-link-field";
import type {
  FileDraftRow,
  TeardownWizardStepProps,
} from "@/components/home/blueprints/teardowns/authoring/wizard-shared";
import {
  TEARDOWN_MANUFACTURING_FILE_KIND_LABELS,
  TEARDOWN_MANUFACTURING_FILE_KINDS,
} from "@/lib/blueprints/schemas";

/** A new empty file row. `crypto.randomUUID()` for a stable React key — never sent. */
function newFileDraftRow(): FileDraftRow {
  return { rowId: crypto.randomUUID(), kind: "step", title: "", url: "" };
}

/**
 * MEDIA AND FILES — AND EVERY ONE OF THEM IS A PASTED LINK.
 *
 * ⚠️ THERE IS NO DROPZONE HERE AND THAT IS NOT AN OVERSIGHT. Qatoto has no upload route for a
 * blueprint and no storage folder behind one, so a file picker would be a control that cannot do
 * its job — the ghost control this whole surface refuses. `create-studio-page.tsx` already takes a
 * pasted link for video for exactly this reason, and the contract already stores a URL rather than
 * bytes. The step says so out loud rather than leaving a reader hunting for the upload button.
 *
 * ⚠️ THE WALKTHROUGH IS A YOUTUBE LINK, STORED AS AN ID. `extractYoutubeVideoId` runs at the
 * boundary so a typo fails here, with a message, rather than rendering later as a blank player. The
 * duration is never asked for: neither side of the wire can measure it, and a typed runtime would
 * be a guess shown as a badge over a video of some other length.
 */
export default function MediaFilesStep({ draft, onDraftChange }: TeardownWizardStepProps) {
  const isWalkthroughUsable = isYoutubeLinkFieldUsable(draft.walkthroughYoutubeUrl);

  function updateFileRow(
    listKey: "documents" | "manufacturingFiles",
    rowId: string,
    patch: Partial<FileDraftRow>,
  ): void {
    onDraftChange({
      [listKey]: draft[listKey].map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)),
    });
  }

  function removeFileRow(listKey: "documents" | "manufacturingFiles", rowId: string): void {
    onDraftChange({ [listKey]: draft[listKey].filter((row) => row.rowId !== rowId) });
  }

  function renderFileRows(listKey: "documents" | "manufacturingFiles") {
    return draft[listKey].map((row, rowIndex) => (
      <RepeatableRowShell
        key={row.rowId}
        rowLabel={`File ${rowIndex + 1}`}
        onRemoveRow={() => removeFileRow(listKey, row.rowId)}
      >
        <LabeledTextInput
          label="Name"
          value={row.title}
          onValueChange={(title) => updateFileRow(listKey, row.rowId, { title })}
          placeholder="Enclosure, STEP"
        />
        <LabeledEnumSelect
          label="Kind"
          value={row.kind}
          options={TEARDOWN_MANUFACTURING_FILE_KINDS}
          optionLabels={TEARDOWN_MANUFACTURING_FILE_KIND_LABELS}
          onValueChange={(kind) =>
            kind === "" ? undefined : updateFileRow(listKey, row.rowId, { kind })
          }
        />
        <div className="sm:col-span-2">
          <LabeledTextInput
            label="Link"
            inputType="url"
            value={row.url}
            onValueChange={(url) => updateFileRow(listKey, row.rowId, { url })}
            placeholder="https://…"
          />
        </div>
      </RepeatableRowShell>
    ));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Files are links, for now</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
          Qatoto cannot host your files yet, so paste a link to wherever they already live. Nothing
          here is uploaded and nothing is copied; a reader follows the link you give.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-medium text-foreground">Walkthrough video</h2>
        <p className="mt-1 max-w-prose text-xs text-muted-foreground">
          Optional, and most teardowns have none. A YouTube link only: Qatoto never holds the video
          itself.
        </p>
        <div className="mt-2 max-w-xl">
          <LabeledTextInput
            label="YouTube link"
            inputType="url"
            value={draft.walkthroughYoutubeUrl}
            onValueChange={(walkthroughYoutubeUrl) => onDraftChange({ walkthroughYoutubeUrl })}
            placeholder="https://www.youtube.com/watch?v=…"
            errorMessage={
              isWalkthroughUsable
                ? null
                : "That is not a YouTube link we can read. Paste the address from the browser bar, or clear the field."
            }
          />
        </div>
      </section>

      <RepeatableRowsShell
        heading="Documents"
        description="Schematics, bills of materials, assembly guides, datasheets: anything a reader would open to follow your survey."
        emptyMessage="No documents. Most teardowns publish none, and the page simply shows no document section."
        addLabel="Add a document"
        rowCount={draft.documents.length}
        onAddRow={() => onDraftChange({ documents: [...draft.documents, newFileDraftRow()] })}
      >
        {renderFileRows("documents")}
      </RepeatableRowsShell>

      <RepeatableRowsShell
        heading="Fabrication files"
        description="The files somebody would send to a factory. These are the ones a reader may take away, so be sure they are yours to share."
        emptyMessage="No fabrication files. A teardown without them is still worth publishing; the measurements are the point."
        addLabel="Add a fabrication file"
        rowCount={draft.manufacturingFiles.length}
        onAddRow={() =>
          onDraftChange({ manufacturingFiles: [...draft.manufacturingFiles, newFileDraftRow()] })
        }
      >
        {renderFileRows("manufacturingFiles")}
      </RepeatableRowsShell>
    </div>
  );
}
