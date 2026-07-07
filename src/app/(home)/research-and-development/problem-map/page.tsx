import type { Metadata } from "next";
import ProblemMapPage from "@/components/home/research-and-development/pages/problem-map-page";

export const metadata: Metadata = {
  title: "Problem Map · R&D",
  description: "Civic Pulse — reported infrastructure gaps mapped into opportunity on Qatoto",
};

export default function ProblemMap() {
  return <ProblemMapPage />;
}
