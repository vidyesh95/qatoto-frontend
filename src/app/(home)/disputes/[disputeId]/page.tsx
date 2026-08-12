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
 * ONE DISPUTE, FOR ITS PARTICIPANTS.
 *
 * THIS COMMENT USED TO SAY THE READ DID NOT EXIST. `GET /commerce/disputes/:disputeId` shipped with
 * A28 in Phase 15 and gained `POST …/notes` with A40 in Phase 23; the claim was simply never
 * revisited, and the page rendered an apology to a user looking for a dispute they had raised.
 *
 * Reachable from `/disputes`, which lists what the caller's organization is a party to.
 */
export default async function DisputeRoute({ params }: { params: Promise<{ disputeId: string }> }) {
  const { disputeId } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:px-6">
      <DisputeDetail disputeId={disputeId} />
    </div>
  );
}
