import type { Metadata } from "next";
import NewIdeaWizardPage from "@/components/home/research-and-development/wizard/new-idea-wizard-page";

export const metadata: Metadata = {
  title: "Post an Idea · R&D",
  description: "Multi-step wizard to post an idea into the Qatoto R&D pipeline",
};

export default function NewIdea() {
  return <NewIdeaWizardPage />;
}
