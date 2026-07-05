"use client";

import { useAdminAuditLog } from "@/state/admin-audit-log-context";

// Read-only audit trail (UI phase). Seeded mock rows plus any approve/reject
// decisions made on /admin/review this session. The real audit trail is
// written server-side alongside every authorized admin action.
export default function AuditLogPage() {
  const { auditLogEntries } = useAdminAuditLog();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Audit log</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Who did what, when. Read-only mock — the real trail is recorded server-side with every admin
        action.
      </p>

      <ul className="mt-6 flex flex-col gap-2">
        {auditLogEntries.map((auditLogEntry) => (
          <li
            key={auditLogEntry.id}
            className="flex items-center gap-4 rounded-xl border border-border px-4 py-3"
          >
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-medium text-foreground">{auditLogEntry.actorName}</span>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground capitalize">
                {auditLogEntry.actorRole}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">
                {auditLogEntry.actionLabel} —{" "}
                <span className="text-muted-foreground">{auditLogEntry.targetLabel}</span>
              </p>
              {auditLogEntry.detailNote !== "" && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {auditLogEntry.detailNote}
                </p>
              )}
            </div>

            <span className="shrink-0 text-xs text-muted-foreground">
              {auditLogEntry.occurredAtLabel}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
