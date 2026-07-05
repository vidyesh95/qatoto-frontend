import type { Metadata } from "next";
import AuditLogPage from "@/components/admin/audit/audit-log-page";

export const metadata: Metadata = {
  title: "Audit Log",
  description: "Qatoto staff audit trail",
};

export default function AdminAuditPage() {
  return <AuditLogPage />;
}
