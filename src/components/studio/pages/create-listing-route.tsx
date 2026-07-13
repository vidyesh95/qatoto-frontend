"use client";

import { useSearchParams } from "next/navigation";
import CreateListingPage from "@/components/studio/pages/create-listing-page";

// Reads the optional `?id=` search param to switch the wizard into edit mode.
// `useSearchParams` is a dynamic access, so the route wraps this in <Suspense>
// (required under Cache Components).
export default function CreateListingRoute() {
  const editProductId = useSearchParams().get("id") ?? undefined;
  return <CreateListingPage productId={editProductId} />;
}
