import type { Metadata } from "next";
import PlaylistsPage from "@/components/studio/playlists/playlists-page";

export const metadata: Metadata = {
  title: "Playlists",
  description: "Playlists page for Qatoto Creator Studio",
};

export default function StudioPlaylists() {
  return <PlaylistsPage />;
}
