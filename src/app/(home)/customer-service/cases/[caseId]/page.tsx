import type { Metadata } from "next";

import SupportCaseDetail from "@/components/home/customer-service/support-case-detail";
import { withSentinelValues } from "@/lib/static-params";

// Permanently dynamic: one person's own support case. There is no Cache Components refactor
// to do here.
export const instant = false;

/** Only the sentinel — a case id is session-scoped and must not reach the build output. */
export function generateStaticParams() {
  return withSentinelValues([]).map((caseId) => ({ caseId }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Support case",
  description: "A support case on your Qatoto account",
};

export default async function SupportCaseRoute({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:px-6">
      <SupportCaseDetail caseId={caseId} />
    </div>
  );
}
