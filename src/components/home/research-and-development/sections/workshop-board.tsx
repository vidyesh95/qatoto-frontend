// TRANSPORT: props-only — presentational server component. Fetches nothing; columns
// and the roster arrive as props from a parent that read GET …/workshop.
import Image from "next/image";

import { formatIsoDate } from "@/lib/rnd/format";
import type { ProjectTeamMember } from "@/lib/rnd/projects.schemas";
import type { WorkshopBoardColumn, WorkshopTaskPriority } from "@/lib/rnd/workshop.schemas";

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

type WorkshopBoardProps = {
  boardColumns: WorkshopBoardColumn[];
  teamMembers: ProjectTeamMember[];
};

/**
 * The kanban board, read-only.
 *
 * THE ADD-TASK FORM AND THE MOVE BUTTONS ARE GONE, and the component stopped being a
 * client island with them. They wrote to `useState` and posted nowhere: a control that
 * looks like it moved a task and did not is worse than no control, because the next
 * reader believes the board. `POST …/workshop/tasks` and `…/tasks/:id/move` are both
 * shipped and this pass is reads-only, so the affordances come back when the writes do.
 *
 * `assigneeMemberId` is nullable and resolves against the project's roster by
 * `memberId` — the backend sends the id and the client looks up the name, so a renamed
 * member is never stale on a card. An unresolvable id renders as no assignee, never as
 * a placeholder person.
 */
export default function WorkshopBoard({ boardColumns, teamMembers }: WorkshopBoardProps) {
  function findAssignee(assigneeMemberId: string | null): ProjectTeamMember | undefined {
    if (assigneeMemberId === null) return undefined;
    return teamMembers.find((teamMember) => teamMember.memberId === assigneeMemberId);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4 overflow-x-auto px-4 pb-2 lg:px-6">
        {boardColumns.map((boardColumn) => (
          <div key={boardColumn.id} className="w-72 shrink-0 rounded-2xl bg-muted/40 p-3">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {boardColumn.title} · {boardColumn.tasks.length}
              </p>
            </div>
            <div className="space-y-2">
              {boardColumn.tasks.map((task) => {
                const assignee = findAssignee(task.assigneeMemberId);
                return (
                  <div
                    key={task.id}
                    className="space-y-2 rounded-xl border border-[#CAC4D0]/60 bg-background p-3"
                  >
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    )}
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
                          {assignee.avatarImageUrl && (
                            <Image
                              src={assignee.avatarImageUrl}
                              width={20}
                              height={20}
                              alt={assignee.name}
                              className="size-5 rounded-full object-cover"
                            />
                          )}
                          {assignee.name}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Due {formatIsoDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {boardColumn.tasks.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">Nothing here.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
