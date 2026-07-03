import type { Metadata } from "next";
import CreateListingPage from "@/components/studio/pages/create-listing-page";

export const metadata: Metadata = {
  title: "Create Store Listing",
  description: "Create a new store listing for the Qatoto Store",
};

export default function StudioCreateListing() {
  return <CreateListingPage />;
}
