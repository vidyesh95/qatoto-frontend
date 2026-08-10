import type { Metadata } from "next";

import FactoryInquiryListPage from "@/components/home/store/factories/factory-inquiry-list-page";

// Permanently dynamic: the factory's received queue is a session-scoped client-query island.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Manufacturing inquiries",
  description: "Buyers who have written to your factory on Qatoto",
};

/** THE FACTORY SIDE. Reads `/received`, which never contains a draft. */
export default function StudioFactoryInquiriesRoute() {
  return <FactoryInquiryListPage side="factory" detailHrefBase="/studio/factory-inquiries" />;
}
