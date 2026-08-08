import type { Metadata } from "next";
import CategoriesIndexPage from "@/components/home/store/categories-index-page";

export const metadata: Metadata = {
  title: "Categories · Store",
};

export default function Page() {
  return <CategoriesIndexPage />;
}
