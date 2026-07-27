import type { Metadata } from "next";
import BuildLogPage from "@/components/home/research-and-development/build-log-page";

export const metadata: Metadata = {
  title: "Build & Daily Logs · R&D",
  description: "The Daily Update Protocol across every Qatoto R&D project — effort becomes proof",
};

export default function BuildLog() {
  return <BuildLogPage />;
}
