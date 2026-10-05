// TRANSPORT: props-only — a dumb view over the wizard draft, with direct staging uploads over
// `@/lib/blueprints/authoring.api`.
"use client";

import { useState } from "react";

import {
  LabeledTextInput,
  RepeatableRowsShell,
} from "@/components/home/blueprints/authoring/form-fields";
import { isYoutubeLinkFieldUsable } from "@/components/home/blueprints/authoring/youtube-link-field";
import {
  MediaDocumentRowItem,
  MediaManufacturingFileRowItem,
} from "@/components/home/blueprints/teardowns/authoring/media-file-row-items";
import type {
  DocumentDraftRow,
  ManufacturingFileDraftRow,
  TeardownWizardStepProps,
} from "@/components/home/blueprints/teardowns/authoring/wizard-shared";
import { uploadTeardownFile } from "@/lib/blueprints/authoring.api";
import type { TeardownUploadFormat } from "@/lib/blueprints/authoring.schemas";

/**
 * A new empty row, per list. `crypto.randomUUID()` for a stable React key — never sent.
 */
function newDocumentDraftRow(): DocumentDraftRow {
  return {
    rowId: crypto.randomUUID(),
    kind: "schematic",
    title: "",
    source: "pasted_link",
    url: "",
  };
}

function newManufacturingFileDraftRow(): ManufacturingFileDraftRow {
  return { rowId: crypto.randomUUID(), kind: "step", title: "", source: "pasted_link", url: "" };
}

function inferManufacturingFileFormat(fileName: string): TeardownUploadFormat | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "pdf";
  if (extension === "step" || extension === "stp") return "step";
  if (extension === "stl") return "stl";
  if (extension === "dxf") return "dxf";
  if (extension === "glb") return "glb";
  return null;
}

export default function MediaFilesStep({ draft, onDraftChange }: TeardownWizardStepProps) {
  const [uploadingRowIds, setUploadingRowIds] = useState<ReadonlySet<string>>(new Set());
  const [uploadErrors, setUploadErrors] = useState<Readonly<Record<string, string>>>({});

  const isWalkthroughUsable = isYoutubeLinkFieldUsable(draft.walkthroughYoutubeUrl);

  function setRowUploading(rowId: string, isUploading: boolean): void {
    setUploadingRowIds((previous) => {
      const next = new Set(previous);
      if (isUploading) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  }

  function setRowError(rowId: string, error: string | null): void {
    setUploadErrors((previous) => {
      if (error === null) {
        return Object.fromEntries(
          Object.entries(previous).filter(([errorRowId]) => errorRowId !== rowId),
        );
      }
      return { ...previous, [rowId]: error };
    });
  }

  function updateDocumentRow(rowId: string, patch: Partial<DocumentDraftRow>): void {
    onDraftChange({
      documents: draft.documents.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)),
    });
  }

  function updateManufacturingFileRow(
    rowId: string,
    patch: Partial<ManufacturingFileDraftRow>,
  ): void {
    onDraftChange({
      manufacturingFiles: draft.manufacturingFiles.map((row) =>
        row.rowId === rowId ? { ...row, ...patch } : row,
      ),
    });
  }

  function removeDocumentRow(rowId: string): void {
    setRowError(rowId, null);
    onDraftChange({ documents: draft.documents.filter((row) => row.rowId !== rowId) });
  }

  function removeManufacturingFileRow(rowId: string): void {
    setRowError(rowId, null);
    onDraftChange({
      manufacturingFiles: draft.manufacturingFiles.filter((row) => row.rowId !== rowId),
    });
  }

  async function handleDocumentUpload(rowId: string, file: File): Promise<void> {
    setRowError(rowId, null);
    setRowUploading(rowId, true);
    const result = await uploadTeardownFile(file, "pdf").catch(() => null);
    setRowUploading(rowId, false);
    if (result === null) {
      setRowError(rowId, "Upload failed. Please check your network and try again.");
      return;
    }
    if (!result.success) {
      setRowError(rowId, result.error.message);
      return;
    }
    const existingRow = draft.documents.find((row) => row.rowId === rowId);
    updateDocumentRow(rowId, {
      source: "uploaded",
      uploadId: result.data.uploadId,
      fileName: result.data.originalFileName,
      title: existingRow?.title.trim() ? existingRow.title : result.data.originalFileName,
    });
  }

  async function handleManufacturingFileUpload(rowId: string, file: File): Promise<void> {
    setRowError(rowId, null);
    const format = inferManufacturingFileFormat(file.name);
    if (!format) {
      setRowError(rowId, "Unsupported format. Upload a STEP, STL, DXF, GLB, or PDF file.");
      return;
    }

    setRowUploading(rowId, true);
    const result = await uploadTeardownFile(file, format).catch(() => null);
    setRowUploading(rowId, false);
    if (result === null) {
      setRowError(rowId, "Upload failed. Please check your network and try again.");
      return;
    }
    if (!result.success) {
      setRowError(rowId, result.error.message);
      return;
    }
    const existingRow = draft.manufacturingFiles.find((row) => row.rowId === rowId);
    updateManufacturingFileRow(rowId, {
      source: "uploaded",
      uploadId: result.data.uploadId,
      fileName: result.data.originalFileName,
      title: existingRow?.title.trim() ? existingRow.title : result.data.originalFileName,
    });
  }

  function renderDocumentRows() {
    return draft.documents.map((row, rowIndex) => (
      <MediaDocumentRowItem
        key={row.rowId}
        row={row}
        rowIndex={rowIndex}
        isUploading={uploadingRowIds.has(row.rowId)}
        rowError={uploadErrors[row.rowId]}
        onRemove={() => removeDocumentRow(row.rowId)}
        onUpdate={(patch) => updateDocumentRow(row.rowId, patch)}
        onUpload={(file) => void handleDocumentUpload(row.rowId, file)}
      />
    ));
  }

  function renderManufacturingFileRows() {
    return draft.manufacturingFiles.map((row, rowIndex) => (
      <MediaManufacturingFileRowItem
        key={row.rowId}
        row={row}
        rowIndex={rowIndex}
        isUploading={uploadingRowIds.has(row.rowId)}
        rowError={uploadErrors[row.rowId]}
        onRemove={() => removeManufacturingFileRow(row.rowId)}
        onUpdate={(patch) => updateManufacturingFileRow(row.rowId, patch)}
        onUpload={(file) => void handleManufacturingFileUpload(row.rowId, file)}
      />
    ));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Direct uploads and external links</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
          You can stage CAD models, 3D meshes and schematics directly on Qatoto (up to 50 MB each)
          and PDFs (up to 25 MB each), or paste a link to wherever they already live.
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
        onAddRow={() => onDraftChange({ documents: [...draft.documents, newDocumentDraftRow()] })}
      >
        {renderDocumentRows()}
      </RepeatableRowsShell>

      <RepeatableRowsShell
        heading="Fabrication files"
        description="The files somebody would send to a factory. These are the ones a reader may take away, so be sure they are yours to share."
        emptyMessage="No fabrication files. A teardown without them is still worth publishing; the measurements are the point."
        addLabel="Add a fabrication file"
        rowCount={draft.manufacturingFiles.length}
        onAddRow={() =>
          onDraftChange({
            manufacturingFiles: [...draft.manufacturingFiles, newManufacturingFileDraftRow()],
          })
        }
      >
        {renderManufacturingFileRows()}
      </RepeatableRowsShell>
    </div>
  );
}
