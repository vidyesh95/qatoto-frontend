import Developers from "@/components/information/developers";
import type { Metadata } from "next";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Developers",
  description: "Developers page for Qatoto",
};

export default function DevelopersPage() {
  return <Developers />;
}
