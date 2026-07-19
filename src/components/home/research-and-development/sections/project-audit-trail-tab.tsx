import type { ProjectAuditEntry, ProjectAuditEventKind } from "@/types/research-and-development";

const AUDIT_EVENT_BADGES: Record<ProjectAuditEventKind, { label: string; className: string }> = {
  decision: { label: "Decision", className: "bg-violet-100 text-violet-800" },
  payment: { label: "Payment", className: "bg-[#00696E]/10 text-[#00696E]" },
  hire: { label: "Hire", className: "bg-blue-100 text-blue-800" },
  "task-assignment": { label: "Task", className: "bg-amber-100 text-amber-800" },
};

// Audit-trail tab (idea 3): a project-scoped, stakeholder-visible log of every
// governance event — decisions, payments, hires, task assignments. Reuses the
// admin audit-log row layout but widens scope and audience. The hash-chain
// chip (this entry's hash folds in the previous entry's) renders the mock as
// tamper-evident; the real immutable chain is written server-side later.
export default function ProjectAuditTrailTab({ entries }: { entries: ProjectAuditEntry[] }) {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Audit trail</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No governance events logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => {
              const eventBadge = AUDIT_EVENT_BADGES[entry.eventKind];

              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-[#CAC4D0]/60 px-4 py-3"
                >
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${eventBadge.className}`}
                  >
                    {eventBadge.label}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{entry.actorName}</span>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground capitalize">
                      {entry.actorRole}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {entry.actionLabel} —{" "}
                      <span className="text-muted-foreground">{entry.targetLabel}</span>
                    </p>
                    {entry.detailNote !== "" && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {entry.detailNote}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {entry.previousEntryHashLabel} → {entry.entryHashLabel}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.occurredAtLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Immutable, tamper-evident log — written server-side later.
        </p>
      </section>
    </div>
  );
}
