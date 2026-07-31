import type { Metadata } from "next";
import StaffRolePage from "@/components/admin/staff/staff-role-page";

export const metadata: Metadata = {
  title: "Staff",
  description: "Qatoto platform role administration",
};

export default function AdminStaffPage() {
  return <StaffRolePage />;
}
