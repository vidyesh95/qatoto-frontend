import type { Metadata } from "next";

import FactoryInquiryDetailPage from "@/components/home/store/factories/factory-inquiry-detail-page";

// Permanently dynamic: one inquiry is session-scoped and readable only by its two parties, so
// there is nothing here to prerender and no static params to generate.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Manufacturing inquiry · Store",
  description: "One manufacturing inquiry you opened with a factory on Qatoto",
};

export default async function StoreFactoryInquiryRoute({
  params,
}: {
  params: Promise<{ inquiryId: string }>;
}) {
  const { inquiryId } = await params;
  return (
    <FactoryInquiryDetailPage
      inquiryId={inquiryId}
      side="buyer"
      backHref="/store/factory-inquiries"
    />
  );
}
