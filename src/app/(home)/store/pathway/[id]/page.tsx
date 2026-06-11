import type { Metadata } from "next";
import PathwayDetail from "@/components/home/store/pathway-detail";
import { getPathwaySlugs } from "@/lib/store";

export async function generateStaticParams() {
  const slugs = await getPathwaySlugs();
  return slugs.map((id) => ({ id }));
}

function prettify(slug: string): string {
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `${prettify(id)} · Pathway` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PathwayDetail slug={id} />;
}
