import type { Metadata } from "next";
import AdminDashboard from "@/components/admin/dashboard/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin",
  description: "Qatoto staff admin console",
};

export default function AdminIndexPage() {
  return <AdminDashboard />;
}
