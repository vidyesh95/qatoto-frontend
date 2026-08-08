import type { Metadata } from "next";

import ResearchAndDevelopmentPage from "@/components/home/research-and-development/research-and-development-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "R&D",
  description: "Research and Development page for Qatoto",
};

export default function ResearchAndDevelopment() {
  return <ResearchAndDevelopmentPage />;
}
