import type { Metadata } from "next";
import ChargebackEvidenceLookupPage from "@/components/admin/orders/chargeback-evidence-lookup-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// No `robots` here — the (admin) group layout sets `index: false, follow: false` for every route
// beneath it, and Next merges metadata per-field down the segment chain.
export const metadata: Metadata = {
  title: "Chargeback evidence",
  description: "Look up an order by id to export its chargeback evidence bundle",
};

export default function AdminChargebackEvidenceLookupPage() {
  return <ChargebackEvidenceLookupPage />;
}
