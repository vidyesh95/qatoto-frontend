// TRANSPORT: props-only — a dumb view over the wizard draft, with direct staging uploads over
// `@/lib/blueprints/authoring.api`.
"use client";

import { useState } from "react";

import {
  LabeledEnumSelect,
  LabeledTextInput,
  RepeatableRowShell,
  RepeatableRowsShell,
} from "@/components/home/blueprints/authoring/form-fields";
import { isYoutubeLinkFieldUsable } from "@/components/home/blueprints/authoring/youtube-link-field";
import type {
  DocumentDraftRow,
  ManufacturingFileDraftRow,
  TeardownWizardStepProps,
} from "@/components/home/blueprints/teardowns/authoring/wizard-shared";
import { uploadTeardownFile } from "@/lib/blueprints/authoring.api";
import type { TeardownUploadFormat } from "@/lib/blueprints/authoring.schemas";
import {
  BLUEPRINT_DOCUMENT_KIND_LABELS,
  BLUEPRINT_DOCUMENT_KINDS,
  TEARDOWN_MANUFACTURING_FILE_KIND_LABELS,
  TEARDOWN_MANUFACTURING_FILE_KINDS,
} from "@/lib/blueprints/schemas";

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
        const { [rowId]: _, ...rest } = previous;
        return rest;
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
    try {
      const result = await uploadTeardownFile(file, "pdf");
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
    } catch {
      setRowError(rowId, "Upload failed. Please check your network and try again.");
    } finally {
      setRowUploading(rowId, false);
    }
  }

  async function handleManufacturingFileUpload(rowId: string, file: File): Promise<void> {
    setRowError(rowId, null);
    const format = inferManufacturingFileFormat(file.name);
    if (!format) {
      setRowError(rowId, "Unsupported format. Upload a STEP, STL, DXF, GLB, or PDF file.");
      return;
    }

    setRowUploading(rowId, true);
    try {
      const result = await uploadTeardownFile(file, format);
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
    } catch {
      setRowError(rowId, "Upload failed. Please check your network and try again.");
    } finally {
      setRowUploading(rowId, false);
    }
  }

  function renderDocumentRows() {
    return draft.documents.map((row, rowIndex) => {
      const isUploading = uploadingRowIds.has(row.rowId);
      const rowError = uploadErrors[row.rowId];

      return (
        <RepeatableRowShell
          key={row.rowId}
          rowLabel={`Document ${rowIndex + 1}`}
          onRemoveRow={() => removeDocumentRow(row.rowId)}
        >
          <LabeledTextInput
            label="Name"
            value={row.title}
            onValueChange={(title) => updateDocumentRow(row.rowId, { title })}
            placeholder="Control board schematic"
          />
          <LabeledEnumSelect
            label="Kind"
            value={row.kind}
            options={BLUEPRINT_DOCUMENT_KINDS}
            optionLabels={BLUEPRINT_DOCUMENT_KIND_LABELS}
            onValueChange={(kind) =>
              kind === "" ? undefined : updateDocumentRow(row.rowId, { kind })
            }
          />
          <div className="sm:col-span-2">
            {row.source === "uploaded" && row.uploadId ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <div className="min-w-0 pr-3">
                  <p className="truncate text-xs font-medium text-foreground">
                    Uploaded: {row.fileName ?? row.uploadId}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Staged securely on Qatoto</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateDocumentRow(row.rowId, {
                      source: "pasted_link",
                      uploadId: undefined,
                      fileName: undefined,
                      url: "",
                    })
                  }
                  className="shrink-0 text-xs text-[#00696E] hover:underline"
                >
                  Change to link
                </button>
              </div>
            ) : (
              <div>
                <LabeledTextInput
                  label="Link"
                  inputType="url"
                  value={row.url ?? ""}
                  onValueChange={(url) => updateDocumentRow(row.rowId, { url })}
                  placeholder="https://…"
                />
                <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>or upload a PDF (up to 50 MB)</span>
                  <label className="cursor-pointer font-medium text-[#00696E] hover:underline">
                    {isUploading ? "Uploading…" : "Upload PDF"}
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="sr-only"
                      disabled={isUploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleDocumentUpload(row.rowId, file);
                      }}
                    />
                  </label>
                </div>
                {rowError ? <p className="mt-1 text-xs text-destructive">{rowError}</p> : null}
              </div>
            )}
          </div>
        </RepeatableRowShell>
      );
    });
  }

  function renderManufacturingFileRows() {
    return draft.manufacturingFiles.map((row, rowIndex) => {
      const isUploading = uploadingRowIds.has(row.rowId);
      const rowError = uploadErrors[row.rowId];

      return (
        <RepeatableRowShell
          key={row.rowId}
          rowLabel={`File ${rowIndex + 1}`}
          onRemoveRow={() => removeManufacturingFileRow(row.rowId)}
        >
          <LabeledTextInput
            label="Name"
            value={row.title}
            onValueChange={(title) => updateManufacturingFileRow(row.rowId, { title })}
            placeholder="Enclosure, STEP"
          />
          <LabeledEnumSelect
            label="Kind"
            value={row.kind}
            options={TEARDOWN_MANUFACTURING_FILE_KINDS}
            optionLabels={TEARDOWN_MANUFACTURING_FILE_KIND_LABELS}
            onValueChange={(kind) =>
              kind === "" ? undefined : updateManufacturingFileRow(row.rowId, { kind })
            }
          />
          <div className="sm:col-span-2">
            {row.source === "uploaded" && row.uploadId ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <div className="min-w-0 pr-3">
                  <p className="truncate text-xs font-medium text-foreground">
                    Uploaded: {row.fileName ?? row.uploadId}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Staged securely on Qatoto</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateManufacturingFileRow(row.rowId, {
                      source: "pasted_link",
                      uploadId: undefined,
                      fileName: undefined,
                      url: "",
                    })
                  }
                  className="shrink-0 text-xs text-[#00696E] hover:underline"
                >
                  Change to link
                </button>
              </div>
            ) : (
              <div>
                <LabeledTextInput
                  label="Link"
                  inputType="url"
                  value={row.url ?? ""}
                  onValueChange={(url) => updateManufacturingFileRow(row.rowId, { url })}
                  placeholder="https://…"
                />
                <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>or upload CAD/3D model (STEP, STL, DXF, GLB, PDF)</span>
                  <label className="cursor-pointer font-medium text-[#00696E] hover:underline">
                    {isUploading ? "Uploading…" : "Upload file"}
                    <input
                      type="file"
                      accept=".step,.stp,.stl,.dxf,.glb,.pdf"
                      className="sr-only"
                      disabled={isUploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleManufacturingFileUpload(row.rowId, file);
                      }}
                    />
                  </label>
                </div>
                {rowError ? <p className="mt-1 text-xs text-destructive">{rowError}</p> : null}
              </div>
            )}
          </div>
        </RepeatableRowShell>
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Direct uploads and external links</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
          You can stage CAD models, 3D meshes, schematics and PDFs directly on Qatoto (up to 50 MB
          each), or paste a link to wherever they already live.
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
