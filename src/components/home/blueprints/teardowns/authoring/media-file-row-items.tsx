"use client";

import {
  LabeledEnumSelect,
  LabeledTextInput,
  RepeatableRowShell,
} from "@/components/home/blueprints/authoring/form-fields";
import type {
  DocumentDraftRow,
  ManufacturingFileDraftRow,
} from "@/components/home/blueprints/teardowns/authoring/wizard-shared";
import {
  BLUEPRINT_DOCUMENT_KIND_LABELS,
  BLUEPRINT_DOCUMENT_KINDS,
  TEARDOWN_MANUFACTURING_FILE_KIND_LABELS,
  TEARDOWN_MANUFACTURING_FILE_KINDS,
} from "@/lib/blueprints/schemas";

export function MediaDocumentRowItem({
  row,
  rowIndex,
  isUploading,
  rowError,
  onRemove,
  onUpdate,
  onUpload,
}: {
  readonly row: DocumentDraftRow;
  readonly rowIndex: number;
  readonly isUploading: boolean;
  readonly rowError: string | undefined;
  readonly onRemove: () => void;
  readonly onUpdate: (patch: Partial<DocumentDraftRow>) => void;
  readonly onUpload: (file: File) => void;
}) {
  return (
    <RepeatableRowShell rowLabel={`Document ${rowIndex + 1}`} onRemoveRow={onRemove}>
      <LabeledTextInput
        label="Name"
        value={row.title}
        onValueChange={(title) => onUpdate({ title })}
        placeholder="Control board schematic"
      />
      <LabeledEnumSelect
        label="Kind"
        value={row.kind}
        options={BLUEPRINT_DOCUMENT_KINDS}
        optionLabels={BLUEPRINT_DOCUMENT_KIND_LABELS}
        onValueChange={(kind) => (kind === "" ? undefined : onUpdate({ kind }))}
      />
      <div className="sm:col-span-2">
        {row.source === "uploaded" && row.uploadId ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <div className="min-w-0 pr-3">
              <p className="truncate text-xs font-medium text-foreground">
                Uploaded: {row.fileName ?? row.uploadId}
              </p>
              <p className="text-xs text-muted-foreground">Staged securely on Qatoto</p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdate({
                  source: "pasted_link",
                  uploadId: undefined,
                  fileName: undefined,
                  url: "",
                })
              }
              className="shrink-0 text-xs text-primary-imprint hover:underline"
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
              onValueChange={(url) => onUpdate({ url })}
              placeholder="https://…"
            />
            <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>or upload a PDF (up to 50 MB)</span>
              <label className="cursor-pointer font-medium text-primary-imprint hover:underline">
                {isUploading ? "Uploading…" : "Upload PDF"}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  disabled={isUploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUpload(file);
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
}

export function MediaManufacturingFileRowItem({
  row,
  rowIndex,
  isUploading,
  rowError,
  onRemove,
  onUpdate,
  onUpload,
}: {
  readonly row: ManufacturingFileDraftRow;
  readonly rowIndex: number;
  readonly isUploading: boolean;
  readonly rowError: string | undefined;
  readonly onRemove: () => void;
  readonly onUpdate: (patch: Partial<ManufacturingFileDraftRow>) => void;
  readonly onUpload: (file: File) => void;
}) {
  return (
    <RepeatableRowShell rowLabel={`File ${rowIndex + 1}`} onRemoveRow={onRemove}>
      <LabeledTextInput
        label="Name"
        value={row.title}
        onValueChange={(title) => onUpdate({ title })}
        placeholder="Enclosure, STEP"
      />
      <LabeledEnumSelect
        label="Kind"
        value={row.kind}
        options={TEARDOWN_MANUFACTURING_FILE_KINDS}
        optionLabels={TEARDOWN_MANUFACTURING_FILE_KIND_LABELS}
        onValueChange={(kind) => (kind === "" ? undefined : onUpdate({ kind }))}
      />
      <div className="sm:col-span-2">
        {row.source === "uploaded" && row.uploadId ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <div className="min-w-0 pr-3">
              <p className="truncate text-xs font-medium text-foreground">
                Uploaded: {row.fileName ?? row.uploadId}
              </p>
              <p className="text-xs text-muted-foreground">Staged securely on Qatoto</p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdate({
                  source: "pasted_link",
                  uploadId: undefined,
                  fileName: undefined,
                  url: "",
                })
              }
              className="shrink-0 text-xs text-primary-imprint hover:underline"
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
              onValueChange={(url) => onUpdate({ url })}
              placeholder="https://…"
            />
            <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>or upload CAD/3D model (STEP, STL, DXF, GLB, PDF)</span>
              <label className="cursor-pointer font-medium text-primary-imprint hover:underline">
                {isUploading ? "Uploading…" : "Upload file"}
                <input
                  type="file"
                  accept=".step,.stp,.stl,.dxf,.glb,.pdf"
                  className="sr-only"
                  disabled={isUploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUpload(file);
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
}
