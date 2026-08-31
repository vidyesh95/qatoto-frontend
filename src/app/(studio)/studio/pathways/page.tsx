import type { Metadata } from "next";

import MyPathwayList from "@/components/studio/pathways/my-pathway-list";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
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
