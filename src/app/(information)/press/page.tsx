import Press from "@/components/information/press";
import { getPressList } from "@/lib/cms";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press | Qatoto",
  description: "Latest announcements, releases, and milestones from Qatoto.",
};

export default async function PressPage() {
  const items = await getPressList();
  const sorted = [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return <Press items={sorted} />;
}
