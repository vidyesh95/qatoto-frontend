import type { Metadata } from "next";
import TalentPage from "@/components/home/research-and-development/talent-page";

export const metadata: Metadata = {
  title: "Talent · R&D",
  description: "Browse people trading skills for equity on Qatoto R&D projects",
};

export default function Talent() {
  return <TalentPage />;
}
