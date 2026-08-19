// TRANSPORT: client-query — session-scoped, `POST /users/me/export` (202, no file) and
// `GET /users/me/export` (state, plus a five-minute link only once it is ready).

import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  DataExportStatusOrNoneSchema,
  DataExportStatusSchema,
  type DataExportStatus,
} from "@/lib/account/data-export.schemas";

/**
 * Asks for an archive. Answers **202** — a receipt, never a file.
 *
 * THE 202 IS INVISIBLE HERE and that is why the response is a row rather than an
 * acknowledgement: `sendJson` cannot report a status code, so `state` is what tells the UI
 * this is still building. Show `MutationAccepted`-style copy, not success copy.
 *
 * `409` means one is already in flight — poll `getDataExportStatus` rather than retrying.
 * `503` means downloads are switched off server-side; the message carries the fallback.
 */
export function requestDataExport(
  options?: RequestOptions,
): Promise<ActionResponse<DataExportStatus>> {
  return sendJson("/users/me/export", "POST", undefined, DataExportStatusSchema, options);
}

/**
 * The caller's latest export, with a fresh download link when there is one to give.
 *
 * CALL THIS TO REFRESH AN EXPIRED LINK. The URL lives five minutes and the archive lives
 * seven days, so re-reading the status mints a NEW link for the SAME finished file.
 * Re-posting would queue a second full-table walk for a file that already exists.
 */
export function getDataExportStatus(
  options?: RequestOptions,
): Promise<ActionResponse<DataExportStatus | null>> {
  return getJson("/users/me/export", DataExportStatusOrNoneSchema, options);
}
