"use client";

import type { PendingProductDocument } from "@/hooks/products";
import type { SellerProductDocument } from "@/lib/products/schemas";
import {
  PRODUCT_DOCUMENT_KIND_LABELS,
  PRODUCT_DOCUMENT_KINDS,
  ProductDocumentKindSchema,
  type ProductDocumentKind,
} from "@/lib/store/products.schemas";
import { formatByteSizeLabel } from "@/lib/store/format";
import { PRODUCT_DOCUMENT_MAX_COUNT } from "../listing-editor-types";
import { StepCard } from "../listing-editor-subcomponents";

export interface DocumentsStepProps {
  readonly existingDocuments: readonly SellerProductDocument[];
  readonly removedDocumentIdsSet: ReadonlySet<string>;
  readonly pendingDocuments: readonly PendingProductDocument[];
  readonly documentCount: number;
  readonly onRemoveExistingDocument: (documentId: string) => void;
  readonly onRemovePendingDocument: (index: number) => void;
  readonly onPendingDocumentKindChange: (index: number, nextKind: ProductDocumentKind) => void;
  readonly onAddPendingDocument: (file: File) => void;
}

export function DocumentsStep({
  existingDocuments,
  removedDocumentIdsSet,
  pendingDocuments,
  documentCount,
  onRemoveExistingDocument,
  onRemovePendingDocument,
  onPendingDocumentKindChange,
  onAddPendingDocument,
}: DocumentsStepProps) {
  return (
    <StepCard
      title="Documents"
      subtitle="Datasheets, manuals and care guides buyers can download. PDF, up to 25 MB each."
    >
      <div className="flex flex-col gap-3">
        {/*
          ⚠️ NOTHING HERE SAYS THE FILE IS SCANNED, and no copy added later may. There is no
          virus scan on this path — see migration `0155`. Telling a seller their upload is
          "being checked" would be a claim about a check nobody performs.
        */}
        <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-4 text-outline-strong">
          Buyers download these straight from the listing, so upload only what you are happy to
          publish. Up to {String(PRODUCT_DOCUMENT_MAX_COUNT)} files.
        </p>

        {existingDocuments
          .filter((document) => !removedDocumentIdsSet.has(document.id))
          .map((document) => (
            <div
              key={document.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <span className="min-w-0 text-sm">
                <span className="block truncate font-medium">{document.fileName}</span>
                <span className="text-xs text-muted-foreground">
                  {PRODUCT_DOCUMENT_KIND_LABELS[document.documentKind]} ·{" "}
                  {formatByteSizeLabel(document.byteSize)}
                </span>
              </span>
              {/* Removed on SAVE, not now — the same deferral the gallery uses. */}
              <button
                type="button"
                onClick={() => onRemoveExistingDocument(document.id)}
                className="cursor-pointer text-xs text-destructive underline"
              >
                Remove
              </button>
            </div>
          ))}

        {pendingDocuments.map((pending, pendingIndex) => (
          <div
            key={`${pending.file.name}-${String(pendingIndex)}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2"
          >
            <span className="min-w-0 text-sm">
              <span className="block truncate font-medium">{pending.file.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatByteSizeLabel(pending.file.size)} · uploads when you save
              </span>
            </span>
            <div className="flex items-center gap-2">
              <select
                aria-label={`Document kind for ${pending.file.name}`}
                value={pending.documentKind}
                onChange={(changeEvent) => {
                  const parsedKind = ProductDocumentKindSchema.safeParse(changeEvent.target.value);
                  if (!parsedKind.success) return;
                  onPendingDocumentKindChange(pendingIndex, parsedKind.data);
                }}
                className="h-9 cursor-pointer rounded-lg border border-border bg-transparent px-2 text-xs"
              >
                {PRODUCT_DOCUMENT_KINDS.map((documentKind) => (
                  <option key={documentKind} value={documentKind}>
                    {PRODUCT_DOCUMENT_KIND_LABELS[documentKind]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onRemovePendingDocument(pendingIndex)}
                className="cursor-pointer text-xs text-destructive underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Add a PDF</span>
          <input
            type="file"
            accept="application/pdf"
            disabled={documentCount >= PRODUCT_DOCUMENT_MAX_COUNT}
            onChange={(changeEvent) => {
              const picked = changeEvent.target.files?.[0];
              if (picked && documentCount < PRODUCT_DOCUMENT_MAX_COUNT) {
                onAddPendingDocument(picked);
              }
              changeEvent.target.value = "";
            }}
            className="text-sm"
          />
        </label>

        <p className="text-xs text-muted-foreground">
          {String(documentCount)}/{String(PRODUCT_DOCUMENT_MAX_COUNT)} documents
        </p>
      </div>
    </StepCard>
  );
}
