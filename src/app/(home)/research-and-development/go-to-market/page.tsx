import type { Metadata } from "next";
import GoToMarketPage from "@/components/home/research-and-development/go-to-market-page";

export const metadata: Metadata = {
  title: "Go-to-Market · R&D",
  description:
    "Manufacturing and ODM partners, launch readiness, and the handoff from a verified build to a store listing",
};

export default function GoToMarket() {
  return <GoToMarketPage />;
}
