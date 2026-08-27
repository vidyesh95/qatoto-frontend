import type { Metadata } from "next";

import StudioFundingPage from "@/components/studio/funding/funding-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Funding",
  description: "Every funding round across the ventures you founded",
};

// GRADUATED FROM `StudioPlannedPage`. That placeholder promised "pledges and backers across all of
// your projects at once" and linked to R&D as the surface that did the job today — which was only
// half true: R&D does the job PER PROJECT, and the cross-project view it described existed nowhere.
// `GET /funding-rounds/mine` is that read, and this page is its only caller.
//
// The WRITES deliberately stayed in R&D. See the component header for why duplicating them here
// would be worse than linking through.
export default function StudioFunding() {
  return <StudioFundingPage />;
}
