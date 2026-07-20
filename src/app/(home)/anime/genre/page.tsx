import type { Metadata } from "next";
import GenrePage from "@/components/home/anime/pages/genre-page";

export const metadata: Metadata = {
  title: "Genre",
  description: "Browse anime by genre on Qatoto",
};

export default function Genre() {
  return <GenrePage />;
}
