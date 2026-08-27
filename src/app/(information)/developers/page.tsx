import Developers from "@/components/information/developers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developers",
  description: "Developers page for Qatoto",
};

export default function DevelopersPage() {
  return <Developers />;
}
