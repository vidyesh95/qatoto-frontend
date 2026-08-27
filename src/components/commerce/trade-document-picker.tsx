"use client";

// TRANSPORT: client-query — uploads to `POST /commerce/documents` and lists `GET /commerce/documents`.
//
// ONE PICKER FOR BOTH SIDES OF A QUOTE. The buyer attaches drawings and specs to an RFQ; the
// provider attaches them to a quote revision. They are the same objects in the same store, so a
// second component would be two places for the 202 rule below to be got wrong.

import { useRef, useState } from "react";

import {
  useTradeDocumentsQuery,
  useUploadTradeDocumentMutation,
} from "@/hooks/store/trade-documents";
import {
  MAX_TRADE_DOCUMENT_BYTES,
  TRADE_DOCUMENT_MEDIA_TYPES,
  type TradeDocument,
} from "@/lib/store/documents.schemas";

function formatFileSizeLabel(byteSize: number): string {
  if (byteSize < 1024) return `${String(byteSize)} B`;
  if (byteSize < 1024 * 1024) return `${(byteSize / 1024).toFixed(0)} KB`;
  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}

/** Names are encrypted at rest; `null` means the stored name could not be decrypted. */
function documentLabel(document: TradeDocument): string {
  return document.fileName ?? "Untitled document";
}

/**
 * Pick which of your uploaded attachments ride on this RFQ or quote revision.
 *
 * ⚠️ AN UPLOAD IS NOT AN ATTACHMENT, AND THE COPY HAS TO SAY SO. `POST /commerce/documents` answers
 * **202**: the bytes are stored, the document is `pending_scan`, and every attach path refuses
 * anything that is not `available`. So a file uploaded here does NOT appear in the list below until
 * an async virus scan clears it, and selecting it before then is impossible rather than merely
 * discouraged. Telling somebody their file is attached when it is queued for scanning is the
 * §29 "a 202 is not a result" rule in its commerce form.
 *
 * THE LIST IS THE READINESS SIGNAL. `GET /commerce/documents` returns only scanned documents, so
 * this component filters nothing — what it can show, it can attach.
 */
export default function TradeDocumentPicker({
  selectedDocumentIds,
  onSelectionChange,
  isDisabled = false,
}: {
  readonly selectedDocumentIds: readonly string[];
  readonly onSelectionChange: (documentIds: string[]) => void;
  readonly isDisabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const [pendingScanCount, setPendingScanCount] = useState(0);

  const documentsQuery = useTradeDocumentsQuery();
  const uploadMutation = useUploadTradeDocumentMutation();

  async function handleFileChosen(changeEvent: React.ChangeEvent<HTMLInputElement>) {
    const chosenFile = changeEvent.target.files?.[0];
    changeEvent.target.value = "";
    if (!chosenFile) return;

    // FAST FEEDBACK, NOT VALIDATION. The backend re-reads the magic bytes against the decoded
    // upload; a renamed file passes both checks here and fails there, which is the correct order.
    if (!TRADE_DOCUMENT_MEDIA_TYPES.some((mediaType) => mediaType === chosenFile.type)) {
      setRejectionMessage(`${chosenFile.name} is not a PDF, JPEG or PNG.`);
      return;
    }
    if (chosenFile.size > MAX_TRADE_DOCUMENT_BYTES) {
      setRejectionMessage(`${chosenFile.name} is over 8 MB.`);
      return;
    }

    setRejectionMessage(null);
    try {
      await uploadMutation.mutateAsync(chosenFile);
      // NOT auto-selected. The id exists but is not attachable yet, so selecting it here would put
      // a value in the draft that the save is guaranteed to refuse.
      setPendingScanCount((current) => current + 1);
    } catch {
      setRejectionMessage("That file could not be uploaded. Please try again.");
    }
  }

  function toggleDocument(documentId: string) {
    onSelectionChange(
      selectedDocumentIds.includes(documentId)
        ? selectedDocumentIds.filter((selectedId) => selectedId !== documentId)
        : [...selectedDocumentIds, documentId],
    );
  }

  const availableDocuments = documentsQuery.data?.items ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={TRADE_DOCUMENT_MEDIA_TYPES.join(",")}
          onChange={(changeEvent) => void handleFileChosen(changeEvent)}
          className="hidden"
        />
        <button
          type="button"
          disabled={isDisabled || uploadMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploadMutation.isPending ? "Uploading…" : "Upload a document"}
        </button>
        <p className="mt-1 text-xs text-muted-foreground">PDF, JPEG or PNG, up to 8 MB.</p>
      </div>

      {/*
        THE 202, SAID OUT LOUD. Without this line somebody uploads a file, does not see it in the
        list, and concludes the upload failed.
      */}
      {pendingScanCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {pendingScanCount === 1 ? "1 document is" : `${String(pendingScanCount)} documents are`}{" "}
          being checked for viruses. They appear below once that finishes — reopen this step in a
          moment.
        </p>
      )}

      {rejectionMessage !== null && <p className="text-xs text-destructive">{rejectionMessage}</p>}

      {documentsQuery.isPending ? (
        <p className="text-xs text-muted-foreground">Loading your documents…</p>
      ) : documentsQuery.error !== null ? (
        <p className="text-xs text-destructive">Couldn&apos;t load your documents.</p>
      ) : availableDocuments.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No documents yet. Upload one above and it appears here once it has been checked.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {availableDocuments.map((tradeDocument) => (
            <li key={tradeDocument.documentId}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={selectedDocumentIds.includes(tradeDocument.documentId)}
                  disabled={isDisabled}
                  onChange={() => toggleDocument(tradeDocument.documentId)}
                  className="size-4 cursor-pointer"
                />
                <span>{documentLabel(tradeDocument)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSizeLabel(tradeDocument.fileByteSize)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
