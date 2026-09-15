"use client";

import Link from "next/link";

import { useAdminAuditLog } from "@/state/admin-audit-log-context";

// TRANSPORT: client-query — the audit trail only.
//
// ⚠️ THE CONTENT REVIEW TILE IS GONE WITH THE QUEUE IT COUNTED. It read
// `GET /videos/admin/review`, whose only producer was the anime episode pipeline; nothing
// writes `review_status: 'pending'` any more, so the tile could only ever have shown 0.
export default function AdminDashboard() {
  const { auditLogEntries } = useAdminAuditLog();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Staff console — audit trail. Everything else runs from Drizzle Studio for now.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/audit"
          className="rounded-2xl border border-border p-6 transition-colors hover:bg-secondary/50"
        >
          <p className="text-sm font-medium text-muted-foreground">Audit log</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{auditLogEntries.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {auditLogEntries.length === 1 ? "recorded action" : "recorded actions"}
          </p>
        </Link>
      </div>
    </div>
  );
}
