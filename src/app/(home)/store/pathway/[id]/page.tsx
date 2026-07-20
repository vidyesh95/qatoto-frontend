import type { Metadata } from "next";
import PathwayDetail from "@/components/home/store/pathway-detail";
import { getPathwaySlugs, prettifySlugForDisplay } from "@/lib/store";

export async function generateStaticParams() {
  const slugs = await getPathwaySlugs();
  return slugs.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `${prettifySlugForDisplay(id)} · Pathway` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PathwayDetail slug={id} />;
}
