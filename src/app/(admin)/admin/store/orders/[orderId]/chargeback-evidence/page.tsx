import type { Metadata } from "next";
import ChargebackEvidenceExportPage from "@/components/admin/orders/chargeback-evidence-export-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// No `robots` here — the (admin) group layout sets `index: false, follow: false` for every route
// beneath it, and Next merges metadata per-field down the segment chain.
export const metadata: Metadata = {
  title: "Chargeback evidence",
  description: "Order, chat and shipment data packaged for a card issuer's chargeback response",
};

export default async function AdminChargebackEvidencePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <ChargebackEvidenceExportPage orderId={orderId} />;
}
