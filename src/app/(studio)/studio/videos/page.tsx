import type { Metadata } from "next";
import VideosList from "@/components/studio/videos/videos-list";

export const metadata: Metadata = {
  title: "My Videos",
  description: "My Videos page for Qatoto Creator Studio",
};

export default function StudioMyVideos() {
  return <VideosList />;
}
