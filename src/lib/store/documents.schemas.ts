// TRANSPORT: props-only — the contract for trade attachments. No network.
//
// A30/A38. One encrypted document store backs BOTH sides of a quote: the buyer attaches drawings
// and specs to an RFQ, the provider attaches them to a quote revision. The objects are the same
// objects, so they parse through one vocabulary rather than two.

import { z } from "zod";

/**
 * One of the caller's own uploaded attachments.
 *
 * ⚠️ `fileName` IS NULLABLE, and null is not "unnamed". Names are ENCRYPTED at rest, and null means
 * the stored name could not be decrypted — the same fallback the download takes. Render a neutral
 * label for it; never fall back to the id, because an opaque uuid shown as a file name is worse
 * than showing none.
 *
 * NO BYTES, NO STORAGE KEY, NO CIPHERTEXT. Metadata only, deliberately.
 */
export const TradeDocumentSchema = z
  .object({
    documentId: z.string(),
    mediaType: z.string(),
    fileByteSize: z.number().int(),
    fileName: z.string().nullable(),
    createdAt: z.string(),
  })
  .strip();

export type TradeDocument = z.infer<typeof TradeDocumentSchema>;

/**
 * `POST /commerce/documents` — the upload receipt.
 *
 * ⚠️ IT ANSWERS **202, NOT 201**, and that is the whole contract. The bytes are stored but the
 * document lands `pending_scan`: a virus scan runs asynchronously, and BOTH attach paths refuse
 * anything that is not `available`. A client that treats this as "done" and attaches the id
 * immediately gets a confusing rejection — which is exactly why the backend does not say 201.
 *
 * The picker list is the readiness signal: `GET /commerce/documents` returns only `available`
 * documents, so a freshly uploaded file appears there once it has been scanned and not before.
 */
export const UploadedTradeDocumentSchema = z.object({ documentId: z.string() }).strip();

export type UploadedTradeDocument = z.infer<typeof UploadedTradeDocumentSchema>;

/** What the backend accepts. Mirrored so the picker can refuse the obvious cases before a round trip. */
export const TRADE_DOCUMENT_MEDIA_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_TRADE_DOCUMENT_BYTES = 8 * 1024 * 1024;
