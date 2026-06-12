import type { Metadata } from "next";
import Home from "@/components/home/feed/home";

export const metadata: Metadata = {
  title: { absolute: "Qatoto" },
  description: "Welcome to Qatoto",
};

export default function HomePage() {
  return <Home />;
}
