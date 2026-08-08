import Press from "@/components/information/press";
import { getPressList } from "@/lib/cms";
import type { Metadata } from "next";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Press",
  description: "Latest announcements, releases, and milestones from Qatoto.",
};

export default async function PressPage() {
  const items = await getPressList();
  const sorted = items
    .map((item) => ({ item, t: new Date(item.publishedAt).getTime() }))
    .toSorted((a, b) => b.t - a.t)
    .map(({ item }) => item);
  return <Press items={sorted} />;
}
