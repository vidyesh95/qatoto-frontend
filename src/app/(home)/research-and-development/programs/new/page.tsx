import type { Metadata } from "next";

import NewProgramWizardPage from "@/components/home/research-and-development/wizard/new-program-wizard-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Propose a research programme · R&D",
  description: "Propose an open, long-horizon research programme on Qatoto",
};

export default function Page() {
  return <NewProgramWizardPage />;
}
