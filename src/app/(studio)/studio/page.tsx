import type { Metadata } from "next";
import CreateStudioPage from "@/components/studio/pages/create-studio-page";

export const metadata: Metadata = {
  title: "Creator Studio",
  description: "Upload videos, go live, and manage your Qatoto creator workspace",
};

export default function Studio() {
  return <CreateStudioPage />;
}
