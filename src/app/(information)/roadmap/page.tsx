import Roadmap from "@/components/information/roadmap";
import type { Metadata } from "next";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Roadmap",
  description: "Every surface of Qatoto, and how to reach it",
};

export default function RoadmapPage() {
  return <Roadmap />;
}
