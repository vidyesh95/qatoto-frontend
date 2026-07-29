// TRANSPORT: client-query — "use client" island. Writes the column lifecycle
// (create/rename/delete/reorder), the task move and the task delete.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import { useWorkshopColumnMutation, useWorkshopTaskMutation } from "@/hooks/rnd/workshop";
import { ApiRequestError } from "@/lib/http";
import type { WorkshopBoardColumn } from "@/lib/rnd/workshop.schemas";

/**
 * The board's edit controls, below the board itself.
 *
 * SEPARATE FROM THE BOARD RENDER on purpose. The board is a server component that draws
 * what the workshop read returned; this is the island that changes it. Merging them would
 * pull the whole board — every card, every assignee — into the client bundle to add four
 * buttons.
 *
 * **REORDERING SENDS THE WHOLE ORDER, NEVER A DELTA.** Two members dragging at once cannot
 * both be right about one column's index, but they can both send a complete list, and the
 * server takes the last one whole. A per-column index patch leaves the board with two
 * columns claiming position 2.
 *
 * **A MOVE CARRIES A POSITION AS WELL AS A COLUMN**, which is why it is its own endpoint
 * rather than a `columnId` on the task edit: the server renumbers the neighbours in the
 * same transaction. Setting the column alone would leave the card at whatever index it
 * held in the old one.
 */
export default function WorkshopBoardControls({
  projectSlug,
  boardColumns,
}: {
  projectSlug: string;
  boardColumns: WorkshopBoardColumn[];
}) {
  const columnMutation = useWorkshopColumnMutation(projectSlug);
  const taskMutation = useWorkshopTaskMutation(projectSlug);

  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [renamingColumnId, setRenamingColumnId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const firstError = [columnMutation.error, taskMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  function moveColumn(columnId: string, offset: number) {
    const currentIndex = boardColumns.findIndex((column) => column.id === columnId);
    const nextIndex = currentIndex + offset;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= boardColumns.length) return;

    const reordered = boardColumns.map((column) => column.id);
    const [movedColumnId] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, movedColumnId);
    columnMutation.mutate({ action: "reorder", columnIds: reordered });
  }

  return (
    <section className="space-y-3 px-4 lg:px-6">
      <h3 className="text-sm font-medium tracking-wide xl:text-lg">Edit the board</h3>

      <ul className="space-y-2">
        {boardColumns.map((column, columnIndex) => (
          <li
            key={column.id}
            className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{column.title}</span>
              <span className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={columnIndex === 0 || columnMutation.isPending}
                  onClick={() => moveColumn(column.id, -1)}
                  className="cursor-pointer rounded-full border border-[#CAC4D0] px-2 py-1 text-xs disabled:opacity-40"
                >
                  ← Move left
                </button>
                <button
                  type="button"
                  disabled={columnIndex === boardColumns.length - 1 || columnMutation.isPending}
                  onClick={() => moveColumn(column.id, 1)}
                  className="cursor-pointer rounded-full border border-[#CAC4D0] px-2 py-1 text-xs disabled:opacity-40"
                >
                  Move right →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenamingColumnId(renamingColumnId === column.id ? null : column.id);
                    setRenameTitle(column.title);
                  }}
                  className="cursor-pointer rounded-full border border-[#CAC4D0] px-2 py-1 text-xs"
                >
                  Rename
                </button>
                <button
                  type="button"
                  disabled={columnMutation.isPending}
                  onClick={() => columnMutation.mutate({ action: "delete", columnId: column.id })}
                  className="cursor-pointer rounded-full border border-[#CAC4D0] px-2 py-1 text-xs disabled:opacity-50"
                >
                  Delete
                </button>
              </span>
            </div>

            {renamingColumnId === column.id && (
              <form
                className="flex gap-2"
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault();
                  columnMutation.mutate(
                    { action: "rename", columnId: column.id, title: renameTitle.trim() },
                    { onSuccess: () => setRenamingColumnId(null) },
                  );
                }}
              >
                <input
                  required
                  value={renameTitle}
                  onChange={(changeEvent) => setRenameTitle(changeEvent.target.value)}
                  className={INPUT_CLASS}
                />
                <button
                  type="submit"
                  disabled={columnMutation.isPending}
                  className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Save
                </button>
              </form>
            )}

            {column.tasks.length > 0 && (
              <ul className="space-y-1">
                {column.tasks.map((task) => (
                  <li key={task.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate">{task.title}</span>
                    <select
                      value={column.id}
                      onChange={(changeEvent) =>
                        taskMutation.mutate({
                          action: "move",
                          taskId: task.id,
                          // Appended to the end of the target column: a control that let
                          // someone pick an index would be picking one out of a list the
                          // server may already have renumbered.
                          move: {
                            columnId: changeEvent.target.value,
                            position:
                              boardColumns.find(
                                (candidate) => candidate.id === changeEvent.target.value,
                              )?.tasks.length ?? 0,
                          },
                        })
                      }
                      className="rounded-lg border border-[#CAC4D0] p-1 text-xs"
                    >
                      {boardColumns.map((targetColumn) => (
                        <option key={targetColumn.id} value={targetColumn.id}>
                          {targetColumn.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={taskMutation.isPending}
                      onClick={() => taskMutation.mutate({ action: "delete", taskId: task.id })}
                      className="cursor-pointer font-medium text-[#00696E] disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <form
        className="flex flex-col gap-2 rounded-2xl border border-[#CAC4D0]/60 p-3"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          columnMutation.mutate(
            { action: "create", title: newColumnTitle.trim() },
            { onSuccess: () => setNewColumnTitle("") },
          );
        }}
      >
        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>Add a column</span>
          <input
            required
            value={newColumnTitle}
            onChange={(changeEvent) => setNewColumnTitle(changeEvent.target.value)}
            placeholder="e.g. In review"
            className={INPUT_CLASS}
          />
        </label>
        <button
          type="submit"
          disabled={columnMutation.isPending}
          className="cursor-pointer self-start rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Add it
        </button>
      </form>

      {firstError !== undefined && <MutationErrorNotice error={firstError.apiError} />}
    </section>
  );
}
