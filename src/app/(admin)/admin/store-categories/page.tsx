import type { Metadata } from "next";
import StoreCategoryAdminPage from "@/components/admin/store-categories/store-category-admin-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Store categories",
  description: "Qatoto store browse taxonomy and seller category requests",
};

export default function AdminStoreCategoriesPage() {
  return <StoreCategoryAdminPage />;
}
