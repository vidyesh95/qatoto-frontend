import type { Metadata } from "next";

import ResearchAndDevelopmentPage from "@/components/home/research-and-development/pages/research-and-development-page";

export const metadata: Metadata = {
  title: "R&D",
  description: "Research and Development page for Qatoto",
};

export default function ResearchAndDevelopment() {
  return <ResearchAndDevelopmentPage />;
}
