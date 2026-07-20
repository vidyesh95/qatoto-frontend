import type { Metadata } from "next";
import AnimePage from "@/components/home/anime/pages/anime-page";

export const metadata: Metadata = {
  title: "Anime",
  description: "Anime page for Qatoto",
};

export default function Anime() {
  return <AnimePage />;
}
