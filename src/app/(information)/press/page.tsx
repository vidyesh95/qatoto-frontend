import Press from "@/components/information/press";
import { getPressList } from "@/lib/cms";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press | Qatoto",
  description: "Latest announcements, releases, and milestones from Qatoto.",
};

export default async function PressPage() {
  const items = await getPressList();
  const sorted = [...items]
    .map((item) => ({ item, t: new Date(item.publishedAt).getTime() }))
    .sort((a, b) => b.t - a.t)
    .map(({ item }) => item);
  return <Press items={sorted} />;
}
