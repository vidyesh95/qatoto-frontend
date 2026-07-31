import type { Metadata } from "next";
import CategoryReviewPage from "@/components/admin/categories/category-review-page";

export const metadata: Metadata = {
  title: "Categories",
  description: "Qatoto staff taxonomy review queue",
};

export default function AdminCategoriesPage() {
  return <CategoryReviewPage />;
}
