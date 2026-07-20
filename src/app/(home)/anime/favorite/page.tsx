import type { Metadata } from "next";
import FavoritePage from "@/components/home/anime/pages/favorite-page";

export const metadata: Metadata = {
  title: "Favorite",
  description: "Your liked and bookmarked animes on Qatoto",
};

export default function Favorite() {
  return <FavoritePage />;
}
