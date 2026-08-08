import type { Metadata } from "next";
import BuildLogPage from "@/components/home/research-and-development/build-log-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Build & Daily Logs · R&D",
  description: "The Daily Update Protocol across every Qatoto R&D project — effort becomes proof",
};

export default function BuildLog() {
  return <BuildLogPage />;
}
