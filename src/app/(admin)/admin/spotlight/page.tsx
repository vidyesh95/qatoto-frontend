import type { Metadata } from "next";
import SpotlightAdminPage from "@/components/admin/spotlight/spotlight-admin-page";

export const metadata: Metadata = {
  title: "Spotlight",
  description: "Qatoto home-page Spotlight rail",
};

export default function AdminSpotlightPage() {
  return <SpotlightAdminPage />;
}
