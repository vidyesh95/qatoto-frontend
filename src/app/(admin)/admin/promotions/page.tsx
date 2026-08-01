import type { Metadata } from "next";
import PromotionalSlideAdminPage from "@/components/admin/promotions/promotional-slide-admin-page";

export const metadata: Metadata = {
  title: "Promotions",
  description: "Qatoto home-page promotional carousel",
};

export default function AdminPromotionsPage() {
  return <PromotionalSlideAdminPage />;
}
