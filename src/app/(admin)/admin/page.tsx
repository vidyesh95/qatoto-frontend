import type { Metadata } from "next";
import AdminDashboard from "@/components/admin/dashboard/admin-dashboard";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Admin",
  description: "Qatoto staff admin console",
};

export default function AdminIndexPage() {
  return <AdminDashboard />;
}
