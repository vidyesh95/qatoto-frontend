import About from "@/components/information/about";
import type { Metadata } from "next";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "About",
  description: "About page for Qatoto",
};

export default function AboutPage() {
  return <About />;
}
