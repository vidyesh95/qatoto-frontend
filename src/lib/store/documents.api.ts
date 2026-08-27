// TRANSPORT: client-query — the trade-attachment store behind both composers.

import {
  buildQueryString,
  getJson,
  sendForm,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import { cursorPageOf } from "@/lib/store/shared.schemas";
import { z } from "zod";

import {
  TradeDocumentSchema,
  UploadedTradeDocumentSchema,
  type UploadedTradeDocument,
} from "@/lib/store/documents.schemas";

/**
 * `POST /commerce/documents` — multipart, field `document`, 8 MB, PDF/JPEG/PNG.
 *
 * ⚠️ ANSWERS 202. The document is stored and NOT yet attachable: it is `pending_scan` until an
 * async virus scan clears it, and both attach paths refuse anything that is not `available`.
 * Do not feed the returned id straight into an attach — wait for it to appear in `listTradeDocuments`,
 * which returns only scanned documents. Treating a 202 as a result is the §29 rule this is an
 * instance of.
 *
 * Do NOT set Content-Type — the browser must add the multipart boundary.
 */
export function uploadTradeDocument(
  documentFile: File,
  options?: RequestOptions,
): Promise<ActionResponse<UploadedTradeDocument>> {
  const formData = new FormData();
  formData.append("document", documentFile);
  return sendForm("/commerce/documents", "POST", formData, UploadedTradeDocumentSchema, options);
}

/**
 * `GET /commerce/documents` — the caller's own attachments, newest first.
 *
 * ONLY `available` DOCUMENTS COME BACK. That is the readiness signal rather than a filter to
 * re-apply here: anything this returns can be attached, and anything still scanning is simply
 * absent until it is not.
 *
 * ⚠️ `cursorPageOf`, NOT `getCursorSiblingList`. This route answers the STORE page shape —
 * `{ items, page: { nextCursor, hasMore } }` — while the channel and video reads put `nextCursor`
 * beside `data`. Both typecheck against a generic wrapper and only one parses at runtime, so the
 * shape has to be read off the service rather than assumed from a neighbouring route.
 */
export function listTradeDocuments(
  filter: { readonly limit?: number; readonly cursor?: string | null } = {},
  options?: RequestOptions,
): Promise<ActionResponse<TradeDocumentPage>> {
  const queryString = buildQueryString({ limit: filter.limit, cursor: filter.cursor ?? undefined });
  return getJson(`/commerce/documents${queryString}`, TradeDocumentPageSchema, options);
}

const TradeDocumentPageSchema = cursorPageOf(TradeDocumentSchema);
export type TradeDocumentPage = z.infer<typeof TradeDocumentPageSchema>;
