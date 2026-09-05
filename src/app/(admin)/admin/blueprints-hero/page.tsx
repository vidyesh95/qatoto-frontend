import type { Metadata } from "next";

import BlueprintHeroSlideAdminPage from "@/components/admin/blueprints-hero/blueprint-hero-slide-admin-page";

export const instant = false;

// No `robots` here — the (admin) group layout sets `index: false, follow: false` for every
// route under it.
export const metadata: Metadata = {
  title: "Blueprints hero",
  description: "The rotating hero carousel at the top of the Qatoto Blueprints hub",
};

export default function AdminBlueprintsHeroPage() {
  return <BlueprintHeroSlideAdminPage />;
}
