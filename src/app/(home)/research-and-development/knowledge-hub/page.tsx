import type { Metadata } from "next";
import KnowledgeHubPage from "@/components/home/research-and-development/knowledge-hub-page";

export const metadata: Metadata = {
  title: "Knowledge Hub · R&D",
  description: "Market intelligence on where demand is highest for Qatoto R&D projects",
};

export default function KnowledgeHub() {
  return <KnowledgeHubPage />;
}
