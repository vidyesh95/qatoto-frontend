import type { Metadata } from "next";
import { Suspense } from "react";
import CreateListingRoute from "@/components/studio/pages/create-listing-route";

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
