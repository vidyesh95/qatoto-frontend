import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PressDetail from "@/components/information/press-detail";
import { getPressItem, getPressList } from "@/lib/cms";
import { SITE_URL } from "@/lib/site";
import { StructuredData, buildArticleStructuredData } from "@/lib/structured-data";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const items = await getPressList();
  return items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPressItem(slug);
  if (!item) return { title: "Update not found" };
  return {
    title: item.title,
    description: item.summary,
    alternates: { canonical: `/press/${item.slug}` },
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

  return (
    <>
      <StructuredData
        data={buildArticleStructuredData({
          headline: item.title,
          description: item.summary,
          canonicalUrl: `${SITE_URL}/press/${item.slug}`,
          publishedAt: item.publishedAt,
          imageUrl: item.coverImage,
          // No author on a press item — `buildArticleStructuredData` falls back to Qatoto itself,
          // which is who published it.
        })}
      />
      <PressDetail item={item} related={related} />
    </>
  );
}
