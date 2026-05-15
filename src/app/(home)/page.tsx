import type { Metadata } from "next";
import Home from "@/components/home/home";

export const metadata: Metadata = {
  title: "Qatoto",
  description: "Welcome to Qatoto",
};

export default function HomePage() {
  return <Home />;
}
