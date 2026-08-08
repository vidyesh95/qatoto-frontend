import type { Metadata } from "next";
import CategoryReviewPage from "@/components/admin/categories/category-review-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Categories",
  description: "Qatoto staff taxonomy review queue",
};

export default function AdminCategoriesPage() {
  return <CategoryReviewPage />;
}
