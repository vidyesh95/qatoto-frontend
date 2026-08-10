import type { Metadata } from "next";

import FactoryInquiryDetailPage from "@/components/home/store/factories/factory-inquiry-detail-page";

// Permanently dynamic: readable only by the inquiry's two parties.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Manufacturing inquiry",
  description: "One manufacturing inquiry a buyer sent to your factory",
};

export default async function StudioFactoryInquiryRoute({
  params,
}: {
  params: Promise<{ inquiryId: string }>;
}) {
  const { inquiryId } = await params;
  return (
    <FactoryInquiryDetailPage
      inquiryId={inquiryId}
      side="factory"
      backHref="/studio/factory-inquiries"
    />
  );
}
