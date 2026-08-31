import type { Metadata } from "next";

import RelationVerificationPage from "@/components/admin/product-relations/relation-verification-page";

// Permanently dynamic: capability-gated, a client-query island throughout.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Related-product claims · Admin",
  description: "Seller claims about which products go together, awaiting confirmation",
};

export default function AdminProductRelationsRoute() {
  return <RelationVerificationPage />;
}
