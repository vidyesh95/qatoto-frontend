import type { Metadata } from "next";
import NewIdeaWizardPage from "@/components/home/research-and-development/wizard/new-idea-wizard-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Post an Idea · R&D",
  description: "Multi-step wizard to post an idea into the Qatoto R&D pipeline",
};

export default function NewIdea() {
  return <NewIdeaWizardPage />;
}
