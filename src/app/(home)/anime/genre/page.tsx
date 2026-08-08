import type { Metadata } from "next";
import GenrePage from "@/components/home/anime/genre-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Genre",
  description: "Browse anime by genre on Qatoto",
};

export default function Genre() {
  return <GenrePage />;
}
