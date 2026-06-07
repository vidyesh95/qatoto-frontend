import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PressDetail from "@/components/information/press-detail";
import { getPressItem, getPressList } from "@/lib/cms";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPressItem(slug);
  if (!item) return { title: "Update not found" };
  return {
    title: item.title,
    description: item.summary,
    openGraph: {
      title: item.title,
      description: item.summary,
      type: "article",
      publishedTime: item.publishedAt,
      images: item.coverImage ? [item.coverImage] : undefined,
    },
  };
}

export default async function PressDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [item, all] = await Promise.all([getPressItem(slug), getPressList()]);
  if (!item) notFound();

  const related = all.filter((p) => p.slug !== item.slug).slice(0, 4);

  return <PressDetail item={item} related={related} />;
}
