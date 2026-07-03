import type { Metadata } from "next";
import ProductsPage from "@/components/studio/pages/products-page";

export const metadata: Metadata = {
  title: "My Products",
  description: "My Products page for Qatoto Creator Studio",
};

export default function StudioMyProducts() {
  return <ProductsPage />;
}
