// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. Every workshop route is `requireAuth` plus membership, so a server
// component MUST forward the session cookie through `@/lib/server-http`'s
// `callerRequestOptions()` or every call is a 401.

import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  WorkshopBoardColumnSchema,
  WorkshopChatMessageSchema,
  WorkshopChatReadStateSchema,
  WorkshopFileSchema,
  WorkshopSnapshotSchema,
  WorkshopTaskSchema,
  type WorkshopBoardColumn,
  type WorkshopChatMessage,
  type WorkshopChatReadState,
  type WorkshopFile,
  type WorkshopFileKind,
  type WorkshopSnapshot,
  type WorkshopTask,
  type WorkshopTaskPriority,
} from "@/lib/rnd/workshop.schemas";

/**
 * The whole workshop in ONE request — board, files, recent chat and read state.
 *
 * The backend composes it from four concurrent service calls, which is why the page
 * does not fan out to `/workshop/board`, `/workshop/files` and `/workshop/chat`
 * separately: three round trips for a payload the server already assembles.
 *
 * Member-only at role `contributor`. A non-member gets **404, not 403** — lift the
 * result through `toMemberScopedListViewState`-style handling only after the project's
 * public detail read has succeeded, which is what makes "members only" a safe thing to
 * say here.
 */
export function getProjectWorkshop(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopSnapshot>> {
  return getJson(`/research-projects/${projectSlug}/workshop`, WorkshopSnapshotSchema, options);
}

// --- Writes -------------------------------------------------------------------
//
// The five controls phase 3 DELETED rather than faked. Every one of them was a `useState`
// that posted nowhere, and a send button that convincingly sends is the most misleading
// control a page can carry.

/** Add a column. `orderIndex` is server-derived — the board owns its own ordering. */
export function createWorkshopColumn(
  projectSlug: string,
  input: { readonly title: string },
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopBoardColumn>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/columns`,
    "POST",
    input,
    WorkshopBoardColumnSchema,
    options,
  );
}

export function renameWorkshopColumn(
  projectSlug: string,
  columnId: string,
  input: { readonly title: string },
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopBoardColumn>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/columns/${columnId}`,
    "PATCH",
    input,
    WorkshopBoardColumnSchema,
    options,
  );
}

export function deleteWorkshopColumn(
  projectSlug: string,
  columnId: string,
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopBoardColumn>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/columns/${columnId}`,
    "DELETE",
    undefined,
    WorkshopBoardColumnSchema,
    options,
  );
}

/**
 * Reorder the columns.
 *
 * THE WHOLE ORDER IS SENT, not a delta. A per-column index patch races itself the moment
 * two members drag at once and leaves the board with two columns claiming position 2;
 * one ordered list per request cannot.
 */
export function reorderWorkshopColumns(
  projectSlug: string,
  input: { readonly columnIds: readonly string[] },
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopBoardColumn[]>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/columns/reorder`,
    "POST",
    input,
    WorkshopBoardColumnSchema.array(),
    options,
  );
}

export interface WorkshopTaskInput {
  readonly columnId: string;
  readonly title: string;
  readonly description?: string;
  readonly priority?: WorkshopTaskPriority;
  readonly assigneeUserId?: string;
  readonly dueDate?: string;
}

export function createWorkshopTask(
  projectSlug: string,
  input: WorkshopTaskInput,
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopTask>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/tasks`,
    "POST",
    input,
    WorkshopTaskSchema,
    options,
  );
}

export function updateWorkshopTask(
  projectSlug: string,
  taskId: string,
  input: Partial<Omit<WorkshopTaskInput, "columnId">>,
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopTask>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/tasks/${taskId}`,
    "PATCH",
    input,
    WorkshopTaskSchema,
    options,
  );
}

/**
 * Move a task.
 *
 * ITS OWN ENDPOINT, not a `columnId` on the edit: a move carries a POSITION as well as a
 * column, and the server renumbers the neighbours in the same transaction. Editing the
 * column alone would leave the card in a column at whatever index it had in the old one.
 */
export function moveWorkshopTask(
  projectSlug: string,
  taskId: string,
  input: { readonly columnId: string; readonly position: number },
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopTask>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/tasks/${taskId}/move`,
    "POST",
    input,
    WorkshopTaskSchema,
    options,
  );
}

export function deleteWorkshopTask(
  projectSlug: string,
  taskId: string,
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopTask>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/tasks/${taskId}`,
    "DELETE",
    undefined,
    WorkshopTaskSchema,
    options,
  );
}

/**
 * Link a file. **A LINK, NOT AN UPLOAD** — there is no byte path here at all.
 *
 * `sizeBytes` stays NULL because nobody measured it: the file lives on whatever service
 * the team already uses, and Qatoto stores a URL. Object storage is deferred (Appendix
 * A2), so a UI offering a file picker would be offering something that does not exist.
 */
export function linkWorkshopFile(
  projectSlug: string,
  input: {
    readonly fileName: string;
    readonly fileKind: WorkshopFileKind;
    readonly externalUrl: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopFile>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/files`,
    "POST",
    input,
    WorkshopFileSchema,
    options,
  );
}

/** Rename or re-kind. THE URL IS IMMUTABLE — a changed target is a new file, not an edit. */
export function updateWorkshopFile(
  projectSlug: string,
  fileId: string,
  input: { readonly fileName?: string; readonly fileKind?: WorkshopFileKind },
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopFile>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/files/${fileId}`,
    "PATCH",
    input,
    WorkshopFileSchema,
    options,
  );
}

export function deleteWorkshopFile(
  projectSlug: string,
  fileId: string,
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopFile>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/files/${fileId}`,
    "DELETE",
    undefined,
    WorkshopFileSchema,
    options,
  );
}

/**
 * Send a chat message.
 *
 * POLLED, NOT STREAMED. `GET …/workshop/chat/stream` is deferred on the 20-connection
 * Postgres budget rather than on cost, and the keyset cursor is the seam that makes SSE a
 * later insert instead of a rewrite. Nothing here may present chat as real-time.
 */
export function sendWorkshopChatMessage(
  projectSlug: string,
  input: { readonly bodyText: string },
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopChatMessage>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/chat`,
    "POST",
    input,
    WorkshopChatMessageSchema,
    options,
  );
}

export function updateWorkshopChatMessage(
  projectSlug: string,
  messageId: string,
  input: { readonly bodyText: string },
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopChatMessage>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/chat/${messageId}`,
    "PATCH",
    input,
    WorkshopChatMessageSchema,
    options,
  );
}

export function deleteWorkshopChatMessage(
  projectSlug: string,
  messageId: string,
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopChatMessage>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/chat/${messageId}`,
    "DELETE",
    undefined,
    WorkshopChatMessageSchema,
    options,
  );
}

/**
 * Mark chat read up to a message. The caller's own state; nobody else's moves.
 *
 * **THE FIELD IS `throughMessageId`, NOT `lastReadMessageId`.** `MarkChatReadSchema` is
 * `.strict()`, so the wrong name is a `422` rather than an ignored key — and it is the
 * same name the read state comes back with, which is the convention the whole wire
 * follows: one spelling per concept, in both directions.
 */
export function markWorkshopChatRead(
  projectSlug: string,
  input: { readonly throughMessageId: string },
  options?: RequestOptions,
): Promise<ActionResponse<WorkshopChatReadState>> {
  return sendJson(
    `/research-projects/${projectSlug}/workshop/chat/read`,
    "POST",
    input,
    WorkshopChatReadStateSchema,
    options,
  );
}
