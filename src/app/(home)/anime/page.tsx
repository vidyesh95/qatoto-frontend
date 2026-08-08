import type { Metadata } from "next";
import AnimePage from "@/components/home/anime/anime-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Anime",
  description: "Anime page for Qatoto",
};

export default function Anime() {
  return <AnimePage />;
}
