import { z } from "zod";

// `GET /research-projects/:projectSlug/workshop` — the board, the files, the recent
// chat and the caller's read state in ONE read.
//
// Mirrors `workshop-board.service.ts`'s `WorkshopBoardColumnView` / `WorkshopTaskView`,
// `workshop-files.service.ts`'s `WorkshopFileView` and `workshop-chat.service.ts`'s
// `WorkshopChatMessageView` / `ChatPage`.
//
// EVERY ROUTE IN THIS DOMAIN IS MEMBER-ONLY at role `contributor`, and a non-member
// gets 404 rather than 403 so a stranger cannot probe which projects exist.

// --- Enum tuples --------------------------------------------------------------

export const WORKSHOP_TASK_PRIORITIES = ["high", "medium", "low"] as const;
export const WorkshopTaskPrioritySchema = z.enum(WORKSHOP_TASK_PRIORITIES);
export type WorkshopTaskPriority = z.infer<typeof WorkshopTaskPrioritySchema>;

/**
 * `cad_model` is `snake_case` on the wire — the frontend's old `"cad-model"` was one of
 * the kebab-case union values the §4d casing rule retires. `archive` and `other` have
 * no mock ancestor: a link can point at anything, and a kind the client cannot render
 * beats a lie about a zip file being a document.
 */
export const WORKSHOP_FILE_KINDS = [
  "document",
  "spreadsheet",
  "cad_model",
  "image",
  "video",
  "archive",
  "other",
] as const;
export const WorkshopFileKindSchema = z.enum(WORKSHOP_FILE_KINDS);
export type WorkshopFileKind = z.infer<typeof WorkshopFileKindSchema>;

/** `external_link` is the only value produced today; `hosted` is the deferred path. */
export const WORKSHOP_FILE_SOURCES = ["external_link", "hosted"] as const;
export const WorkshopFileSourceSchema = z.enum(WORKSHOP_FILE_SOURCES);
export type WorkshopFileSource = z.infer<typeof WorkshopFileSourceSchema>;

// --- Row shapes ---------------------------------------------------------------

/**
 * One card on the board.
 *
 * `assigneeMemberId` is NULLABLE and resolves against the project detail read's `team`
 * keyed by `memberId` — the backend sends the id and the client looks up the name, so a
 * roster change is never stale on a card.
 *
 * `dueDate` is date-only ISO, formatted client-side; the mock's `dueDateLabel` shipped
 * the formatting from the server, which no localized client could undo. `rank` is
 * READ-ONLY on the wire: no request body accepts one.
 */
export const WorkshopTaskSchema = z
  .object({
    id: z.string(),
    columnId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    assigneeMemberId: z.string().nullable(),
    priority: WorkshopTaskPrioritySchema,
    labels: z.string().array(),
    dueDate: z.string().nullable(),
    rank: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strip();
export type WorkshopTask = z.infer<typeof WorkshopTaskSchema>;

export const WorkshopBoardColumnSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    position: z.number(),
    tasks: WorkshopTaskSchema.array(),
  })
  .strip();
export type WorkshopBoardColumn = z.infer<typeof WorkshopBoardColumnSchema>;

/**
 * One attached file — a link today, a hosted object later.
 *
 * `sizeBytes` is ALWAYS NULL for a linked file and the client must render nothing
 * rather than "0 B" or "unknown size": nobody measured it. That is why the mock's
 * `fileSizeLabel: "1.8 MB"` had to go — it asserted a measurement that does not exist.
 *
 * `externalHost` is derived server-side so a client badges the host without re-parsing
 * the URL.
 */
export const WorkshopFileSchema = z
  .object({
    id: z.string(),
    fileName: z.string(),
    fileKind: WorkshopFileKindSchema,
    source: WorkshopFileSourceSchema,
    externalUrl: z.string().nullable(),
    externalHost: z.string().nullable(),
    sizeBytes: z.number().nullable(),
    uploadedByMemberId: z.string(),
    createdAt: z.string(),
  })
  .strip();
export type WorkshopFile = z.infer<typeof WorkshopFileSchema>;

export const WorkshopChatMessageSchema = z
  .object({
    id: z.string(),
    authorMemberId: z.string(),
    messageText: z.string(),
    sentAt: z.string(),
    editedAt: z.string().nullable(),
  })
  .strip();
export type WorkshopChatMessage = z.infer<typeof WorkshopChatMessageSchema>;

/**
 * How far the caller has read the chat. Null when they have never opened it.
 */
export const WorkshopChatReadStateSchema = z
  .object({
    throughMessageId: z.string().nullable(),
    readAt: z.string(),
  })
  .strip();
export type WorkshopChatReadState = z.infer<typeof WorkshopChatReadStateSchema>;

/**
 * Everything the workshop page renders, in one payload.
 *
 * `chatMessages` is a recent OLDEST-FIRST slice, not a page object — it carries no
 * cursor. Older history comes from `GET …/workshop/chat`, whose envelope keys its array
 * `messages` and is a separate shape; that read is unwritten until a "load older"
 * control exists.
 */
export const WorkshopSnapshotSchema = z
  .object({
    board: WorkshopBoardColumnSchema.array(),
    files: WorkshopFileSchema.array(),
    chatMessages: WorkshopChatMessageSchema.array(),
    readState: WorkshopChatReadStateSchema.nullable(),
  })
  .strip();
export type WorkshopSnapshot = z.infer<typeof WorkshopSnapshotSchema>;
