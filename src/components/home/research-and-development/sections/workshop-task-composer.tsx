// TRANSPORT: client-query — "use client" island calling useWorkshopTaskMutation. One
// write: POST …/workshop/tasks.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { useWorkshopTaskMutation } from "@/hooks/rnd/workshop";
import { ApiRequestError } from "@/lib/http";
import {
  WORKSHOP_TASK_PRIORITIES,
  WorkshopTaskPrioritySchema,
  type WorkshopBoardColumn,
  type WorkshopTaskPriority,
} from "@/lib/rnd/workshop.schemas";

const PRIORITY_LABELS: Record<WorkshopTaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * Add a card to the board.
 *
 * THE COLUMN IS CHOSEN FROM WHAT THE BOARD ACTUALLY HAS. There is no default column and
 * no "backlog" invented client-side: a project's columns are its own, and a task created
 * against a column id the board does not carry is a 422.
 *
 * MOVING A CARD IS A SEPARATE ENDPOINT and not a field here, because a move carries a
 * POSITION as well as a column and the server renumbers the neighbours in one
 * transaction.
 */
export default function WorkshopTaskComposer({
  projectSlug,
  columns,
}: {
  projectSlug: string;
  columns: WorkshopBoardColumn[];
}) {
  const taskMutation = useWorkshopTaskMutation(projectSlug);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [columnId, setColumnId] = useState(columns[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<WorkshopTaskPriority>("medium");

  const taskError =
    taskMutation.error instanceof ApiRequestError ? taskMutation.error.apiError : null;

  if (columns.length === 0) return null;

  if (!isFormOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsFormOpen(true)}
        className="cursor-pointer rounded-full border border-[#6F7979] px-3 py-1.5 text-xs font-medium text-[#00696E]"
      >
        Add a task
      </button>
    );
  }

  return (
    <form
      className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-3"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        taskMutation.mutate(
          { action: "create", input: { columnId, title, priority } },
          { onSuccess: () => setTitle("") },
        );
      }}
    >
      <input
        required
        value={title}
        onChange={(changeEvent) => setTitle(changeEvent.target.value)}
        placeholder="What needs doing?"
        className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <select
          value={columnId}
          onChange={(changeEvent) => setColumnId(changeEvent.target.value)}
          className="rounded-xl border border-[#CAC4D0] p-2 text-sm"
        >
          {columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(changeEvent) => {
            const parsed = WorkshopTaskPrioritySchema.safeParse(changeEvent.target.value);
            if (parsed.success) setPriority(parsed.data);
          }}
          className="rounded-xl border border-[#CAC4D0] p-2 text-sm"
        >
          {WORKSHOP_TASK_PRIORITIES.map((priorityOption) => (
            <option key={priorityOption} value={priorityOption}>
              {PRIORITY_LABELS[priorityOption]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={taskMutation.isPending}
          className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {taskMutation.isPending ? "Adding…" : "Add it"}
        </button>
        <button
          type="button"
          onClick={() => setIsFormOpen(false)}
          className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium"
        >
          Cancel
        </button>
      </div>
      {taskError !== null && <MutationErrorNotice error={taskError} />}
    </form>
  );
}
