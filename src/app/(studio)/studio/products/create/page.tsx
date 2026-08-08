import type { Metadata } from "next";
import { Suspense } from "react";
import CreateListingRoute from "@/components/studio/pages/create-listing-route";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Create Store Listing",
  description: "Create a new store listing for the Qatoto Store",
};

export default function StudioCreateListing() {
  return (
    <Suspense fallback={null}>
      <CreateListingRoute />
    </Suspense>
  );
}
