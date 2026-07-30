import type { Metadata } from "next";

import NewProgramWizardPage from "@/components/home/research-and-development/wizard/new-program-wizard-page";

export const metadata: Metadata = {
  title: "Propose a research programme · R&D",
  description: "Propose an open, long-horizon research programme on Qatoto",
};

export default function Page() {
  return <NewProgramWizardPage />;
}
