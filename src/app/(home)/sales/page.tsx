import type { Metadata } from "next";

import SalesPage from "@/components/commerce/sales-page";

// Permanently dynamic: session-scoped and behind a seller organization.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Sales",
  description: "Orders you have received on Qatoto",
};

/**
 * WAS AN `<h1>` STUB. Now the seller's order and dispatch queue.
 *
 * PROFIT AND LOSS ARE ABSENT AND THE PAGE SAYS SO. No route in this backend reports a seller's
 * takings; summing the orders on one page would count unpaid ones, ignore refunds and fees, and
 * cover only what loaded. That is a number a seller would act on, so it is not shown.
 */
export default function SalesRoute() {
  return <SalesPage />;
}
