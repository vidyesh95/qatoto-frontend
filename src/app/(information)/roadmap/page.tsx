import Roadmap from "@/components/information/roadmap";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "Every surface of Qatoto, and how to reach it",
};

export default function RoadmapPage() {
  return <Roadmap />;
}
