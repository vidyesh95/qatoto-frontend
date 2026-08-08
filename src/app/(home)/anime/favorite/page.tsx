import type { Metadata } from "next";
import FavoritePage from "@/components/home/anime/favorite-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Favorite",
  description: "Your liked and bookmarked animes on Qatoto",
};

export default function Favorite() {
  return <FavoritePage />;
}
