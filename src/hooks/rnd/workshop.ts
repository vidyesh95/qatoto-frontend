"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/rnd/workshop.api`.
//
// EVERY MUTATION INVALIDATES THE WHOLE WORKSHOP KEY, and that is deliberate rather than
// lazy: `GET …/workshop` returns board, files, chat and read state in ONE payload, so
// there are no finer-grained caches to invalidate. Splitting the read into four to get
// four keys would trade one round trip for three.

import { useMutation, useQueryClient } from "@tanstack/react-query";

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
  updateWorkshopFile,
  updateWorkshopTask,
  type WorkshopTaskInput,
} from "@/lib/rnd/workshop.api";
import type { WorkshopFileKind } from "@/lib/rnd/workshop.schemas";

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

/** The caller's own read marker. Nobody else's moves. */
export function useMarkWorkshopChatReadMutation(projectSlug: string) {
  const invalidateWorkshop = useWorkshopInvalidation(projectSlug);
  return useMutation({
    mutationFn: async (lastReadMessageId: string) =>
      unwrap(await markWorkshopChatRead(projectSlug, { lastReadMessageId })),
    onSuccess: invalidateWorkshop,
  });
}
