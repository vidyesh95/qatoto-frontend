import type { Metadata } from "next";

import CategoriesIndexPage from "@/components/home/store/categories-index-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Categories · Store",
  description: "Browse every product category on the Qatoto B2B store",
};

export default function StoreCategories() {
  return <CategoriesIndexPage />;
}
