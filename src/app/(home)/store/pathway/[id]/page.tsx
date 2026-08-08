import type { Metadata } from "next";
import PathwayDetail from "@/components/home/store/pathway-detail";
import { withSentinelValues } from "@/lib/static-params";
import { prettifySlugForDisplay } from "@/lib/store/shared.schemas";

export function generateStaticParams() {
  return withSentinelValues([]).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `${prettifySlugForDisplay(id)} · Store` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PathwayDetail slug={id} />;
}
