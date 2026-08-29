import type { Metadata } from "next";

import AnimeHeroSlideAdminPage from "@/components/admin/anime-hero/anime-hero-slide-admin-page";

export const instant = false;

// No `robots` here — the (admin) group layout sets `index: false, follow: false` for every
// route under it.
export const metadata: Metadata = {
  title: "Anime hero",
  description: "The rotating hero carousel at the top of the Qatoto anime page",
};

export default function AdminAnimeHeroPage() {
  return <AnimeHeroSlideAdminPage />;
}
