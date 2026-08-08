import type { Metadata } from "next";
import ProductsPage from "@/components/studio/pages/products-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "My Products",
  description: "My Products page for Qatoto Creator Studio",
};

export default function StudioMyProducts() {
  return <ProductsPage />;
}
