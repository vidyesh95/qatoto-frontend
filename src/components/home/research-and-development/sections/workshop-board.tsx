// TRANSPORT: props-only — client island. Holds interaction state only; all data
// arrives as props from a server parent. Fetches nothing, so it needs no
// QueryProvider. If this ever calls a hook in src/hooks/rnd, relabel it client-query.
"use client";

import Image from "next/image";
import { useState } from "react";

import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import type {
  TeamMember,
  WorkshopBoardColumn,
  WorkshopTask,
  WorkshopTaskPriority,
} from "@/types/research-and-development";

const PRIORITY_DOT_CLASSES: Record<WorkshopTaskPriority, string> = {
  high: "bg-[#BA1A1A]",
  medium: "bg-[#8A6116]",
  low: "bg-[#6F7979]",
};

const PRIORITY_LABELS: Record<WorkshopTaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_ORDER: WorkshopTaskPriority[] = ["high", "medium", "low"];

type WorkshopBoardProps = {
  initialBoardColumns: WorkshopBoardColumn[];
  teamMembers: TeamMember[];
};

// Kanban board with local writes (§14.5): add a task to a column, and move one
// between columns. Movement is by explicit ← / → buttons rather than drag: a
// button is keyboard-reachable and screen-reader-announceable, and a board
// nobody can operate without a mouse is not usable. Nothing is persisted —
// task state is backend-owned later.
export default function WorkshopBoard({ initialBoardColumns, teamMembers }: WorkshopBoardProps) {
  const [boardColumns, setBoardColumns] = useState<WorkshopBoardColumn[]>(initialBoardColumns);
  const [composingColumnId, setComposingColumnId] = useState<string | null>(null);
  const [draftTaskTitle, setDraftTaskTitle] = useState("");
  const [draftAssigneeMemberId, setDraftAssigneeMemberId] = useState(teamMembers[0]?.id ?? "");
  const [draftPriority, setDraftPriority] = useState<WorkshopTaskPriority>("medium");

  const findAssignee = (assigneeMemberId: string) =>
    teamMembers.find((teamMember) => teamMember.id === assigneeMemberId);

  const handleAddTaskSubmit = (columnId: string, submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (draftTaskTitle.trim() === "") return;
    const newTask: WorkshopTask = {
      id: `local-task-${columnId}-${Date.now()}`,
      title: draftTaskTitle.trim(),
      assigneeMemberId: draftAssigneeMemberId,
      priority: draftPriority,
      labels: ["Added here"],
    };
    setBoardColumns((currentColumns) =>
      currentColumns.map((column) =>
        column.id === columnId ? { ...column, tasks: [newTask, ...column.tasks] } : column,
      ),
    );
    setDraftTaskTitle("");
    setComposingColumnId(null);
  };

  const handleMoveTask = (taskId: string, fromColumnIndex: number, directionStep: -1 | 1) => {
    const targetColumnIndex = fromColumnIndex + directionStep;
    if (targetColumnIndex < 0 || targetColumnIndex >= boardColumns.length) return;
    const movingTask = boardColumns[fromColumnIndex].tasks.find((task) => task.id === taskId);
    if (!movingTask) return;
    setBoardColumns((currentColumns) =>
      currentColumns.map((column, columnIndex) => {
        if (columnIndex === fromColumnIndex) {
          return { ...column, tasks: column.tasks.filter((task) => task.id !== taskId) };
        }
        if (columnIndex === targetColumnIndex) {
          return { ...column, tasks: [movingTask, ...column.tasks] };
        }
        return column;
      }),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-4 overflow-x-auto px-4 pb-2 lg:px-6">
        {boardColumns.map((boardColumn, columnIndex) => (
          <div key={boardColumn.id} className="w-72 shrink-0 rounded-2xl bg-muted/40 p-3">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {boardColumn.title} · {boardColumn.tasks.length}
              </p>
              <button
                type="button"
                aria-label={`Add a task to ${boardColumn.title}`}
                onClick={() =>
                  setComposingColumnId(composingColumnId === boardColumn.id ? null : boardColumn.id)
                }
                className="cursor-pointer rounded-full px-2 text-lg leading-none text-muted-foreground transition-colors hover:bg-background"
              >
                +
              </button>
            </div>

            {composingColumnId === boardColumn.id && (
              <form
                onSubmit={(submitEvent) => handleAddTaskSubmit(boardColumn.id, submitEvent)}
                className="mb-2 space-y-2 rounded-xl border border-[#CAC4D0]/60 bg-background p-3"
              >
                <label className="flex flex-col gap-1">
                  <span className={LABEL_CLASS}>Task</span>
                  <input
                    type="text"
                    value={draftTaskTitle}
                    onChange={(changeEvent) => setDraftTaskTitle(changeEvent.target.value)}
                    placeholder="What needs doing?"
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={LABEL_CLASS}>Assignee</span>
                  <select
                    value={draftAssigneeMemberId}
                    onChange={(changeEvent) => setDraftAssigneeMemberId(changeEvent.target.value)}
                    className={INPUT_CLASS}
                  >
                    {teamMembers.map((teamMember) => (
                      <option key={teamMember.id} value={teamMember.id}>
                        {teamMember.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_ORDER.map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      aria-pressed={draftPriority === priority}
                      onClick={() => setDraftPriority(priority)}
                      className={`cursor-pointer rounded-full px-2.5 py-1 text-xs transition-colors ${
                        draftPriority === priority
                          ? "bg-[#00696E] text-white"
                          : "bg-muted hover:bg-muted/70"
                      }`}
                    >
                      {PRIORITY_LABELS[priority]}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Add task
                </button>
              </form>
            )}

            <div className="space-y-2">
              {boardColumn.tasks.map((task) => {
                const assignee = findAssignee(task.assigneeMemberId);
                return (
                  <div
                    key={task.id}
                    className="space-y-2 rounded-xl border border-[#CAC4D0]/60 bg-background p-3"
                  >
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {task.labels.map((label) => (
                        <span key={label} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {label}
                        </span>
                      ))}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span
                          className={`size-2 rounded-full ${PRIORITY_DOT_CLASSES[task.priority]}`}
                        />
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      {assignee && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Image
                            src={assignee.avatarImageSrc}
                            width={20}
                            height={20}
                            alt={assignee.name}
                            className="size-5 rounded-full object-cover"
                          />
                          {assignee.name}
                        </span>
                      )}
                      {task.dueDateLabel && (
                        <span className="text-xs text-muted-foreground">
                          Due {task.dueDateLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={columnIndex === 0}
                        aria-label={`Move "${task.title}" to the previous column`}
                        onClick={() => handleMoveTask(task.id, columnIndex, -1)}
                        className="cursor-pointer rounded-full border border-[#6F7979] px-2 py-0.5 text-xs disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={columnIndex === boardColumns.length - 1}
                        aria-label={`Move "${task.title}" to the next column`}
                        onClick={() => handleMoveTask(task.id, columnIndex, 1)}
                        className="cursor-pointer rounded-full border border-[#6F7979] px-2 py-0.5 text-xs disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="px-4 text-xs text-muted-foreground lg:px-6">
        Board edits live in this session only — task state and ordering are backend-owned later.
      </p>
    </div>
  );
}
