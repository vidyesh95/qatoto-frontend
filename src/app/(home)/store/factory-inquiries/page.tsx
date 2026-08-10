import type { Metadata } from "next";

import FactoryInquiryListPage from "@/components/home/store/factories/factory-inquiry-list-page";

// Permanently dynamic: the buyer's own inquiry queue is a session-scoped client-query island.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Manufacturing inquiries · Store",
  description: "Manufacturing inquiries you have opened with factories on Qatoto",
};

/**
 * THE BUYER SIDE. `/studio/factory-inquiries` is the factory's queue over the same component and
 * a different endpoint — the split `/store/rfqs` and `/studio/rfqs` already use.
 */
export default function StoreFactoryInquiriesRoute() {
  return <FactoryInquiryListPage side="buyer" detailHrefBase="/store/factory-inquiries" />;
}
