import type { Metadata } from "next";
import FreightRateAdminPage from "@/components/admin/freight/freight-rate-admin-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// No `robots` here — the (admin) group layout sets `index: false, follow: false` for every route
// beneath it, and Next merges metadata per-field down the segment chain.
export const metadata: Metadata = {
  title: "Freight lanes",
  description: "Qatoto freight rate cards and customs dwell estimates",
};

export default function AdminFreightPage() {
  return <FreightRateAdminPage />;
}
