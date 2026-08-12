import type { Metadata } from "next";

import DisputeList from "@/components/commerce/dispute-list";

// Permanently dynamic: session-scoped and behind an organization membership. There is no Cache
// Components refactor to do here — the list never reaches a server render.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Disputes",
  description: "Disputes on your Qatoto orders",
};

/**
 * THE INDEX THAT MAKES `/disputes/[disputeId]` REACHABLE.
 *
 * Before it, a raised dispute's URL existed only in the response to the request that created it —
 * the same shape A38 spent nine routes fixing elsewhere. `GET /commerce/disputes` has been there
 * since A28.
 */
export default function DisputesRoute() {
  return <DisputeList />;
}
