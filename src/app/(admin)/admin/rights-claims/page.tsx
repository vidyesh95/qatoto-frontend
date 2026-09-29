// TODO: Cache Components adoption — this route opts out of `instant` because its whole body is a
// capability-gated client console, which has nothing a static shell could usefully hold.
export const instant = false;

import RightsClaimModerationPage from "@/components/admin/rights-claims/rights-claim-moderation-page";

export const metadata = {
  title: "Rights claims",
  description: "Intellectual property claims filed against published teardowns.",
};

export default function RightsClaimsRoute() {
  return <RightsClaimModerationPage />;
}
