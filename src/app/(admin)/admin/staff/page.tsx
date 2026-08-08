import type { Metadata } from "next";
import StaffRolePage from "@/components/admin/staff/staff-role-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Staff",
  description: "Qatoto platform role administration",
};

export default function AdminStaffPage() {
  return <StaffRolePage />;
}
