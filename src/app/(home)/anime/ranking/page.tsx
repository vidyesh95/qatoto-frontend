import type { Metadata } from "next";
import RankingPage from "@/components/home/anime/ranking-page";

export const metadata: Metadata = {
  title: "Ranking",
  description: "Top-ranked anime on Qatoto by week, month, and year",
};

export default function Ranking() {
  return <RankingPage />;
}
