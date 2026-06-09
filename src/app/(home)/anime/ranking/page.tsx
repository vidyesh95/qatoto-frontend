import type { Metadata } from "next";
import RankingContent from "@/components/home/ranking-content";

export const metadata: Metadata = {
  title: "Ranking",
  description: "Top-ranked anime on Qatoto by week, month, and year",
};

export default function Ranking() {
  return <RankingContent />;
}
