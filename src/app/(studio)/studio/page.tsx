import type { Metadata } from "next";
import CreateStudioPage from "@/components/studio/pages/create-studio-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Creator Studio",
  description: "Upload videos, go live, and manage your Qatoto creator workspace",
};

export default function Studio() {
  return <CreateStudioPage />;
}
