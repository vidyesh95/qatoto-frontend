import type { Metadata } from "next";
import ProjectImmortalPage from "@/components/home/research-and-development/project-immortal-page";

export const metadata: Metadata = {
  title: "Project Immortal · R&D",
  description: "Qatoto's open, long-horizon research program into extending healthy human life",
};

export default function ProjectImmortal() {
  return <ProjectImmortalPage />;
}
