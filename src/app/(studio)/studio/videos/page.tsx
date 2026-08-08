import type { Metadata } from "next";
import VideosList from "@/components/studio/videos/videos-list";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "My Videos",
  description: "My Videos page for Qatoto Creator Studio",
};

export default function StudioMyVideos() {
  return <VideosList />;
}
