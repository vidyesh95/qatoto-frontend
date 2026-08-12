import type { Metadata } from "next";

import LibraryPage from "@/components/home/library-page";

// Permanently dynamic: session-scoped.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Library",
  description: "Your playlists on Qatoto",
};

/**
 * WAS AN `<h1>` STUB. Now the viewer's playlists, from `GET /playlists/mine`.
 *
 * A VIDEO SURFACE, NOT A STORE ONE — the account menu links it beside History with a video-library
 * icon. Purchases live under `/orders-and-returns`.
 *
 * Liked videos, watch later and subscriptions have no routes mounted anywhere, so the page names
 * that rather than shipping tabs that render an empty state indistinguishable from having none.
 */
export default function LibraryRoute() {
  return <LibraryPage />;
}
