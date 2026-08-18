import type { Metadata } from "next";
import KnowledgeHubPage from "@/components/home/research-and-development/knowledge-hub-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Knowledge Hub · R&D",
  description: "Market intelligence on where demand is highest for Qatoto R&D projects",
  // NOINDEX: signed-in only. A crawler gets the sign-in wall, which indexes as a soft 404.
  robots: { index: false, follow: false },
};

export default function KnowledgeHub() {
  return <KnowledgeHubPage />;
}
