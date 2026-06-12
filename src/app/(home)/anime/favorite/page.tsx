import type { Metadata } from "next";
import FavoriteContent from "@/components/home/anime/favorite-content";

export const metadata: Metadata = {
  title: "Favorite",
  description: "Your liked and bookmarked animes on Qatoto",
};

export default function Favorite() {
  return <FavoriteContent />;
}
