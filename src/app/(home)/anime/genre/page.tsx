import type { Metadata } from "next";
import GenreContent from "@/components/home/anime/genre-content";

export const metadata: Metadata = {
  title: "Genre",
  description: "Browse anime by genre on Qatoto",
};

export default function Genre() {
  return <GenreContent />;
}
