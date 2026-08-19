"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/rnd/workshop.api`.
//
// EVERY MUTATION INVALIDATES THE WHOLE WORKSHOP KEY, and that is deliberate rather than
// lazy: `GET …/workshop` returns board, files, chat and read state in ONE payload, so
// there are no finer-grained caches to invalidate. Splitting the read into four to get
// four keys would trade one round trip for three.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import {
  createWorkshopColumn,
  createWorkshopTask,
  deleteWorkshopColumn,
  deleteWorkshopFile,
  deleteWorkshopTask,
  linkWorkshopFile,
  markWorkshopChatRead,
  moveWorkshopTask,
  renameWorkshopColumn,
  reorderWorkshopColumns,
  sendWorkshopChatMessage,
  updateWorkshopChatMessage,
  deleteWorkshopChatMessage,
  updateWorkshopFile,
  updateWorkshopTask,
  type WorkshopTaskInput,
} from "@/lib/rnd/workshop.api";
import {
  createDailyLog,
  deleteDailyLog,
  getDailyLog,
  submitDailyLog,
  updateDailyLog,
} from "@/lib/rnd/daily-logs.api";
import type {
  CreateDailyLogInput,
  DailyLogAnalysisStatus,
  UpdateDailyLogInput,
} from "@/lib/rnd/daily-logs.schemas";
import type { WorkshopFileKind } from "@/lib/rnd/workshop.schemas";

/** The analysis job is a Gemini call over a transcript — slower than the claim pipeline. */
const ANALYSIS_POLL_INTERVAL_MS = 5_000;

/** Everything else is terminal, including `skipped_unconfigured`. */
const IN_FLIGHT_ANALYSIS_STATUSES: readonly DailyLogAnalysisStatus[] = ["queued", "running"];

function useWorkshopInvalidation(projectSlug: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: rndKeys.workshop(projectSlug) });
  };
}

// --- Board columns -------------------------------------------------------------

export function useWorkshopColumnMutation(projectSlug: string) {
  const invalidateWorkshop = useWorkshopInvalidation(projectSlug);
  return useMutation({
    mutationFn: async (variables: {
      action: "create" | "rename" | "delete" | "reorder";
      columnId?: string;
      title?: string;
      columnIds?: readonly string[];
    }) => {
      if (variables.action === "create") {
        return unwrap(await createWorkshopColumn(projectSlug, { title: variables.title ?? "" }));
      }
      if (variables.action === "rename") {
        if (!variables.columnId) throw new Error("Missing column id");
        return unwrap(
          await renameWorkshopColumn(projectSlug, variables.columnId, {
            title: variables.title ?? "",
          }),
        );
      }
      if (variables.action === "delete") {
        if (!variables.columnId) throw new Error("Missing column id");
        return unwrap(await deleteWorkshopColumn(projectSlug, variables.columnId));
      }
      // The WHOLE order, never a delta — two members dragging at once cannot both be
      // right about one column's index, but they can both send a complete list.
      return unwrap(
        await reorderWorkshopColumns(projectSlug, { columnIds: variables.columnIds ?? [] }),
      );
    },
    onSuccess: invalidateWorkshop,
  });
}

// --- Tasks ---------------------------------------------------------------------

export function useWorkshopTaskMutation(projectSlug: string) {
  const invalidateWorkshop = useWorkshopInvalidation(projectSlug);
  return useMutation({
    mutationFn: async (variables: {
      action: "create" | "update" | "move" | "delete";
      taskId?: string;
      input?: WorkshopTaskInput;
      patch?: Partial<Omit<WorkshopTaskInput, "columnId">>;
      move?: { columnId: string; position: number };
    }) => {
      if (variables.action === "create") {
        if (!variables.input) throw new Error("Missing task input");
        return unwrap(await createWorkshopTask(projectSlug, variables.input));
      }
      if (!variables.taskId) throw new Error("Missing task id");
      if (variables.action === "update") {
        return unwrap(
          await updateWorkshopTask(projectSlug, variables.taskId, variables.patch ?? {}),
        );
      }
      if (variables.action === "move") {
        if (!variables.move) throw new Error("Missing move target");
        return unwrap(await moveWorkshopTask(projectSlug, variables.taskId, variables.move));
      }
      return unwrap(await deleteWorkshopTask(projectSlug, variables.taskId));
    },
    onSuccess: invalidateWorkshop,
  });
}

// --- Files ---------------------------------------------------------------------

/** LINKS ONLY. There is no byte upload here and `sizeBytes` stays null by design. */
export function useWorkshopFileMutation(projectSlug: string) {
  const invalidateWorkshop = useWorkshopInvalidation(projectSlug);
  return useMutation({
    mutationFn: async (variables: {
      action: "link" | "update" | "delete";
      fileId?: string;
      fileName?: string;
      fileKind?: WorkshopFileKind;
      externalUrl?: string;
    }) => {
      if (variables.action === "link") {
        return unwrap(
          await linkWorkshopFile(projectSlug, {
            fileName: variables.fileName ?? "",
            fileKind: variables.fileKind ?? "other",
            externalUrl: variables.externalUrl ?? "",
          }),
        );
      }
      if (!variables.fileId) throw new Error("Missing file id");
      if (variables.action === "update") {
        return unwrap(
          await updateWorkshopFile(projectSlug, variables.fileId, {
            fileName: variables.fileName,
            fileKind: variables.fileKind,
          }),
        );
      }
      return unwrap(await deleteWorkshopFile(projectSlug, variables.fileId));
    },
    onSuccess: invalidateWorkshop,
  });
}

// --- Chat ----------------------------------------------------------------------

/**
 * Send a message.
 *
 * NOT OPTIMISTIC. Chat here is POLLED rather than streamed — SSE is deferred on the
 * 20-connection Postgres budget — and an optimistic bubble on a polled transport shows a
 * message as sent seconds before anyone could possibly have received it.
 */
export function useSendWorkshopChatMessageMutation(projectSlug: string) {
  const invalidateWorkshop = useWorkshopInvalidation(projectSlug);
  return useMutation({
    mutationFn: async (bodyText: string) =>
      unwrap(await sendWorkshopChatMessage(projectSlug, { bodyText })),
    onSuccess: invalidateWorkshop,
  });
}

/**
 * Edit or withdraw one message.
 *
 * ONE HOOK WITH AN `action` DISCRIMINANT, matching `useWorkshopFileMutation` above: both
 * verbs act on the same message, both invalidate the same key, and which of them is legal
 * is the server's decision rather than this hook's.
 *
 * NOT OPTIMISTIC, for the same reason sending is not. Chat here is POLLED, not streamed, so
 * an optimistically edited bubble would show the team a correction seconds before anyone
 * could have received it — and an optimistic DELETE is worse, because it would show the
 * author their message gone from a transcript everyone else can still read.
 *
 * THE REQUEST FIELD IS `bodyText` AND THE RESPONSE FIELD IS `messageText`. That asymmetry is
 * already true of `sendWorkshopChatMessage`; the wrapper matches the wire, and this hook
 * matches the wrapper. Do not "fix" it here.
 *
 * INVALIDATES THE WHOLE WORKSHOP KEY, not just the chat key: the transcript arrives inside
 * the workshop snapshot the server parent reads, so invalidating chat alone would leave the
 * edited bubble on screen.
 */
export function useWorkshopChatMessageMutation(projectSlug: string) {
  const invalidateWorkshop = useWorkshopInvalidation(projectSlug);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      action: "update" | "delete";
      messageId: string;
      bodyText?: string;
    }) => {
      if (variables.action === "update") {
        return unwrap(
          await updateWorkshopChatMessage(projectSlug, variables.messageId, {
            bodyText: variables.bodyText ?? "",
          }),
        );
      }
      return unwrap(await deleteWorkshopChatMessage(projectSlug, variables.messageId));
    },
    onSuccess: () => {
      invalidateWorkshop();
      void queryClient.invalidateQueries({ queryKey: rndKeys.workshopChat(projectSlug) });
    },
  });
}

/**
 * The caller's own read marker. Nobody else's moves.
 *
 * DOES NOT INVALIDATE THE WORKSHOP QUERY, unlike every other mutation here. The read
 * marker is fired from an effect when the transcript renders, and invalidating would
 * re-render the component that fired it — a request loop with nothing to find. The only
 * thing it changes is the caller's own unread count, which the next natural read picks up.
 */
export function useMarkWorkshopChatReadMutation(projectSlug: string) {
  return useMutation({
    mutationFn: async (throughMessageId: string) =>
      unwrap(await markWorkshopChatRead(projectSlug, { throughMessageId })),
  });
}

// --- Daily logs ------------------------------------------------------------------

/**
 * One log with its analysis, polled while the analysis job is still running.
 *
 * The poll terminates on `succeeded`, `failed` and `skipped_unconfigured` alike — the
 * third is an OPERATOR fact ("no model key in this environment"), not a failure of the
 * log, and polling past it would wait forever for a job nobody scheduled.
 */
export function useDailyLogQuery(projectSlug: string, logId: string | undefined) {
  return useQuery({
    queryKey: rndKeys.dailyLog(projectSlug, logId ?? "none"),
    queryFn: async () => {
      if (!logId) throw new Error("Missing log id");
      return unwrap(await getDailyLog(projectSlug, logId));
    },
    enabled: Boolean(logId),
    refetchInterval: (query) => {
      const analysisStatus = query.state.data?.analysisStatus;
      if (analysisStatus === undefined) return false;
      return IN_FLIGHT_ANALYSIS_STATUSES.includes(analysisStatus)
        ? ANALYSIS_POLL_INTERVAL_MS
        : false;
    },
  });
}

/**
 * Create, edit, delete and submit a daily log.
 *
 * **SUBMIT ANSWERS `202` AND A RECEIPT.** The streak on that receipt is real — it moves
 * inside the submit transaction — but the analysis is merely `queued`, so nothing about
 * what the log is worth exists yet. The caller polls `useDailyLogQuery` for that.
 *
 * The idempotency key is the caller's, held once per attempt: a retried submit must return
 * the FIRST receipt rather than file a second log.
 */
export function useDailyLogMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      action: "create" | "update" | "delete" | "submit";
      logId?: string;
      input?: CreateDailyLogInput;
      patch?: UpdateDailyLogInput;
      idempotencyKey?: string;
    }) => {
      if (variables.action === "create") {
        if (!variables.input) throw new Error("Missing daily log input");
        return unwrap(await createDailyLog(projectSlug, variables.input));
      }
      if (!variables.logId) throw new Error("Missing log id");
      if (variables.action === "update") {
        return unwrap(await updateDailyLog(projectSlug, variables.logId, variables.patch ?? {}));
      }
      if (variables.action === "delete") {
        return unwrap(await deleteDailyLog(projectSlug, variables.logId));
      }
      if (!variables.idempotencyKey) throw new Error("Missing idempotency key");
      return unwrap(
        await submitDailyLog(projectSlug, variables.logId, {
          idempotencyKey: variables.idempotencyKey,
        }),
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.projectDailyLogs(projectSlug) });
      if (variables.logId) {
        void queryClient.invalidateQueries({
          queryKey: rndKeys.dailyLog(projectSlug, variables.logId),
        });
      }
    },
  });
}
