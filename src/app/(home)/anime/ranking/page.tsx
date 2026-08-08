import type { Metadata } from "next";
import RankingPage from "@/components/home/anime/ranking-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Ranking",
  description: "Top-ranked anime on Qatoto by week, month, and year",
};

export default function Ranking() {
  return <RankingPage />;
}
