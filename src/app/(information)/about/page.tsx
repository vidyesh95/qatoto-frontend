import About from "@/components/information/about";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "About page for Qatoto",
};

export default function AboutPage() {
  return <About />;
}
