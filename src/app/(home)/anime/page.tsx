import type { Metadata } from "next";
import AnimeContent from "@/components/home/anime/anime-content";

export const metadata: Metadata = {
  title: "Anime",
  description: "Anime page for Qatoto",
};

export default function Anime() {
  return <AnimeContent />;
}
