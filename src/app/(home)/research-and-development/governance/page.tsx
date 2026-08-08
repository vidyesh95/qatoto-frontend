import type { Metadata } from "next";
import GovernancePage from "@/components/home/research-and-development/governance-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Funding & Governance · R&D",
  description:
    "Commitments, month-end statements and how a disagreement is settled across Qatoto R&D projects",
};

export default function Governance() {
  return <GovernancePage />;
}
