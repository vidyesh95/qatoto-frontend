"use client";

import Link from "next/link";
import { useAdminAuditLog } from "@/state/admin-audit-log-context";
import { useStudioVideos } from "@/state/studio-videos-context";

// Minimal staff dashboard (UI phase) — pending-count and audit-count cards
// linking to the two built surfaces. Grows into the §4.6 dashboard later.
export default function AdminDashboard() {
  const { videos } = useStudioVideos();
  const { auditLogEntries } = useAdminAuditLog();

  const pendingReviewCount = videos.filter(
    (video) => video.status.kind === "pending-review",
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Staff console — content review and audit trail. Everything else runs from Drizzle Studio for
        now.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/review"
          className="rounded-2xl border border-border p-6 transition-colors hover:bg-secondary/50"
        >
          <p className="text-sm font-medium text-muted-foreground">Content review</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{pendingReviewCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {pendingReviewCount === 1 ? "video pending review" : "videos pending review"}
          </p>
        </Link>

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
