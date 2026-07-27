import type { Metadata } from "next";
import TeamBuildingPage from "@/components/home/research-and-development/team-building-page";

export const metadata: Metadata = {
  title: "Team Building · R&D",
  description: "Every open role across Qatoto R&D projects — trade your skills for a stake",
};

export default function TeamBuilding() {
  return <TeamBuildingPage />;
}
