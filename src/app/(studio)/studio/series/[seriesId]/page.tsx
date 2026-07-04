import type { Metadata } from "next";
import SeriesDetailPage from "@/components/studio/series/series-detail-page";

// Prerender the seeded series ids so the dynamic route is valid under
// cacheComponents. Client-created series resolve at runtime from context.
export function generateStaticParams() {
  return [{ seriesId: "stellar-drift" }, { seriesId: "moonlit-dojo" }];
}

export const metadata: Metadata = {
  title: "Series details",
  description: "Series detail page for Qatoto Creator Studio",
};

export default async function Page({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;
  return <SeriesDetailPage seriesId={seriesId} />;
}
