import type { Metadata } from "next";
import AuditLogPage from "@/components/admin/audit/audit-log-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Audit Log",
  description: "Qatoto staff audit trail",
};

export default function AdminAuditPage() {
  return <AuditLogPage />;
}
