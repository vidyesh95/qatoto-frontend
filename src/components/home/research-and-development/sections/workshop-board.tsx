import Image from "next/image";

import type {
  TeamMember,
  WorkshopBoardColumn,
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

type WorkshopBoardProps = {
  boardColumns: WorkshopBoardColumn[];
  teamMembers: TeamMember[];
};

// Kanban-style board panel: static columns of task cards with assignee avatars
// resolved from the project roster. Display-only mock — task state lives in the
// backend later, nothing here is draggable.
export default function WorkshopBoard({ boardColumns, teamMembers }: WorkshopBoardProps) {
  const findAssignee = (assigneeMemberId: string) =>
    teamMembers.find((teamMember) => teamMember.id === assigneeMemberId);

  return (
    <div className="flex gap-4 overflow-x-auto px-4 pb-2 lg:px-6">
      {boardColumns.map((boardColumn) => (
        <div key={boardColumn.id} className="w-72 shrink-0 rounded-2xl bg-muted/40 p-3">
          <p className="px-1 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {boardColumn.title} · {boardColumn.tasks.length}
          </p>
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
                      <span className="text-xs text-muted-foreground">Due {task.dueDateLabel}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
