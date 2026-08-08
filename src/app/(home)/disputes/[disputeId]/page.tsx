import type { Metadata } from "next";

import DisputeDetail from "@/components/home/store/dispute-detail";
import { withSentinelValues } from "@/lib/static-params";

// Permanently dynamic: session-scoped and behind an organization membership.
export const instant = false;

/** Only the sentinel — a dispute id is session-scoped and must not reach the build output. */
export function generateStaticParams() {
  return withSentinelValues([]).map((disputeId) => ({ disputeId }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Dispute",
  description: "A dispute on a Qatoto order",
};

/**
 * BLOCKED ON A BACKEND READ THAT DOES NOT EXIST.
 *
 * `commerce-trust.routes.ts` exposes `POST /commerce/orders/:orderId/disputes` for participants and then only
 * admin routes — `GET /commerce/admin/disputes` and `POST /commerce/admin/disputes/:disputeId/decisions`. A
 * buyer or provider can raise a dispute and has no route to read it back.
 *
 * The route exists rather than 404ing because a raised dispute produces this URL, and a page that explains the
 * gap is more useful than a not-found. See the component for why nothing is faked here.
 */
export default async function DisputeRoute({ params }: { params: Promise<{ disputeId: string }> }) {
  const { disputeId } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:px-6">
      <DisputeDetail disputeId={disputeId} />
    </div>
  );
}
