import type { Metadata } from "next";

import MyPathwayList from "@/components/studio/pathways/my-pathway-list";

// Permanently dynamic, and this opt-out is the finished state rather than a TODO: the list is a
// client-query island behind a session — `GET /commerce/pathways/mine` is the only read that
// returns a draft — so its data never reaches the server render at all. Same shape as
// `cart/page.tsx`.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Sets",
  description: "Curated product sets you have made",
};

export default function StudioPathwaysRoute() {
  return (
    <div className="p-6">
      <MyPathwayList />
    </div>
  );
}
