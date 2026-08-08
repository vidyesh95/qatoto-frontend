import type { Metadata } from "next";
import KnowledgeHubPage from "@/components/home/research-and-development/knowledge-hub-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Knowledge Hub · R&D",
  description: "Market intelligence on where demand is highest for Qatoto R&D projects",
};

export default function KnowledgeHub() {
  return <KnowledgeHubPage />;
}
