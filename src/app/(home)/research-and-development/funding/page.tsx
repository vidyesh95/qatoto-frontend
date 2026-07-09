import type { Metadata } from "next";
import FundingPage from "@/components/home/research-and-development/pages/funding-page";

export const metadata: Metadata = {
  title: "Funding · R&D",
  description: "Investor deal flow — Qatoto R&D projects raising right now",
};

export default function Funding() {
  return <FundingPage />;
}
